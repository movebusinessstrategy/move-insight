console.log("🚀 Iniciando ChatMOVE Disparador...");

const fs = require("fs");
const path = require("path");

let whatsAppModule = null;
let qrTerminal = null;

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
const CONNECT_ONLY   = process.env.CONNECT_ONLY === "true";
const LIMITE_DIA     = Number.parseInt(process.env.LIMITE_ENVIOS_DIA || "", 10) || 0;

// ── Carrega configurações do chatmove.config.json se existir ─────────────────
let cfg = {};
try {
  if (fs.existsSync(CONFIG_FILE)) {
    cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  }
} catch (e) {
  console.log("⚠️ Não foi possível carregar chatmove.config.json, usando padrões.");
}

const MENSAGEM_TEMPLATE = cfg.mensagem || `Olá {nome}! Tudo bem?`;
const ENVIAR_IMAGEM = cfg.enviarImagem !== undefined ? cfg.enviarImagem : true;
const MODO_CAPTION = cfg.modoCaption !== undefined ? cfg.modoCaption : true;
const IMAGENS_DIR = process.env.IMAGENS_DIR || path.join(__dirname, "imagens");
const IMAGEM_PATH = cfg.imagemNome
  ? path.join(IMAGENS_DIR, cfg.imagemNome)
  : path.join(IMAGENS_DIR, "sexta.jpg");
const DELAY_MIN_MS = cfg.delayMin || 2000;
const DELAY_MAX_MS = cfg.delayMax || 5000;
const PAUSAR_A_CADA = cfg.pausarACada || 40;
const DURACAO_PAUSA_MS = cfg.duracaoPausa || 10000;

// ─────────────────────────────────────────────────────────────────────────────

function bootLog(message) {
  console.log(`[BOOT] ${message}`);
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    fs.appendFileSync(BOOT_LOG_FILE, line, "utf8");
  } catch (err) {
    console.error("Erro no bootLog:", err);
  }
}

bootLog("Entrou no script");

function getWhatsAppModule() {
  if (!whatsAppModule) {
    bootLog("Carregando whatsapp-web.js");
    whatsAppModule = require("whatsapp-web.js");
    bootLog("whatsapp-web.js carregado");
  }
  return whatsAppModule;
}

function getClientClass() {
  const { Client } = getWhatsAppModule();
  bootLog("Client carregado");
  return Client;
}

function getLocalAuthClass() {
  const { LocalAuth } = getWhatsAppModule();
  bootLog("LocalAuth carregado");
  return LocalAuth;
}

function getMessageMediaClass() {
  const { MessageMedia } = getWhatsAppModule();
  bootLog("MessageMedia carregado");
  return MessageMedia;
}

function getQrTerminal() {
  if (!qrTerminal) {
    bootLog("Carregando qrcode-terminal");
    qrTerminal = require("qrcode-terminal");
    bootLog("qrcode-terminal carregado");
  }
  return qrTerminal;
}

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  try {
    fs.appendFileSync(RUN_LOG_FILE, `${line}\n`, "utf8");
  } catch (err) {
    console.error("Erro no log:", err);
  }
  console.log(message);
}

// Emite evento estruturado para o server.js interpretar com precisão
function emit(tipo, dados) {
  const evento = JSON.stringify({ __chatmove: true, tipo, ...dados });
  console.log("CHATMOVE_EVENT:" + evento);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function delayHumano() {
  return DELAY_MIN_MS + Math.floor(Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS + 1));
}

function erroExigeReinicio(err) {
  const msg = String(err?.message || err || "").toLowerCase();
  return (
    msg.includes("detached frame") ||
    msg.includes("target closed") ||
    msg.includes("execution context was destroyed") ||
    msg.includes("session closed")
  );
}

