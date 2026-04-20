console.log("🚀 Iniciando ChatMOVE Disparador...");

const fs = require("fs");
const path = require("path");

// ── ENV VARS (mesma interface do versão anterior) ────────────────────────────
function resolverCaminho(envValue, padrao) {
  if (envValue) return path.isAbsolute(envValue) ? envValue : path.join(__dirname, envValue);
  return path.join(__dirname, padrao);
}
const RUN_LOG_FILE = path.join(__dirname, "disparador2.run.log");
const BOOT_LOG_FILE = path.join(__dirname, "disparador2.boot.log");
const PROGRESS_FILE = resolverCaminho(process.env.PROGRESS_FILE_OVERRIDE, "progress.json");
const AUTH_DIR = process.env.AUTH_DIR_OVERRIDE || path.join(__dirname, ".wwebjs_auth");
const ARQUIVO_LISTA = process.env.ARQUIVO_LISTA_OVERRIDE || "clientes.csv";
const CONFIG_FILE = resolverCaminho(process.env.CONFIG_OVERRIDE, "chatmove.config.json");
const BLACKLIST_FILE = resolverCaminho(process.env.BLACKLIST_FILE, "blacklist.json");

const CAMPANHA_ID = `${path.parse(ARQUIVO_LISTA).name}-${new Date().toISOString().slice(0, 10)}`;
const FORCE_START_INDEX = Number.parseInt(process.env.FORCE_START_INDEX || "", 10);
const CONNECT_ONLY = process.env.CONNECT_ONLY === "true";
const LIMITE_DIA = Number.parseInt(process.env.LIMITE_ENVIOS_DIA || "", 10) || 0;
const PAIR_WITH_NUMBER = process.env.PAIR_WITH_NUMBER || null;

// ── Config do chatmove.config.json ───────────────────────────────────────────
let cfg = {};
try {
  if (fs.existsSync(CONFIG_FILE)) cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
} catch (_) {}

const MENSAGEM_TEMPLATE = cfg.mensagem || "Olá {nome}! Tudo bem?";
const ENVIAR_IMAGEM = cfg.enviarImagem !== undefined ? cfg.enviarImagem : false;
const MODO_CAPTION = cfg.modoCaption !== undefined ? cfg.modoCaption : true;
const IMAGENS_DIR = process.env.IMAGENS_DIR || path.join(__dirname, "imagens");
const IMAGEM_PATH = cfg.imagemNome
  ? path.join(IMAGENS_DIR, cfg.imagemNome)
  : path.join(IMAGENS_DIR, "sexta.jpg");

// Valores de tempo sempre em milissegundos. Se vier do config antigo (em segundos,
// valores < 100), converte automaticamente pra ms. Protege contra string também.
function normalizarMs(v, padrao) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return padrao;
  return n < 100 ? n * 1000 : n;
}
const DELAY_MIN_MS = normalizarMs(cfg.delayMin, 2000);
const DELAY_MAX_MS = normalizarMs(cfg.delayMax, 5000);
const PAUSAR_A_CADA = Math.max(1, parseInt(cfg.pausarACada, 10) || 40);
const DURACAO_PAUSA_MS = normalizarMs(cfg.duracaoPausa, 10000);
const PRE_VALIDAR = cfg.preValidar === true || process.env.PRE_VALIDAR === "true";
const VALIDACAO_CACHE_FILE = process.env.VALIDACAO_CACHE_FILE || path.join(path.dirname(CONFIG_FILE), "numeros_validados.json");
const VALIDACAO_TTL_MS = 30 * 86400000; // 30 dias

// ── Utilidades ───────────────────────────────────────────────────────────────
function bootLog(msg) {
  console.log(`[BOOT] ${msg}`);
  try { fs.appendFileSync(BOOT_LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`); } catch (_) {}
}
bootLog("Entrou no script");

function log(msg) {
  try { fs.appendFileSync(RUN_LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`); } catch (_) {}
  console.log(msg);
}

function emit(tipo, dados) {
  console.log("CHATMOVE_EVENT:" + JSON.stringify({ __chatmove: true, tipo, ...dados }));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function delayHumano() { return DELAY_MIN_MS + Math.floor(Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS + 1)); }

