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

  let totalReal = 0;
  for (let i = startIndex; i < contatos.length; i++) {
    const n = normalizarNumeroE164(contatos[i].telefoneRaw);
    if (!n || blacklist.has(n) || foiEnviadoHoje(progress.sent[n])) continue;
    totalReal++;
  }
  emit("total", { count: totalReal });
  log(`📊 Total a enviar: ${totalReal}`);

  let enviados = 0, invalidos = 0, pulados = 0, msgsReais = 0;
  const limiteHoje = LIMITE_DIA || Infinity;

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
    if (foiEnviadoHoje(progress.sent[numeroE164])) {
      pulados++; progress.lastIndex = i + 1; saveProgress(progressFile);
      emit("pulado", { nome: contato.nome, numero: numeroE164, totalPulados: pulados });
      continue;
    }
    if (enviados >= limiteHoje) {
      log(`⏸️ Limite diário (${limiteHoje}) atingido.`);
      emit("limite_atingido", { enviados, limite: limiteHoje });
      break;
    }

    // Baileys usa @s.whatsapp.net
    const jid = `${numeroE164}@s.whatsapp.net`;
    const mensagem = MENSAGEM_TEMPLATE
      .replace("{nome}", contato.nome)
      .replace("{telefone}", numeroE164)
      .replace("{data}", new Date().toLocaleDateString("pt-BR"))
      .replace("{hora}", new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));

    try {
      log(`➡️ Enviando para ${contato.nome} (${jid})`);
      const nMsgs = await enviarComOuSemMidia(sock, jid, mensagem);
      enviados++;
      msgsReais += nMsgs;
      progress.sent[numeroE164] = { nome: contato.nome, when: new Date().toISOString() };
      progress.lastIndex = i + 1;
      saveProgress(progressFile);
      log(`✅ Enviado para ${contato.nome} (${numeroE164})${nMsgs>1?` [${nMsgs} msgs]`:""}`);
      emit("enviado", { nome: contato.nome, numero: numeroE164, totalEnviados: enviados });

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
            const msgAlt = MENSAGEM_TEMPLATE.replace("{nome}", contato.nome).replace("{telefone}", numAlt)
              .replace("{data}", new Date().toLocaleDateString("pt-BR"))
              .replace("{hora}", new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
            const nMsgs = await enviarComOuSemMidia(sock, jidAlt, msgAlt);
            enviados++;
            msgsReais += nMsgs;
            progress.sent[numAlt] = { nome: contato.nome, when: new Date().toISOString() };
            progress.lastIndex = i + 1; saveProgress(progressFile);
            log(`✅ Enviado via alternativo (${numAlt})${nMsgs>1?` [${nMsgs} msgs]`:""}`);
            emit("enviado", { nome: contato.nome, numero: numAlt, totalEnviados: enviados });
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

  const limAting = enviados >= limiteHoje && limiteHoje !== Infinity;
  log(`🏁 Finalizado. Enviados: ${enviados} | Inválidos: ${invalidos} | Pulados: ${pulados}${limAting ? " | LIMITE ATINGIDO" : ""}`);
  emit("finalizado", { enviados, invalidos, pulados, limiteAtingido: limAting });
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
      await enviarCampanha(sock);
      log("✅ Processo concluído!");
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