function caminhoExiste(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function garantirDiretorio(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (err) {
    console.error(`Erro ao criar diretório ${dirPath}:`, err);
  }
}

function detectarChrome() {
  const isLinux = process.platform === "linux";
  console.log(isLinux ? "🔍 Procurando Chrome/Chromium no Linux..." : "🔍 Procurando Chrome no Mac...");
  const candidatos = isLinux
    ? [
        "/usr/bin/google-chrome-stable",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium-browser",
        "/usr/bin/chromium",
        "/snap/bin/chromium",
        "/usr/local/bin/chrome",
      ]
    : [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      ];
  for (const candidato of candidatos) {
    if (caminhoExiste(candidato)) {
      console.log(`✅ Chrome encontrado: ${candidato}`);
      return candidato;
    }
  }
  console.log("⚠️ Chrome não encontrado nos caminhos padrão (usará Chromium bundled do Puppeteer)");
  return null;
}
// compatibilidade: função antiga
const detectarChromeNoMac = detectarChrome;

// ── PUPPETEER — flags de Chrome, com headless auto ──────────────────────────
// IMPORTANTE: não setar userDataDir aqui — LocalAuth do whatsapp-web.js gerencia
// seu próprio perfil do Chromium baseado em dataPath+clientId. Cada AUTH_DIR
// distinto (conta WhatsApp diferente) já produz um perfil Chromium isolado.
function criarPuppeteerBase(chromePath) {
  const isLinuxServer = process.platform === "linux" && !process.env.DISPLAY;
  const forceHeadless = process.env.HEADLESS === "1" || isLinuxServer;
  // Limpa SingletonLock residuais dentro do perfil gerenciado pelo LocalAuth
  // (são criados pelo Chromium e impedem relaunches após crash)
  try {
    const sessDir = path.join(AUTH_DIR, "session-disparador-m4");
    if (fs.existsSync(sessDir)) {
      for (const f of ["SingletonLock", "SingletonCookie", "SingletonSocket"]) {
        const p = path.join(sessDir, f);
        try { if (fs.lstatSync(p, { throwIfNoEntry: false })) fs.unlinkSync(p); } catch(_) {}
      }
    }
  } catch(_) {}
  const args = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--lang=pt-BR",
  ];
  if (!forceHeadless) args.push("--start-maximized");
  const puppeteer = {
    headless: forceHeadless ? "new" : false,
    defaultViewport: forceHeadless ? { width: 1280, height: 800 } : null,
    ignoreHTTPSErrors: true,
    timeout: 120000,
    args,
  };
  if (chromePath) {
    puppeteer.executablePath = chromePath;
  }
  return puppeteer;
}

function criarTentativasPuppeteer(chromePath) {
  const base = criarPuppeteerBase(chromePath);
  return [
    { nome: "Chrome detectado com flags completas", puppeteer: { ...base } },
    { nome: "Chrome com headless legacy", puppeteer: { ...base, headless: "new" } },
    { nome: "Puppeteer padrão sem caminho fixo", puppeteer: criarPuppeteerBase(null) },
  ];
}

// ── CLIENT CONFIG — cache local, sem preflight CORS ──────────────────────────
function criarClientConfig(chromePath) {
  return {
    authStrategy: new (getLocalAuthClass())({
      clientId: "disparador-m4",
      dataPath: AUTH_DIR,
    }),
    webVersionCache: {
      type: "local",
      strict: false,
    },
    puppeteer: criarPuppeteerBase(chromePath),
  };
}

function registrarEventosCliente(client) {
  client.on("qr", async (qr) => {
    const phone = process.env.PAIR_WITH_NUMBER;
    if (phone) {
      try {
        const code = await client.requestPairingCode(phone);
        log("🔢 Pairing code gerado para " + phone + ": " + code);
        console.log("CHATMOVE_CODE:" + code);
        return;
      } catch (e) {
        log("⚠️  Falha ao gerar pairing code: " + (e?.message || e) + ". Usando QR Code como fallback.");
      }
    }
    log("🔳 QR Code recebido!");
    console.log("CHATMOVE_QR:" + qr);
    getQrTerminal().generate(qr, { small: true });
  });

  client.on("authenticated", () => {
    log("🔐 Autenticação realizada com sucesso");
  });

  client.on("ready", () => {
    log("✅ Cliente WhatsApp conectado e pronto!");
  });

  client.on("change_state", (state) => {
    log(`🔁 Estado alterado para: ${state}`);
  });

  client.on("disconnected", (reason) => {
    log(`🔌 Desconectado: ${reason}`);
  });

  client.on("auth_failure", (msg) => {
    log(`❌ Falha na autenticação: ${msg}`);
  });

  client.on("loading_screen", (percent, message) => {
    log(`⏳ Carregando ${percent}% - ${message}`);
  });
}

