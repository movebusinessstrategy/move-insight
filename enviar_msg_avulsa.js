// enviar_msg_avulsa.js — envia UMA mensagem de texto pelo WhatsApp e sai.
// Usado pelo endpoint /api/relatorio/enviar pra mandar o resumo mensal.
//
// ENV necessárias:
//   AUTH_DIR_OVERRIDE — pasta de auth já autenticada (.wwebjs_auth_<contaId>)
//   MSG_DESTINO       — número do destinatário (só dígitos, com DDI+DDD)
//   MSG_TEXTO         — texto que vai ser enviado

const AUTH_DIR    = process.env.AUTH_DIR_OVERRIDE;
const MSG_DESTINO = String(process.env.MSG_DESTINO || "").replace(/\D/g, "");
const MSG_TEXTO   = process.env.MSG_TEXTO || "";

function log(m) { console.log("[envioAvulso]", m); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalizar(n) {
  if (!n) return null;
  let num = String(n).replace(/\D/g, "").replace(/^0+/, "");
  if (!num.startsWith("55")) {
    if (num.length === 10 || num.length === 11) num = "55" + num;
    else return null;
  }
  if (num.length !== 12 && num.length !== 13) return null;
  return num;
}
function alt(num) {
  if (!num) return null;
  if (num.length === 13) return num.slice(0, 4) + num.slice(5);
  if (num.length === 12) return num.slice(0, 4) + "9" + num.slice(4);
  return null;
}

(async () => {
  if (!AUTH_DIR || !MSG_DESTINO || !MSG_TEXTO) {
    log("Faltam env vars"); process.exit(1);
  }
  const num = normalizar(MSG_DESTINO);
  if (!num) { log("Número inválido"); process.exit(1); }

  const { default: makeWASocket, useMultiFileAuthState, fetchLatestWaWebVersion } =
    require("@whiskeysockets/baileys");

  let waVersion;
  try { waVersion = (await fetchLatestWaWebVersion({})).version; } catch {}

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ["Ubuntu", "Chrome", "22.04.4"],
    logger: require("pino")({ level: "silent" }),
    ...(waVersion ? { version: waVersion } : {})
  });
  sock.ev.on("creds.update", saveCreds);

  const conectado = await new Promise(resolve => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; resolve(false); } }, 60000);
    sock.ev.on("connection.update", (u) => {
      if (done) return;
      if (u.connection === "open") { done = true; clearTimeout(t); resolve(true); }
      if (u.connection === "close") { done = true; clearTimeout(t); resolve(false); }
    });
  });

  if (!conectado) { log("Falha ao conectar"); process.exit(1); }

  // Tenta o número principal; se o WA retornar exists:false, tenta o alternativo (com/sem 9)
  async function existeNoWA(n) {
    try {
      const r = await sock.onWhatsApp(`${n}@s.whatsapp.net`);
      return !!(r && r[0] && r[0].exists);
    } catch { return false; }
  }

  let destino = await existeNoWA(num) ? num : null;
  if (!destino) {
    const a = alt(num);
    if (a && await existeNoWA(a)) destino = a;
  }
  if (!destino) { log("Número não existe no WhatsApp"); await sock.end?.(); process.exit(1); }

  try {
    await sock.sendMessage(`${destino}@s.whatsapp.net`, { text: MSG_TEXTO });
    log("Enviado com sucesso para " + destino);
  } catch (e) {
    log("Erro ao enviar: " + (e && e.message || e));
    await sock.end?.();
    process.exit(1);
  }

  await sleep(1500);
  try { await sock.end?.(); } catch {}
  process.exit(0);
})().catch(e => {
  console.error("[envioAvulso] fatal:", e);
  process.exit(1);
});