function garantirDiretorio(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function caminhoExiste(p) {
  try { return fs.existsSync(p); } catch (_) { return false; }
}

function erroExigeReinicio(err) {
  const msg = String(err?.message || err || "").toLowerCase();
  return msg.includes("connection closed") || msg.includes("timed out") || msg.includes("stream errored");
}

// ── CSV / Contatos ───────────────────────────────────────────────────────────
function detectSeparator(raw) {
  const firstLine = (raw.split(/\r?\n/)[0] || "").trim();
  return firstLine.includes(";") ? ";" : ",";
}

function parseCsvLine(line, sep) {
  const out = []; let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; continue; }
    if (ch === sep && !inQ) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

function carregarContatos(csvPath) {
  const raw = fs.readFileSync(csvPath, "utf8");
  const sep = detectSeparator(raw);
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { separator: sep, contatos: [] };
  const headers = parseCsvLine(lines[0], sep).map(h => h.toLowerCase().trim());
  const contatos = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i], sep);
    const row = {}; headers.forEach((h, idx) => { row[h] = vals[idx] || ""; });
    const nome = row.nome || row.name || row.cliente || "Cliente";
    const tel = row.telefone || row.phone || row.celular || row.whatsapp || row.whats || row.numero || row["número"] || "";
    contatos.push({ nome: String(nome).trim(), telefoneRaw: String(tel).trim() });
  }
  return { separator: sep, contatos };
}

// ── Progress tracking ────────────────────────────────────────────────────────
function loadProgressFile() {
  try { if (caminhoExiste(PROGRESS_FILE)) return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8")); } catch (_) {}
  return {};
}
function getCampaignProgress(pf, id) {
  if (!pf[id]) pf[id] = { lastIndex: 0, sent: {} };
  return pf[id];
}
function saveProgress(pf) {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(pf, null, 2)); } catch (_) {}
}
function foiEnviadoHoje(entry) {
  if (!entry?.when) return false;
  return new Date(entry.when).toDateString() === new Date().toDateString();
}
function getStartIndex(progress, total) {
  if (Number.isInteger(FORCE_START_INDEX) && FORCE_START_INDEX >= 0) return Math.min(FORCE_START_INDEX, total);
  if (Number.isInteger(progress?.lastIndex) && progress.lastIndex >= 0) return Math.min(progress.lastIndex, total);
  return 0;
}

// ── Spintax: {A|B|C} → uma opção aleatória por envio ─────────────────────────
// Resolve até não ter mais grupo com "|". Preserva {nome}, {telefone}, {data}, {hora}
// porque esses não têm pipe (os placeholders são substituídos só depois).
function aplicarSpintax(texto) {
  if (!texto || texto.indexOf("|") === -1) return texto || "";
  let out = String(texto);
  const re = /\{([^{}|]*(?:\|[^{}|]*)+)\}/;  // só casa grupos com pelo menos um "|"
  let m, guarda = 0;
  while ((m = re.exec(out)) && guarda++ < 50) {
    const opcoes = m[1].split("|");
    const escolha = opcoes[Math.floor(Math.random() * opcoes.length)];
    out = out.slice(0, m.index) + escolha + out.slice(m.index + m[0].length);
  }
  return out;
}