async function inicializarClienteComFallback(chromePath) {
  const Client = getClientClass();
  const tentativas = criarTentativasPuppeteer(chromePath);
  let ultimoErro = null;

  for (let i = 0; i < tentativas.length; i++) {
    const tentativa = tentativas[i];
    const config = criarClientConfig(chromePath);
    config.puppeteer = tentativa.puppeteer;

    log(`🧪 Tentativa ${i + 1}/${tentativas.length}: ${tentativa.nome}`);
    const client = new Client(config);
    registrarEventosCliente(client);

    try {
      const prontoPromise = aguardarClientePronto(client);
      log("🔄 Inicializando cliente...");
      await Promise.race([
        client.initialize(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Timeout: initialize() travou por mais de 2 minutos")),
            120000
          )
        ),
      ]);
      log("⏳ Aguardando sincronização do WhatsApp...");
      await prontoPromise;
      return client;
    } catch (err) {
      ultimoErro = err;
      log(`⚠️ Tentativa ${i + 1} falhou: ${err?.message || err}`);
      try {
        await client.destroy();
      } catch (destroyErr) {
        log(`⚠️ Falha ao encerrar cliente anterior: ${destroyErr?.message || destroyErr}`);
      }
    }
  }

  throw ultimoErro || new Error("Nao foi possivel inicializar o WhatsApp Web.");
}

function getDataHojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function foiEnviadoHoje(sentItem) {
  if (!sentItem || !sentItem.when) return false;
  return String(sentItem.when).slice(0, 10) === getDataHojeISO();
}

function criarProgressVazio() {
  return { lastIndex: 0, sent: {} };
}

function normalizarProgressCompleto(data) {
  const raiz = data && typeof data === "object" ? data : {};
  const campanhas = raiz.campanhas && typeof raiz.campanhas === "object" ? raiz.campanhas : {};
  for (const [campanhaId, campanha] of Object.entries(campanhas)) {
    campanhas[campanhaId] = {
      lastIndex: Number.isFinite(campanha?.lastIndex) ? campanha.lastIndex : 0,
      sent: campanha?.sent && typeof campanha.sent === "object" ? campanha.sent : {},
    };
  }
  return { campanhas };
}

function loadProgressFile() {
  try {
    if (!fs.existsSync(PROGRESS_FILE)) return normalizarProgressCompleto({});
    return normalizarProgressCompleto(JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8")));
  } catch (err) {
    console.error("Erro ao carregar progress:", err);
    return normalizarProgressCompleto({});
  }
}

function getCampaignProgress(progressFile, campanhaId) {
  if (!progressFile.campanhas[campanhaId]) {
    progressFile.campanhas[campanhaId] = criarProgressVazio();
  }
  return progressFile.campanhas[campanhaId];
}

function saveProgress(progressFile) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progressFile, null, 2), "utf8");
  } catch (e) {
    log(`⚠️ Não consegui salvar progress.json: ${e?.message || e}`);
  }
}

function getStartIndex(progress, totalContatos) {
  if (Number.isInteger(FORCE_START_INDEX) && FORCE_START_INDEX >= 0) {
    return Math.min(FORCE_START_INDEX, totalContatos);
  }
  if (Number.isInteger(progress?.lastIndex) && progress.lastIndex >= 0) {
    return Math.min(progress.lastIndex, totalContatos);
  }
  return 0;
}

function normalizarNumeroE164(numeroCru) {
  if (!numeroCru) return null;
  let num = String(numeroCru).replace(/\D/g, "");
  num = num.replace(/^0+/, "");
  if (!num.startsWith("55")) {
    if (num.length === 10 || num.length === 11) num = `55${num}`;
    else return null;
  }
  if (num.length !== 12 && num.length !== 13) return null;
  return num;
}

// Gera o número alternativo trocando o formato do dígito 9:
// 55 (país) + DD (2 dígitos) + número
//   13 dígitos: tem o 9 → remove o dígito na posição 4 (logo após o DDD)
//   12 dígitos: sem o 9  → insere "9" na posição 4 (logo após o DDD)
function numeroAlternativo(num) {
  if (!num) return null;
  if (num.length === 13) {
    // ex: 5511996255556 → 55 + 11 + 9 + 96255556 → remove o 9 → 551196255556
    return num.slice(0, 4) + num.slice(5);
  }
  if (num.length === 12) {
    // ex: 551196255556 → 55 + 11 + 96255556 → adiciona 9 → 5511996255556
    return num.slice(0, 4) + "9" + num.slice(4);
  }
  return null;
}

function detectSeparator(raw) {
  const firstLine = (raw.split(/\r?\n/)[0] || "").trim();
  if (firstLine.includes(";")) return ";";
  return ",";
}

function parseCsvLine(line, separator) {
  const out = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; } else { inQuotes = !inQuotes; }
      continue;
    }
    if (ch === separator && !inQuotes) { out.push(current); current = ""; continue; }
    current += ch;
  }
  out.push(current);
  return out.map((item) => item.trim());
}

function carregarContatos(csvPath) {
  const raw = fs.readFileSync(csvPath, "utf8");
  const separator = detectSeparator(raw);
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return { separator, contatos: [] };
  const headers = parseCsvLine(lines[0], separator).map((item) => item.toLowerCase().trim());
  const contatos = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i], separator);
    const row = {};
    headers.forEach((header, index) => { row[header] = values[index] || ""; });
    const nome = row.nome || row.name || row.cliente || "Cliente";
    const telefone = row.telefone || row.phone || row.celular || row.whatsapp || row.whats || row.numero || row.número || "";
    contatos.push({ nome: String(nome).trim(), telefoneRaw: String(telefone).trim() });
  }
  return { separator, contatos };
}

function aguardarClientePronto(client) {
  return new Promise((resolve, reject) => {
    let resolvido = false;
    const timeout = setTimeout(() => {
      if (resolvido) return;
      resolvido = true;
      reject(new Error("WhatsApp não ficou pronto a tempo (3 minutos)."));
    }, 180000);
    client.once("ready", () => {
      if (resolvido) return;
      resolvido = true;
      clearTimeout(timeout);
      resolve();
    });
    client.once("auth_failure", (msg) => {
      if (resolvido) return;
      resolvido = true;
      clearTimeout(timeout);
      reject(new Error(`Falha de autenticação: ${msg}`));
    });
    client.once("disconnected", (reason) => {
      if (resolvido) return;
      resolvido = true;
      clearTimeout(timeout);
      reject(new Error(`WhatsApp desconectou antes do ready: ${reason}`));
    });
  });
}

function validarMidiaAntes() {
  if (!ENVIAR_IMAGEM) return;
  if (!IMAGEM_PATH) throw new Error("ENVIAR_IMAGEM=true, mas IMAGEM_PATH não foi definido.");
  if (!caminhoExiste(IMAGEM_PATH)) throw new Error(`Imagem não encontrada em: ${IMAGEM_PATH}`);
}

function carregarMidia() {
  const MessageMedia = getMessageMediaClass();
  return MessageMedia.fromFilePath(IMAGEM_PATH);
}

async function enviarComOuSemMidia(client, jid, mensagem) {
  if (!ENVIAR_IMAGEM) {
    await client.sendMessage(jid, mensagem);
    return;
  }
  const media = carregarMidia();
  if (MODO_CAPTION) {
    await client.sendMessage(jid, media, { caption: mensagem });
  } else {
    await client.sendMessage(jid, media);
    await sleep(700);
    await client.sendMessage(jid, mensagem);
  }
}