function renderMensagem(template, nome, numero) {
  const comSpin = aplicarSpintax(template);
  return comSpin
    .replace(/\{nome\}/g, nome || "")
    .replace(/\{telefone\}/g, numero || "")
    .replace(/\{data\}/g, new Date().toLocaleDateString("pt-BR"))
    .replace(/\{hora\}/g, new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
}

// ── Números ──────────────────────────────────────────────────────────────────
function normalizarNumeroE164(n) {
  if (!n) return null;
  let num = String(n).replace(/\D/g, "").replace(/^0+/, "");
  if (!num.startsWith("55")) {
    if (num.length === 10 || num.length === 11) num = "55" + num;
    else return null;
  }
  if (num.length !== 12 && num.length !== 13) return null;
  return num;
}
function numeroAlternativo(num) {
  if (!num) return null;
  if (num.length === 13) return num.slice(0, 4) + num.slice(5);
  if (num.length === 12) return num.slice(0, 4) + "9" + num.slice(4);
  return null;
}

// ── Mídia ────────────────────────────────────────────────────────────────────
function validarMidiaAntes() {
  if (!ENVIAR_IMAGEM) return;
  if (!IMAGEM_PATH) throw new Error("ENVIAR_IMAGEM=true sem IMAGEM_PATH");
  if (!caminhoExiste(IMAGEM_PATH)) throw new Error("Imagem não encontrada: " + IMAGEM_PATH);
}

async function enviarComOuSemMidia(sock, jid, mensagem) {
  if (!ENVIAR_IMAGEM) {
    await sock.sendMessage(jid, { text: mensagem });
    return 1;
  }
  const buffer = fs.readFileSync(IMAGEM_PATH);
  const ext = path.extname(IMAGEM_PATH).toLowerCase();
  const isPdf = ext === ".pdf";
  if (isPdf) {
    if (MODO_CAPTION) {
      await sock.sendMessage(jid, { document: buffer, mimetype: "application/pdf", fileName: path.basename(IMAGEM_PATH), caption: mensagem });
      return 1;
    }
    await sock.sendMessage(jid, { document: buffer, mimetype: "application/pdf", fileName: path.basename(IMAGEM_PATH) });
    await sleep(700);
    await sock.sendMessage(jid, { text: mensagem });
    return 2;
  }
  if (MODO_CAPTION) {
    await sock.sendMessage(jid, { image: buffer, caption: mensagem });
    return 1;
  }
  await sock.sendMessage(jid, { image: buffer });
  await sleep(700);
  await sock.sendMessage(jid, { text: mensagem });
  return 2;
}

// ── Campanha ─────────────────────────────────────────────────────────────────
async function enviarCampanha(sock) {
  const inicioMs = Date.now();
  const numerosEnviados = new Set(); // pra janela de escuta saber quem filtrar

  const csvPath = path.isAbsolute(ARQUIVO_LISTA) ? ARQUIVO_LISTA : path.join(__dirname, ARQUIVO_LISTA);
  if (!caminhoExiste(csvPath)) throw new Error("CSV não encontrado: " + ARQUIVO_LISTA);

  const { separator, contatos } = carregarContatos(csvPath);
  const progressFile = loadProgressFile();
  const progress = getCampaignProgress(progressFile, CAMPANHA_ID);
  const startIndex = getStartIndex(progress, contatos.length);

  log(`📌 CSV: ${ARQUIVO_LISTA} (sep=${JSON.stringify(separator)})`);
  log(`🪪 Campanha: ${CAMPANHA_ID}`);
  log(`📋 Contatos: ${contatos.length} | Progresso: idx=${progress.lastIndex} sent=${Object.keys(progress.sent).length}`);
  log(`▶️ Retomando do índice: ${startIndex}`);
  log(`🖼️ Mídia: ${ENVIAR_IMAGEM ? IMAGEM_PATH : "nenhuma"} | Caption: ${MODO_CAPTION}`);

  let blacklist = new Set();
  try {
    if (fs.existsSync(BLACKLIST_FILE)) {
      JSON.parse(fs.readFileSync(BLACKLIST_FILE, "utf8")).forEach(b => blacklist.add(String(b.numero)));
    }
  } catch (_) {}

  // ── Fase de pré-validação (opt-in) ─────────────────────────────────────────
  // Pergunta pro WA se cada número existe ANTES de começar a disparar.
  // Números inexistentes viram "inválido" e saem da fila — isso protege a conta
  // porque cada "jid not registered" mid-envio é um sinal negativo pra reputação.
  // Cache em disco (30 dias) pra não re-validar toda campanha.
  const numerosExistentes = new Set();  // E164 que o WA confirmou existir
  const numerosInvalidados = new Set(); // E164 que o WA disse NÃO existir (mesmo com alt)
  if (PRE_VALIDAR) {
    let cache = {};
    try {
      if (fs.existsSync(VALIDACAO_CACHE_FILE)) cache = JSON.parse(fs.readFileSync(VALIDACAO_CACHE_FILE, "utf8")) || {};
    } catch (_) {}
    const agora = Date.now();
    const paraChecar = [];
    const unicos = new Set();
    for (let i = startIndex; i < contatos.length; i++) {
      const n = normalizarNumeroE164(contatos[i].telefoneRaw);
      if (!n || blacklist.has(n) || unicos.has(n)) continue;
      unicos.add(n);
      const c = cache[n];
      if (c && (agora - (c.validadoEm || 0)) < VALIDACAO_TTL_MS) {
        if (c.existe) numerosExistentes.add(c.numeroReal || n);
        else numerosInvalidados.add(n);
      } else {
        paraChecar.push(n);
      }
    }
    log(`🔍 Pré-validação: ${paraChecar.length} a checar · ${unicos.size - paraChecar.length} em cache`);
    emit("validacao_inicio", { total: paraChecar.length });

    const LOTE = 50;
    for (let i = 0; i < paraChecar.length; i += LOTE) {
      const lote = paraChecar.slice(i, i + LOTE);
      try {
        const resp = await sock.onWhatsApp(...lote.map(n => `${n}@s.whatsapp.net`));
        const respMap = new Map();
        (resp || []).forEach(r => {
          if (!r || !r.jid) return;
          const num = String(r.jid).split("@")[0];
          respMap.set(num, r.exists !== false);
        });
        for (const n of lote) {
          if (respMap.get(n)) {
            cache[n] = { existe: true, numeroReal: n, validadoEm: agora };
            numerosExistentes.add(n);
          } else {
            // Tenta formato alternativo (com/sem 9)
            const alt = numeroAlternativo(n);
            let altOk = false;
            if (alt && !respMap.has(alt)) {
              try {
                const r2 = await sock.onWhatsApp(`${alt}@s.whatsapp.net`);
                altOk = !!(r2 && r2[0] && r2[0].exists);
              } catch (_) {}
            }
            if (altOk) {
              cache[n]   = { existe: true, numeroReal: alt, validadoEm: agora };
              cache[alt] = { existe: true, numeroReal: alt, validadoEm: agora };
              numerosExistentes.add(alt);
            } else {
              cache[n] = { existe: false, validadoEm: agora };
              numerosInvalidados.add(n);
            }
          }
        }
      } catch (e) {
        // Se a checagem falhar por rede/temporário, não marca como inválido — segue pro envio normal
        log(`⚠️ Falha na pré-validação do lote ${i}: ${e.message || e}`);
      }
      emit("validacao_progresso", { feito: Math.min(paraChecar.length, i + LOTE), total: paraChecar.length });
      await sleep(400);
    }
    try { fs.writeFileSync(VALIDACAO_CACHE_FILE, JSON.stringify(cache)); } catch (_) {}
    log(`✅ Pré-validação concluída: ${numerosExistentes.size} válidos · ${numerosInvalidados.size} descartados`);
    emit("validacao_fim", { validos: numerosExistentes.size, invalidos: numerosInvalidados.size });
  }

  let totalReal = 0;
  for (let i = startIndex; i < contatos.length; i++) {
    const n = normalizarNumeroE164(contatos[i].telefoneRaw);
    if (!n || blacklist.has(n) || foiEnviadoHoje(progress.sent[n])) continue;
    if (PRE_VALIDAR && numerosInvalidados.has(n) && !numerosExistentes.has(n)) continue;
    totalReal++;
  }
  emit("total", { count: totalReal });
  log(`📊 Total a enviar: ${totalReal}`);

  let enviados = 0, invalidos = 0, pulados = 0, msgsReais = 0;
  const limiteHoje = LIMITE_DIA || Infinity;
  // Quantas mensagens reais cada contato consome (1 com caption, 2 sem)
  const msgsPorContato = (ENVIAR_IMAGEM && !MODO_CAPTION) ? 2 : 1;

  for (let i = startIndex; i < contatos.length; i++) {
    const contato = contatos[i];
    const numeroE164 = normalizarNumeroE164(contato.telefoneRaw);

    if (!numeroE164) {
      invalidos++; progress.lastIndex = i + 1; saveProgress(progressFile);
      log(`❌ Número inválido: ${contato.nome} -> "${contato.telefoneRaw}"`);
      continue;
    }
    if (blacklist.has(numeroE164)) {
      pulados++; progress.lastIndex = i + 1; saveProgress(progressFile);
      log(`🚫 Blacklist: ${contato.nome} (${numeroE164})`);
      continue;
    }
    // Descartado na pré-validação (não existe no WhatsApp)
    if (PRE_VALIDAR && numerosInvalidados.has(numeroE164) && !numerosExistentes.has(numeroE164)) {
      invalidos++; progress.lastIndex = i + 1; saveProgress(progressFile);
      log(`🔍 Pré-validado como inexistente no WA: ${contato.nome} (${numeroE164})`);
      emit("pre_validado_invalido", { nome: contato.nome, numero: numeroE164 });
      continue;
    }
    if (foiEnviadoHoje(progress.sent[numeroE164])) {
      pulados++; progress.lastIndex = i + 1; saveProgress(progressFile);
      emit("pulado", { nome: contato.nome, numero: numeroE164, totalPulados: pulados });
      continue;
    }
    // Limite agora conta mensagens reais, não contatos.
    // Se o próximo contato não couber completo dentro do limite, para.
    if (msgsReais + msgsPorContato > limiteHoje) {
      log(`⏸️ Limite diário (${limiteHoje} msgs) atingido. ${msgsReais} msgs reais enviadas · ${enviados} contatos.`);
      emit("limite_atingido", { enviados, msgsReais, limite: limiteHoje });
      break;
    }

    // Baileys usa @s.whatsapp.net
    const jid = `${numeroE164}@s.whatsapp.net`;
    const mensagem = renderMensagem(MENSAGEM_TEMPLATE, contato.nome, numeroE164);

    try {
      log(`➡️ Enviando para ${contato.nome} (${jid})`);
      const nMsgs = await enviarComOuSemMidia(sock, jid, mensagem);
      enviados++;
      msgsReais += nMsgs;
      numerosEnviados.add(numeroE164);
      progress.sent[numeroE164] = { nome: contato.nome, when: new Date().toISOString() };
      progress.lastIndex = i + 1;
      saveProgress(progressFile);
      log(`✅ Enviado para ${contato.nome} (${numeroE164})${nMsgs>1?` [${nMsgs} msgs]`:""}`);
      emit("enviado", { nome: contato.nome, numero: numeroE164, totalEnviados: enviados, totalMsgsReais: msgsReais });

      if (PAUSAR_A_CADA > 0 && Math.floor(msgsReais / PAUSAR_A_CADA) > Math.floor((msgsReais - nMsgs) / PAUSAR_A_CADA)) {
        log(`⏸️ Pausa de ${Math.round(DURACAO_PAUSA_MS / 1000)}s (${msgsReais} msgs reais enviadas)`);
        await sleep(DURACAO_PAUSA_MS);
      } else {
        await sleep(delayHumano());
      }
    } catch (e) {
      const msgErro = String(e?.message || e).toLowerCase();
      const erroNumero = msgErro.includes("not a valid") || msgErro.includes("not registered") || msgErro.includes("jid");

      if (erroNumero) {
        const numAlt = numeroAlternativo(numeroE164);
        if (numAlt) {
          const jidAlt = `${numAlt}@s.whatsapp.net`;
          log(`🔄 Formato alternativo: ${contato.nome} → ${numAlt}`);
          try {
            const msgAlt = renderMensagem(MENSAGEM_TEMPLATE, contato.nome, numAlt);
            const nMsgs = await enviarComOuSemMidia(sock, jidAlt, msgAlt);
            enviados++;
            msgsReais += nMsgs;
            numerosEnviados.add(numAlt);
            progress.sent[numAlt] = { nome: contato.nome, when: new Date().toISOString() };
            progress.lastIndex = i + 1; saveProgress(progressFile);
            log(`✅ Enviado via alternativo (${numAlt})${nMsgs>1?` [${nMsgs} msgs]`:""}`);
            emit("enviado", { nome: contato.nome, numero: numAlt, totalEnviados: enviados, totalMsgsReais: msgsReais });
            if (PAUSAR_A_CADA > 0 && Math.floor(msgsReais / PAUSAR_A_CADA) > Math.floor((msgsReais - nMsgs) / PAUSAR_A_CADA)) await sleep(DURACAO_PAUSA_MS);
            else await sleep(delayHumano());
            continue;
          } catch (_) { log(`❌ Alternativo também falhou: ${numAlt}`); }
        }
      }

      progress.lastIndex = i + 1; saveProgress(progressFile);
      log(`❌ Erro: ${contato.nome} (${numeroE164}): ${e?.message || e}`);
      emit("erro_envio", { nome: contato.nome, numero: numeroE164, erro: String(e?.message || e).slice(0, 120) });
      if (erroExigeReinicio(e)) { log("🛑 Conexão perdida."); throw e; }
      await sleep(5000);
    }
  }

  const limAting = (msgsReais + msgsPorContato > limiteHoje) && limiteHoje !== Infinity;
  const duracaoMin = Math.max(1, Math.round((Date.now() - inicioMs) / 60000));
  log(`🏁 Finalizado. Enviados: ${enviados} contatos (${msgsReais} msgs reais) | Inválidos: ${invalidos} | Pulados: ${pulados}${limAting ? " | LIMITE ATINGIDO" : ""}`);
  emit("finalizado", { enviados, msgsReais, invalidos, pulados, limiteAtingido: limAting });
  return { enviados, msgsReais, invalidos, pulados, limiteAtingido: limAting, duracaoMin, numerosEnviados, nome: CAMPANHA_ID };
}

// ── Relatório pós-campanha no WhatsApp do dono ────────────────────────────────
async function enviarRelatorioDono(sock, stats) {
  const doneRaw = process.env.WA_DONO;
  if (!doneRaw) { log("ℹ️ WA_DONO não definido — pulando relatório."); return; }
  const doneNum = normalizarNumeroE164(doneRaw);
  if (!doneNum) { log(`⚠️ WA_DONO inválido: "${doneRaw}"`); return; }

  const nome = (process.env.NOME_DONO || "").split(" ")[0];
  const appUrl = process.env.APP_URL || "chat.movebusiness.com.br";
  const partes = [];
  partes.push("🎯 *Campanha finalizada*");
  partes.push(nome ? `Opa ${nome}! Sua campanha "${stats.nome}" acabou de terminar.` : `Sua campanha "${stats.nome}" acabou de terminar.`);
  partes.push("");
  partes.push(`✅ Entregues: *${stats.enviados}*`);
  if (stats.invalidos) partes.push(`❌ Falhas: ${stats.invalidos}`);
  if (stats.pulados)   partes.push(`⏭️ Puladas: ${stats.pulados}`);
  partes.push(`⏱ Duração: ${stats.duracaoMin} min`);
  if (stats.msgsReais !== stats.enviados) partes.push(`📊 Volume real: ${stats.msgsReais} mensagens`);
  if (stats.limiteAtingido) partes.push(`⚠️ Limite diário atingido — continua amanhã`);
  partes.push("");
  partes.push(`Detalhes em ${appUrl}`);

  try {
    await sleep(1500);
    await sock.sendMessage(`${doneNum}@s.whatsapp.net`, { text: partes.join("\n") });
    log(`📤 Relatório enviado para o dono (${doneNum})`);
    emit("relatorio_enviado", { para: doneNum });
  } catch (e) {
    log(`⚠️ Falha ao enviar relatório pro dono: ${e?.message || e}`);
  }
}

// ── Janela de escuta: captura respostas + opt-outs por N minutos ──────────────
async function janelaDeEscuta(sock, numerosCampanha, duracaoMinutos) {
  const duracaoMs = Math.max(1, duracaoMinutos) * 60 * 1000;
  const fimEsperado = Date.now() + duracaoMs;
  const OPT_OUT_REGEX = /\b(sair|parar|cancelar|remover|descadastr|chega|n[aã]o\s+quero\s+mais|n[aã]o\s+enviar|para\s+de\s+mandar)\b/i;
  let respostas = 0, optOuts = 0;
  const numerosQueResponderam = new Set();

  log(`👂 Janela de escuta iniciada: ${duracaoMinutos} min (termina ~${new Date(fimEsperado).toLocaleTimeString("pt-BR")})`);
  emit("escuta_iniciou", { fimEm: new Date(fimEsperado).toISOString(), duracaoMin: duracaoMinutos });

  const handler = ({ messages }) => {
    for (const msg of (messages || [])) {
      try {
        if (!msg.message) continue;
        if (msg.key?.fromMe) continue;
        const jid = String(msg.key?.remoteJid || "");
        if (!jid.endsWith("@s.whatsapp.net")) continue; // só DM, ignora grupos
        let numero = jid.split("@")[0].replace(/:.*/, "");
        // Tenta match direto ou pelo formato alternativo (com/sem o 9)
        let matchou = numerosCampanha.has(numero);
        if (!matchou) {
          const alt = numeroAlternativo(numero);
          if (alt && numerosCampanha.has(alt)) { numero = alt; matchou = true; }
        }
        if (!matchou) continue;
        if (numerosQueResponderam.has(numero)) continue; // só conta primeira resposta de cada contato

        const texto = msg.message.conversation
          || msg.message.extendedTextMessage?.text
          || msg.message.buttonsResponseMessage?.selectedDisplayText
          || msg.message.listResponseMessage?.title
          || "";
        const isOptOut = OPT_OUT_REGEX.test(texto);

        numerosQueResponderam.add(numero);
        respostas++;
        if (isOptOut) optOuts++;

        emit("resposta", { numero, optOut: isOptOut, em: new Date().toISOString() });
        log(`💬 Resposta #${respostas} de ${numero}${isOptOut ? " [opt-out]" : ""}`);
      } catch (_) {}
    }
  };
  sock.ev.on("messages.upsert", handler);

  await sleep(duracaoMs);

  try { sock.ev.off("messages.upsert", handler); } catch (_) {}
  log(`⏸ Janela de escuta encerrada. ${respostas} respostas captadas (${optOuts} opt-outs).`);
  emit("escuta_fim", { respostas, optOuts, numerosQueResponderam: Array.from(numerosQueResponderam) });
}

// ── Main (Baileys) ───────────────────────────────────────────────────────────
const MAX_RECONEXAO = 5;

async function main() {
  try { fs.writeFileSync(RUN_LOG_FILE, ""); } catch (_) {}
  try { validarMidiaAntes(); } catch (e) { log(`❌ ${e.message}`); process.exit(1); }

  garantirDiretorio(AUTH_DIR);
  log("✅ Script iniciou");
  log(`🧭 Node: ${process.version} | Plataforma: ${process.platform}`);
  log(`🧭 Auth: ${AUTH_DIR}`);
  log(`💬 Mensagem: ${MENSAGEM_TEMPLATE.slice(0, 60)}...`);
  log(`⏱️ Delay entre envios: ${(DELAY_MIN_MS/1000).toFixed(1)}s – ${(DELAY_MAX_MS/1000).toFixed(1)}s | Pausa a cada ${PAUSAR_A_CADA} msgs por ${(DURACAO_PAUSA_MS/1000).toFixed(1)}s`);

  bootLog("Carregando Baileys");
  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestWaWebVersion } = require("@whiskeysockets/baileys");
  bootLog("Baileys carregado");

  // Busca versão atual do protocolo WhatsApp Web (evita erro 405)
  let waVersion;
  try {
    const vInfo = await fetchLatestWaWebVersion({});
    waVersion = vInfo.version;
    log(`🧭 WA Web versão: ${waVersion.join(".")}`);
  } catch (e) {
    log(`⚠️ Não conseguiu buscar versão WA: ${e.message}. Usando padrão.`);
  }

  let tentativa = 0;

  while (tentativa <= MAX_RECONEXAO) {
    if (tentativa > 0) {
      log(`🔄 Reconectando... ${tentativa}/${MAX_RECONEXAO}`);
      await sleep(8000);
    }

    log("📲 Conectando ao WhatsApp...");
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ["Ubuntu", "Chrome", "22.04.4"],
      logger: require("pino")({ level: "silent" }),
      ...(waVersion ? { version: waVersion } : {}),
    });

    sock.ev.on("creds.update", saveCreds);

    // Pairing code — deve ser solicitado ANTES da conexão abrir, logo após criar o socket
    if (PAIR_WITH_NUMBER && !sock.authState.creds.registered) {
      const digits = String(PAIR_WITH_NUMBER).replace(/\D/g, "");
      log(`🔢 Solicitando pairing code para ${digits}...`);
      // Aguarda um momento pro socket inicializar
      await sleep(3000);
      try {
        const code = await sock.requestPairingCode(digits);
        const codeFmt = code?.replace(/(.{4})/, "$1-") || code;
        log(`🔢 Pairing code gerado: ${codeFmt}`);
        console.log("CHATMOVE_CODE:" + code);
      } catch (e) {
        log("❌ Falha ao gerar pairing code: " + (e?.message || e));
        log("   → Fallback: QR Code será exibido.");
      }
    }

    const conectado = await new Promise((resolve) => {
      let resolvido = false;
      const timeout = setTimeout(() => {
        if (!resolvido) { resolvido = true; resolve(false); }
      }, 120000);

      let qrMostrado = false;

      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Só mostra QR se NÃO pediu pairing code (senão confunde a UI)
        if (qr && !PAIR_WITH_NUMBER) {
          if (!qrMostrado) { qrMostrado = true; log("🔳 QR Code gerado!"); }
          console.log("CHATMOVE_QR:" + qr);
        }

        if (connection === "open") {
          clearTimeout(timeout);
          if (!resolvido) { resolvido = true; resolve(true); }
          log("✅ WhatsApp conectado!");
          try { fs.writeFileSync(path.join(AUTH_DIR, ".wa-authenticated"), new Date().toISOString()); } catch (_) {}
          emit("autenticado", {});
        }

        if (connection === "close") {
          const code = lastDisconnect?.error?.output?.statusCode;
          log(`🔌 Conexão fechada (code=${code})`);
          if (code === DisconnectReason.loggedOut) {
            log("❌ Sessão expirada. Removendo auth e saindo.");
            try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (_) {}
            clearTimeout(timeout);
            if (!resolvido) { resolvido = true; resolve(false); }
          } else if (!resolvido) {
            clearTimeout(timeout);
            resolvido = true;
            resolve(false);
          }
        }
      });
    });

    if (!conectado) {
      log("⚠️ Não conectou nesta tentativa.");
      tentativa++;
      continue;
    }

    if (CONNECT_ONLY) {
      log("✅ Modo conexão — WhatsApp pareado com sucesso.");
      await sleep(2000);
      try { sock.end(); } catch (_) {}
      return;
    }

    try {
      await sleep(3000);
      const stats = await enviarCampanha(sock);
      log("✅ Envios concluídos.");

      // Relatório pós-campanha no WhatsApp do dono (se WA_DONO veio do server)
      await enviarRelatorioDono(sock, stats);

      // Janela de escuta pós-campanha (default 120 min, configurável via ESCUTA_MIN)
      const escutaMin = parseInt(process.env.ESCUTA_MIN, 10);
      const duracao = Number.isFinite(escutaMin) ? escutaMin : 120;
      if (duracao > 0 && stats.numerosEnviados && stats.numerosEnviados.size > 0) {
        await janelaDeEscuta(sock, stats.numerosEnviados, duracao);
      } else {
        log("ℹ️ Escuta desativada ou nenhum número enviado — pulando janela.");
      }

      try { sock.end(); } catch (_) {}
      return;
    } catch (e) {
      log(`❌ Erro na campanha: ${e?.message || e}`);
      try { sock.end(); } catch (_) {}
      tentativa++;
    }
  }

  log("❌ Todas as tentativas falharam.");
  process.exit(1);
}

main().catch(e => {
  console.error("Erro completo:", e);
  process.exit(1);
});