async function enviarCampanha(client) {
  const csvPath = path.isAbsolute(ARQUIVO_LISTA) ? ARQUIVO_LISTA : path.join(__dirname, ARQUIVO_LISTA);
  if (!caminhoExiste(csvPath)) throw new Error(`CSV não encontrado: ${ARQUIVO_LISTA}`);

  const { separator, contatos } = carregarContatos(csvPath);
  const progressFile = loadProgressFile();
  const progress = getCampaignProgress(progressFile, CAMPANHA_ID);
  const startIndex = getStartIndex(progress, contatos.length);

  log(`📌 CSV: ${ARQUIVO_LISTA}`);
  log(`📌 Separador detectado: ${JSON.stringify(separator)}`);
  log(`🪪 Campanha: ${CAMPANHA_ID}`);
  log(`📋 Contatos carregados: ${contatos.length}`);
  log(`🧠 Progresso atual: lastIndex=${progress.lastIndex} sent=${Object.keys(progress.sent).length}`);
  log(`▶️ Retomando do índice: ${startIndex}`);
  log(`🖼️ Enviar imagem: ${ENVIAR_IMAGEM ? "SIM" : "NÃO"} | Modo caption: ${MODO_CAPTION ? "SIM" : "NÃO"}`);
  if (ENVIAR_IMAGEM) log(`🖼️ Imagem: ${IMAGEM_PATH}`);

  // Calcula total real a enviar (excluindo inválidos e já enviados hoje)
  // Carrega blacklist
  let blacklist = new Set();
  try {
    if (fs.existsSync(BLACKLIST_FILE)) {
      const bl = JSON.parse(fs.readFileSync(BLACKLIST_FILE, "utf8"));
      bl.forEach(b => blacklist.add(String(b.numero)));
    }
  } catch {}

  let totalReal = 0;
  for (let i = startIndex; i < contatos.length; i++) {
    const n = normalizarNumeroE164(contatos[i].telefoneRaw);
    if (!n) continue;
    if (blacklist.has(n)) continue;
    if (foiEnviadoHoje(progress.sent[n])) continue;
    totalReal++;
  }
  emit("total", { count: totalReal });
  log(`📊 Total a enviar: ${totalReal}`);

  let enviados = 0;
  const limiteHoje = LIMITE_DIA || Infinity;
  let invalidos = 0;
  let pulados = 0;

  for (let i = startIndex; i < contatos.length; i++) {
    const contato = contatos[i];
    const numeroE164 = normalizarNumeroE164(contato.telefoneRaw);

    if (!numeroE164) {
      invalidos++;
      progress.lastIndex = i + 1;
      saveProgress(progressFile);
      log(`❌ Número inválido: ${contato.nome} -> "${contato.telefoneRaw}"`);
      continue;
    }

    // Verifica blacklist
    if (blacklist.has(numeroE164)) {
      progress.lastIndex = i + 1;
      saveProgress(progressFile);
      log(`🚫 Bloqueado (blacklist): ${contato.nome} (${numeroE164})`);
      pulados++;
      continue;
    }

    if (foiEnviadoHoje(progress.sent[numeroE164])) {
      progress.lastIndex = i + 1;
      saveProgress(progressFile);
      log(`⏭️ Já enviado hoje: ${contato.nome} -> ${numeroE164}`);
      pulados++;
      emit("pulado", { nome: contato.nome, numero: numeroE164, totalPulados: pulados });
      continue;
    }

    // Parar se atingiu limite diário
    if (enviados >= limiteHoje) {
      log(`⏸️ Limite diário de ${limiteHoje} envios atingido. O disparo continua amanhã automaticamente.`);
      emit("limite_atingido", { enviados, limite: limiteHoje });
      break;
    }

    const jid = `${numeroE164}@c.us`;
    const mensagem = MENSAGEM_TEMPLATE.replace("{nome}", contato.nome)
      .replace("{telefone}", numeroE164)
      .replace("{data}", new Date().toLocaleDateString("pt-BR"))
      .replace("{hora}", new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));

    try {
      log(`➡️ Enviando para ${contato.nome} (${jid})`);
      await enviarComOuSemMidia(client, jid, mensagem);
      enviados++;
      progress.sent[numeroE164] = { nome: contato.nome, when: new Date().toISOString() };
      progress.lastIndex = i + 1;
      saveProgress(progressFile);
      log(`✅ Enviado para ${contato.nome} (${numeroE164})`);
      emit("enviado", { nome: contato.nome, numero: numeroE164, totalEnviados: enviados });

      if (PAUSAR_A_CADA > 0 && enviados % PAUSAR_A_CADA === 0) {
        log(`⏸️ Pausa de ${Math.round(DURACAO_PAUSA_MS / 1000)}s`);
        await sleep(DURACAO_PAUSA_MS);
      } else {
        await sleep(delayHumano());
      }
    } catch (e) {
      // ── Verifica se é erro de número inexistente no WhatsApp ─────────────
      const msgErro = String(e?.message || e).toLowerCase();
      const erroNumero = msgErro.includes("no lid") || msgErro.includes("not a contact") || msgErro.includes("invalid wid");

      if (erroNumero) {
        // Tenta o formato alternativo (com ou sem dígito 9)
        const numAlt = numeroAlternativo(numeroE164);
        if (numAlt) {
          const jidAlt = `${numAlt}@c.us`;
          log(`🔄 Tentando formato alternativo para ${contato.nome}: ${numAlt}`);
          try {
            const mensagemAlt = MENSAGEM_TEMPLATE.replace("{nome}", contato.nome)
              .replace("{telefone}", numAlt)
              .replace("{data}", new Date().toLocaleDateString("pt-BR"))
              .replace("{hora}", new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
            await enviarComOuSemMidia(client, jidAlt, mensagemAlt);
            enviados++;
            progress.sent[numAlt] = { nome: contato.nome, when: new Date().toISOString() };
            progress.lastIndex = i + 1;
            saveProgress(progressFile);
            log(`✅ Enviado para ${contato.nome} com formato alternativo (${numAlt})`);
            emit("enviado", { nome: contato.nome, numero: numAlt, totalEnviados: enviados });

            if (PAUSAR_A_CADA > 0 && enviados % PAUSAR_A_CADA === 0) {
              log(`⏸️ Pausa de ${Math.round(DURACAO_PAUSA_MS / 1000)}s`);
              await sleep(DURACAO_PAUSA_MS);
            } else {
              await sleep(delayHumano());
            }
            continue;
          } catch (e2) {
            log(`❌ Formato alternativo também falhou para ${contato.nome} (${numAlt}): ${e2?.message || e2}`);
          }
        }
      }

      progress.lastIndex = i + 1;
      saveProgress(progressFile);
      log(`❌ Erro ao enviar para ${contato.nome} (${numeroE164}): ${e?.message || e}`);
      emit("erro_envio", { nome: contato.nome, numero: numeroE164, erro: String(e?.message || e).slice(0, 120) });
      if (erroExigeReinicio(e)) {
        log("🛑 O WhatsApp Web perdeu a página ativa. Parando para reinício limpo.");
        throw e;
      }
      await sleep(5000);
    }
  }

  if (enviados >= limiteHoje && limiteHoje !== Infinity) {
    log(`📅 Limite do dia atingido (${enviados}/${limiteHoje}). Os contatos restantes serão enviados automaticamente nos próximos dias.`);
    emit("finalizado", { enviados, invalidos, pulados, limiteAtingido: true });
  } else {
    log(`🏁 Finalizado. Enviados: ${enviados} | Inválidos: ${invalidos} | Pulados: ${pulados}`);
    emit("finalizado", { enviados, invalidos, pulados, limiteAtingido: false });
  }
  emit("finalizado", { enviados, invalidos, pulados });
}

const MAX_TENTATIVAS_RECONEXAO = 5;
const ESPERA_RECONEXAO_MS = 8000;

async function main() {
  try {
    fs.writeFileSync(RUN_LOG_FILE, "", "utf8");
  } catch (err) {
    console.error("Erro ao limpar log:", err);
  }

  try {
    validarMidiaAntes();
  } catch(e) {
    log(`❌ ${e?.message || e}`);
    process.exit(1);
  }

  const chromePath = detectarChromeNoMac();
  garantirDiretorio(AUTH_DIR);

  log("✅ Script iniciou");
  log(`🧭 Sistema: macOS (M4)`);
  log(`🧭 Node: ${process.version}`);
  log(`🧭 Chrome: ${chromePath || "(padrão do Puppeteer)"}`);
  log(`🧭 Sessão local do WhatsApp: ${AUTH_DIR}`);
  log(`💬 Mensagem template: ${MENSAGEM_TEMPLATE.slice(0, 60)}...`);

  let tentativa = 0;

  while (tentativa <= MAX_TENTATIVAS_RECONEXAO) {
    let client = null;
    try {
      if (tentativa > 0) {
        log(`🔄 Reconectando... tentativa ${tentativa}/${MAX_TENTATIVAS_RECONEXAO}`);
        await sleep(ESPERA_RECONEXAO_MS);
      }

      log("📲 Inicializando WhatsApp Web...");
      client = await inicializarClienteComFallback(chromePath);
      log("🚀 Iniciando campanha de mensagens...");

      if (CONNECT_ONLY) {
        log("✅ WhatsApp autenticado com sucesso.");
        emit("autenticado", {});
        await sleep(2000);
        try { await client.destroy(); } catch(_) {}
        return;
      }

      if (tentativa === 0) await sleep(3000);

      await enviarCampanha(client);
      log("✅ Processo concluído!");

      // Sucesso — encerra o loop
      try { await client.destroy(); } catch(_) {}
      return;

    } catch (e) {
      const msg = String(e?.message || e).toLowerCase();
      const ehErroRecuperavel =
        msg.includes("execution context was destroyed") ||
        msg.includes("detached frame") ||
        msg.includes("target closed") ||
        msg.includes("session closed") ||
        msg.includes("protocol error");

      if (client) {
        try { await client.destroy(); } catch(_) {}
      }

      if (ehErroRecuperavel && tentativa < MAX_TENTATIVAS_RECONEXAO) {
        tentativa++;
        log(`⚠️ Conexão perdida: ${e?.message}`);
        log(`⏳ Aguardando ${ESPERA_RECONEXAO_MS / 1000}s para reconectar...`);
        continue;
      }

      log(`❌ Erro fatal: ${e?.message || e}`);
      console.error("Erro completo:", e);
      process.exitCode = 1;
      return;
    }
  }

  log(`❌ Número máximo de tentativas (${MAX_TENTATIVAS_RECONEXAO}) atingido. Encerrando.`);
  process.exitCode = 1;
}

main().catch((err) => {
  console.error("Erro não capturado:", err);
  process.exit(1);
});
