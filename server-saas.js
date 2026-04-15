// ─────────────────────────────────────────────────────────────────────────────
// ChatMOVE SaaS   Servidor principal
// Auth + Mercado Pago + Multi-tenant
// ─────────────────────────────────────────────────────────────────────────────
require("dotenv").config();
const express  = require("express");
const http     = require("http");
const WebSocket = require("ws");
const path     = require("path");
const fs       = require("fs");
const { spawn } = require("child_process");
const crypto   = require("crypto");

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });
const PORT   = process.env.PORT || 3000;
const ROOT   = __dirname;
const DATA   = path.join(ROOT, "data"); // pasta raiz de dados por usuário
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });

app.use(express.json({ limit: "50mb" }));
app.use(express.static(ROOT));

// ── JWT simples (sem lib externa) ─────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || "chatmove_secret_2026_change_this";

function jwtSign(payload) {
  const header  = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body    = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString("base64url");
  const sig     = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}
function jwtVerify(token) {
  try {
    const [header, body, sig] = token.split(".");
    const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}
function hashPassword(pwd) {
  return crypto.createHmac("sha256", JWT_SECRET + "salt").update(pwd).digest("hex");
}
function authMiddleware(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  const payload = jwtVerify(token);
  if (!payload) return res.status(401).json({ erro: "Não autenticado" });
  req.userId = payload.userId;
  req.user   = lerUsuario(payload.userId);
  if (!req.user) return res.status(401).json({ erro: "Usuário não encontrado" });
  next();
}
function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (!req.user.admin) return res.status(403).json({ erro: "Acesso negado" });
    next();
  });
}

// ── Helpers de dados ──────────────────────────────────────────────────────────
function lerJSON(filePath, padrao) {
  try { return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : padrao; }
  catch { return padrao; }
}
function salvarJSON(filePath, dados) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(dados, null, 2), "utf8");
}
function userDir(userId) {
  const dir = path.join(DATA, userId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}
function userFile(userId, nome) { return path.join(userDir(userId), nome); }
function lerUser(userId, nome, padrao) { return lerJSON(userFile(userId, nome), padrao); }
function salvarUser(userId, nome, dados) { salvarJSON(userFile(userId, nome), dados); }

// ── Usuários ──────────────────────────────────────────────────────────────────
const USERS_FILE = path.join(DATA, "users.json");
function lerUsuarios() { return lerJSON(USERS_FILE, []); }
function lerUsuario(id) { return lerUsuarios().find(u => u.id === id) || null; }
function lerUsuarioPorEmail(email) { return lerUsuarios().find(u => u.email === email.toLowerCase()) || null; }
function salvarUsuarios(users) { salvarJSON(USERS_FILE, users); }
function atualizarUsuario(id, campos) {
  const users = lerUsuarios();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return false;
  users[idx] = { ...users[idx], ...campos };
  salvarUsuarios(users);
  return users[idx];
}

// ── Planos ────────────────────────────────────────────────────────────────────
// Preços em centavos. Anual = mensal × 10 (2 meses grátis).
const PLANOS = {
  basico: {
    id: "basico", nome: "Básico",
    precoMensal: 4990, precoAnual: 49900,
    limiteEnviosDia: 100,
    contasWhatsApp: 1,
    agendamento: false,
    recorrente: false,
    descricao: "Para quem está começando"
  },
  premium: {
    id: "premium", nome: "Premium",
    precoMensal: 9990, precoAnual: 99900,
    limiteEnviosDia: 500,
    contasWhatsApp: 2,
    agendamento: true,
    recorrente: false,
    descricao: "Para uso profissional"
  },
  pro: {
    id: "pro", nome: "Pro",
    precoMensal: 19990, precoAnual: 199900,
    limiteEnviosDia: 1000,
    contasWhatsApp: 5,
    agendamento: true,
    recorrente: true,
    descricao: "Para escala máxima com automação"
  },
  owner: {
    id: "owner", nome: "Owner",
    precoMensal: 0, precoAnual: 0,
    limiteEnviosDia: 999999,
    contasWhatsApp: 999,
    agendamento: true,
    recorrente: true,
    descricao: "Acesso total do proprietário"
  }
};
function precoDo(plano, ciclo) {
  const p = PLANOS[plano]; if (!p) return 0;
  return ciclo === "anual" ? p.precoAnual : p.precoMensal;
}

// ── Validadores CPF/CNPJ/e-mail ──────────────────────────────────────────────
function soDigitos(s) { return String(s || "").replace(/\D/g, ""); }
function validarCPF(cpf) {
  cpf = soDigitos(cpf);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +cpf[i] * (10 - i);
  let d1 = 11 - (s % 11); if (d1 >= 10) d1 = 0;
  if (d1 !== +cpf[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += +cpf[i] * (11 - i);
  let d2 = 11 - (s % 11); if (d2 >= 10) d2 = 0;
  return d2 === +cpf[10];
}
function validarCNPJ(cnpj) {
  cnpj = soDigitos(cnpj);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const p1 = [5,4,3,2,9,8,7,6,5,4,3,2];
  const p2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
  let s = 0;
  for (let i = 0; i < 12; i++) s += +cnpj[i] * p1[i];
  let d1 = s % 11; d1 = d1 < 2 ? 0 : 11 - d1;
  if (d1 !== +cnpj[12]) return false;
  s = 0;
  for (let i = 0; i < 13; i++) s += +cnpj[i] * p2[i];
  let d2 = s % 11; d2 = d2 < 2 ? 0 : 11 - d2;
  return d2 === +cnpj[13];
}
function validarEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || "")); }
function validarMaiorIdade(dataNasc) {
  const d = new Date(dataNasc); if (isNaN(d)) return false;
  const hoje = new Date();
  const idade = hoje.getFullYear() - d.getFullYear() - (hoje < new Date(hoje.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
  return idade >= 18 && idade < 120;
}

// Normaliza e valida dados de cadastro (PF ou PJ). Retorna {ok, erro, dados}.
function validarCadastroCompleto(body) {
  const tipo = body.tipoPessoa === "pj" ? "pj" : "pf";
  const e = [];
  const nome = String(body.nome || "").trim();
  if (nome.length < 3) e.push("Nome completo obrigatório");
  const dataNasc = String(body.dataNascimento || "").trim();
  if (!validarMaiorIdade(dataNasc)) e.push("Data de nascimento inválida ou menor de 18 anos");
  const cpf = soDigitos(body.cpf);
  if (!validarCPF(cpf)) e.push("CPF inválido");
  const whatsapp = soDigitos(body.whatsapp);
  if (whatsapp.length < 10 || whatsapp.length > 11) e.push("WhatsApp inválido");
  const cep = soDigitos(body.cep);
  if (cep.length !== 8) e.push("CEP inválido");
  const logradouro = String(body.logradouro || "").trim();
  if (!logradouro) e.push("Logradouro obrigatório");
  const numero = String(body.numero || "").trim();
  if (!numero) e.push("Número obrigatório");
  const bairro = String(body.bairro || "").trim();
  if (!bairro) e.push("Bairro obrigatório");
  const cidade = String(body.cidade || "").trim();
  if (!cidade) e.push("Cidade obrigatória");
  const estado = String(body.estado || "").trim().toUpperCase();
  if (estado.length !== 2) e.push("Estado inválido");
  let dadosPJ = null;
  if (tipo === "pj") {
    const cnpj = soDigitos(body.cnpj);
    if (!validarCNPJ(cnpj)) e.push("CNPJ inválido");
    const razaoSocial = String(body.razaoSocial || "").trim();
    if (razaoSocial.length < 2) e.push("Razão social obrigatória");
    const respNome = String(body.responsavelNome || "").trim();
    if (respNome.length < 3) e.push("Nome do responsável obrigatório");
    const respTel = soDigitos(body.responsavelTelefone);
    if (respTel.length < 10) e.push("Telefone do responsável inválido");
    dadosPJ = { cnpj, razaoSocial, nomeFantasia: String(body.nomeFantasia || "").trim(), responsavelNome: respNome, responsavelTelefone: respTel };
  }
  if (e.length) return { ok: false, erro: e.join(" · ") };
  return {
    ok: true,
    dados: {
      tipoPessoa: tipo,
      nome, dataNascimento: dataNasc, cpf, whatsapp,
      endereco: { cep, logradouro, numero, complemento: String(body.complemento || "").trim(), bairro, cidade, estado },
      ...(dadosPJ || {}),
      termosAceitosEm: new Date().toISOString()
    }
  };
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
app.post("/api/auth/registro", (req, res) => {
  const { email, senha, plano, ciclo, termosAceitos } = req.body;
  if (!validarEmail(email)) return res.status(400).json({ erro: "E-mail inválido" });
  if (!senha || senha.length < 6) return res.status(400).json({ erro: "Senha deve ter ao menos 6 caracteres" });
  if (!PLANOS[plano]) return res.status(400).json({ erro: "Plano inválido" });
  if (!termosAceitos) return res.status(400).json({ erro: "É necessário aceitar os Termos de Uso e Política de Privacidade" });
  const cicloNorm = ciclo === "anual" ? "anual" : "mensal";
  if (lerUsuarioPorEmail(email)) return res.status(400).json({ erro: "E-mail já cadastrado" });

  const v = validarCadastroCompleto(req.body);
  if (!v.ok) return res.status(400).json({ erro: v.erro });

  const id = "u_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  const user = {
    id, email: email.toLowerCase().trim(),
    senha: hashPassword(senha), plano, ciclo: cicloNorm, ativo: false,
    admin: false, criadoEm: new Date().toISOString(),
    enviosHoje: 0, ultimoEnvioData: null,
    assinaturaId: null, proximoVencimento: null,
    cadastroCompleto: true,
    ...v.dados
  };
  const users = lerUsuarios();
  users.push(user);
  salvarUsuarios(users);
  res.json({ ok: true, userId: id, mensagem: "Conta criada. Finalize o pagamento para ativar." });
});

app.post("/api/auth/login", (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: "Preencha e-mail e senha" });
  const user = lerUsuarioPorEmail(email);
  if (!user || user.senha !== hashPassword(senha)) return res.status(401).json({ erro: "E-mail ou senha incorretos" });
  if (!user.ativo && !user.admin) return res.status(403).json({ erro: "Conta pendente de pagamento", pendente: true });
  const token = jwtSign({ userId: user.id, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 });
  res.json({ ok: true, token, user: { id: user.id, nome: user.nome, email: user.email, plano: user.plano, admin: user.admin } });
});

// Config pública (valores seguros de expor no frontend)
app.get("/api/config/public", (req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null });
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  const { senha, ...safe } = req.user;
  res.json({ ...safe, plano_info: PLANOS[req.user.plano] || PLANOS.owner });
});

// Login via Google — valida credential (ID Token) contra o Google e cria/loga o usuário
app.post("/api/auth/google", async (req, res) => {
  const { credential, plano, ciclo } = req.body || {};
  if (!credential) return res.status(400).json({ erro: "Token Google ausente" });
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  if (!GOOGLE_CLIENT_ID) return res.status(500).json({ erro: "Login Google não configurado no servidor" });

  // Valida o JWT do Google via tokeninfo (endpoint oficial, não exige lib)
  let payload;
  try {
    const resp = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(credential));
    payload = await resp.json();
    if (!resp.ok || payload.error) throw new Error(payload.error_description || payload.error || "Token inválido");
    if (payload.aud !== GOOGLE_CLIENT_ID) throw new Error("Audience mismatch");
    if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com") throw new Error("Issuer inválido");
    if (+payload.exp * 1000 < Date.now()) throw new Error("Token expirado");
    if (!payload.email || !payload.email_verified || payload.email_verified === "false") throw new Error("E-mail não verificado");
  } catch (e) {
    console.error("Google auth:", e.message);
    return res.status(401).json({ erro: "Falha ao validar conta Google" });
  }

  const email = String(payload.email).toLowerCase();
  const googleId = payload.sub;
  const nomeGoogle = payload.name || payload.given_name || email.split("@")[0];

  let user = lerUsuarioPorEmail(email);
  if (user) {
    if (!user.googleId) atualizarUsuario(user.id, { googleId });
    if (!user.ativo && !user.admin) return res.status(403).json({ erro: "Conta pendente de pagamento", pendente: true });
    const token = jwtSign({ userId: user.id, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 });
    return res.json({ ok: true, token, user: { id: user.id, nome: user.nome, email: user.email, plano: user.plano, admin: user.admin }, cadastroCompleto: user.cadastroCompleto !== false });
  }

  // Novo usuário via Google: cria conta parcial (cadastroCompleto=false, ativo=false)
  if (!PLANOS[plano]) return res.status(400).json({ erro: "Plano não especificado para novo cadastro" });
  const cicloNorm = ciclo === "anual" ? "anual" : "mensal";
  const id = "u_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  user = {
    id, email, nome: nomeGoogle, googleId,
    senha: null, plano, ciclo: cicloNorm, ativo: false,
    admin: false, criadoEm: new Date().toISOString(),
    enviosHoje: 0, ultimoEnvioData: null,
    assinaturaId: null, proximoVencimento: null,
    cadastroCompleto: false
  };
  const users = lerUsuarios();
  users.push(user);
  salvarUsuarios(users);
  const token = jwtSign({ userId: id, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 });
  res.json({ ok: true, token, user: { id, nome: user.nome, email, plano, admin: false }, cadastroCompleto: false });
});

// Completar cadastro após login via Google (usuário logado mas cadastroCompleto=false)
app.post("/api/auth/completar-cadastro", authMiddleware, (req, res) => {
  const u = req.user;
  if (u.cadastroCompleto) return res.status(400).json({ erro: "Cadastro já está completo" });
  if (!req.body.termosAceitos) return res.status(400).json({ erro: "É necessário aceitar os Termos" });
  const v = validarCadastroCompleto(req.body);
  if (!v.ok) return res.status(400).json({ erro: v.erro });
  atualizarUsuario(u.id, { ...v.dados, cadastroCompleto: true });
  res.json({ ok: true });
});

// ── MERCADO PAGO ──────────────────────────────────────────────────────────────
// Configure no ambiente:
// MP_ACCESS_TOKEN=APP_USR-...          (obrigatório)
// MP_WEBHOOK_SECRET=seu_secret          (obrigatório p/ segurança do webhook)
// BASE_URL=https://seu-dominio.com      (sem / no final)

const MP_API = "https://api.mercadopago.com";
function mpBaseUrl() { return process.env.BASE_URL || "https://chat.movebusiness.com.br"; }
async function mpFetch(path, opts = {}) {
  const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
  if (!MP_TOKEN) throw new Error("MP_ACCESS_TOKEN não configurado");
  const resp = await fetch(MP_API + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${MP_TOKEN}`,
      ...(opts.headers || {})
    }
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`MP ${path} ${resp.status}: ${JSON.stringify(data)}`);
  return data;
}

// Cria assinatura recorrente (preapproval) — mensal (frequency 1) ou anual (frequency 12)
app.post("/api/pagamento/criar", async (req, res) => {
  const { userId, plano, ciclo } = req.body;
  const user = lerUsuario(userId);
  if (!user) return res.status(404).json({ erro: "Usuário não encontrado" });
  const planoInfo = PLANOS[plano];
  if (!planoInfo) return res.status(400).json({ erro: "Plano inválido" });
  const cicloNorm = ciclo === "anual" ? "anual" : "mensal";
  const preco = precoDo(plano, cicloNorm);
  if (!preco) return res.status(400).json({ erro: "Preço inválido" });

  if (!process.env.MP_ACCESS_TOKEN) return res.status(500).json({ erro: "Pagamento não configurado. Contate o suporte." });

  try {
    const base = mpBaseUrl();
    const data = await mpFetch("/preapproval", {
      method: "POST",
      body: JSON.stringify({
        reason: `ChatMOVE ${planoInfo.nome} (${cicloNorm === "anual" ? "Anual" : "Mensal"})`,
        external_reference: `${userId}|${plano}|${cicloNorm}`,
        payer_email: user.email,
        back_url: `${base}/login.html?ativado=1`,
        auto_recurring: {
          frequency: cicloNorm === "anual" ? 12 : 1,
          frequency_type: "months",
          transaction_amount: preco / 100,
          currency_id: "BRL"
        },
        status: "pending"
      })
    });
    atualizarUsuario(userId, { assinaturaId: data.id, plano, ciclo: cicloNorm });
    res.json({ ok: true, checkoutUrl: data.init_point, assinaturaId: data.id });
  } catch (e) {
    console.error("MP criar preapproval:", e.message);
    res.status(500).json({ erro: "Erro ao criar assinatura" });
  }
});

// Valida assinatura HMAC do webhook (esquema oficial do Mercado Pago).
// Header x-signature: "ts=UNIXTS,v1=HMAC_HEX" · manifest: "id:DATA_ID;request-id:REQ_ID;ts:TS;"
function validarAssinaturaMP(req) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return false;
  const sigHeader = req.headers["x-signature"];
  const requestId = req.headers["x-request-id"];
  const dataId = req.query["data.id"] || req.body?.data?.id;
  if (!sigHeader || !requestId || !dataId) return false;
  const parts = Object.fromEntries(String(sigHeader).split(",").map(p => p.trim().split("=")));
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${parts.ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  try { return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1)); }
  catch { return false; }
}

function proximoVencimentoFrom(ciclo, base) {
  const d = new Date(base || Date.now());
  if (ciclo === "anual") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

app.post("/api/pagamento/webhook", async (req, res) => {
  // Em produção só aceita com assinatura válida. Rejeita silenciosamente requisições forjadas.
  if (!validarAssinaturaMP(req)) {
    console.warn("Webhook MP: assinatura inválida", { ip: req.ip, headers: { sig: req.headers["x-signature"], reqId: req.headers["x-request-id"] } });
    return res.status(401).send("invalid signature");
  }
  res.status(200).send("OK");

  try {
    const type = req.body.type || req.query.type;
    const id = req.body?.data?.id || req.query["data.id"];
    if (!type || !id) return;

    // 1) Evento de assinatura (preapproval) — ativa/atualiza/cancela conta
    if (type === "subscription_preapproval" || type === "preapproval") {
      const sub = await mpFetch(`/preapproval/${id}`);
      const [userId, plano, ciclo] = (sub.external_reference || "").split("|");
      if (!userId) return;
      if (sub.status === "authorized") {
        atualizarUsuario(userId, {
          ativo: true, plano, ciclo: ciclo || "mensal",
          assinaturaId: sub.id,
          ativadoEm: new Date().toISOString(),
          proximoVencimento: proximoVencimentoFrom(ciclo, sub.date_created)
        });
        console.log(`✅ Assinatura autorizada · user=${userId} plano=${plano} ciclo=${ciclo}`);
      } else if (sub.status === "cancelled" || sub.status === "paused") {
        atualizarUsuario(userId, { ativo: false, assinaturaStatus: sub.status });
        console.log(`⚠️  Assinatura ${sub.status} · user=${userId}`);
      }
      return;
    }

    // 2) Cobrança recorrente (renovação) — estende o vencimento ou suspende em caso de falha
    if (type === "subscription_authorized_payment" || type === "authorized_payment") {
      const pay = await mpFetch(`/authorized_payments/${id}`);
      const subId = pay.preapproval_id;
      if (!subId) return;
      const users = lerUsuarios();
      const user = users.find(u => u.assinaturaId === subId);
      if (!user) return;
      if (pay.status === "approved") {
        atualizarUsuario(user.id, {
          ativo: true,
          proximoVencimento: proximoVencimentoFrom(user.ciclo, pay.date_created)
        });
        console.log(`💰 Renovação aprovada · user=${user.id}`);
      } else if (pay.status === "rejected" || pay.status === "cancelled") {
        atualizarUsuario(user.id, { ativo: false, assinaturaStatus: "falha_pagamento" });
        console.log(`❌ Renovação rejeitada · user=${user.id}`);
      }
      return;
    }

    // 3) Pagamento avulso (usado no upgrade anual com proration) — trata na Parte 2
    if (type === "payment") {
      const pay = await mpFetch(`/v1/payments/${id}`);
      if (pay.status !== "approved") return;
      const ref = String(pay.external_reference || "");
      if (ref.startsWith("upgrade|")) {
        const [, userId, novoPlano] = ref.split("|");
        if (!userId || !novoPlano) return;
        const user = lerUsuario(userId);
        if (!user) return;
        atualizarUsuario(userId, { plano: novoPlano, upgradePendente: null });
        // Atualiza valor da preapproval pro novo plano (pra próximas renovações virem certas)
        if (user.assinaturaId) {
          const novoValor = precoDo(novoPlano, user.ciclo || "mensal");
          try {
            await mpFetch(`/preapproval/${user.assinaturaId}`, {
              method: "PUT",
              body: JSON.stringify({ auto_recurring: { transaction_amount: novoValor / 100, currency_id: "BRL" } })
            });
          } catch (e) { console.error("PUT preapproval após proration:", e.message); }
        }
        console.log(`⬆️  Upgrade (proration) confirmado · user=${userId} → ${novoPlano}`);
      }
      return;
    }
  } catch (e) {
    console.error("Webhook erro:", e.message);
  }
});

// ── GESTÃO DE ASSINATURA ──────────────────────────────────────────────────────

// Info da assinatura do usuário logado
app.get("/api/assinatura", authMiddleware, (req, res) => {
  const u = req.user;
  const planoInfo = PLANOS[u.plano] || PLANOS.basico;
  res.json({
    plano: u.plano,
    planoNome: planoInfo.nome,
    ciclo: u.ciclo || "mensal",
    ativo: !!u.ativo,
    status: u.assinaturaStatus || (u.ativo ? "authorized" : "pending"),
    proximoVencimento: u.proximoVencimento || null,
    canceladoEm: u.canceladoEm || null,
    upgradePendente: u.upgradePendente || null,
    precoAtual: precoDo(u.plano, u.ciclo || "mensal"),
    planos: Object.fromEntries(Object.entries(PLANOS).filter(([k]) => k !== "owner").map(([k, v]) => [k, {
      nome: v.nome, precoMensal: v.precoMensal, precoAnual: v.precoAnual,
      limiteEnviosDia: v.limiteEnviosDia, contasWhatsApp: v.contasWhatsApp,
      agendamento: v.agendamento, recorrente: v.recorrente, descricao: v.descricao
    }]))
  });
});

// Upgrade/downgrade dentro do mesmo ciclo
app.post("/api/assinatura/upgrade", authMiddleware, async (req, res) => {
  const u = req.user;
  const { plano: novoPlano } = req.body;
  if (!PLANOS[novoPlano] || novoPlano === "owner") return res.status(400).json({ erro: "Plano inválido" });
  if (novoPlano === u.plano) return res.status(400).json({ erro: "Você já está neste plano" });
  if (!u.assinaturaId) return res.status(400).json({ erro: "Nenhuma assinatura ativa" });
  if (!u.ativo) return res.status(400).json({ erro: "Ative seu plano antes de fazer upgrade" });

  const ciclo = u.ciclo || "mensal";
  const precoNovo = precoDo(novoPlano, ciclo);
  const precoAtual = precoDo(u.plano, ciclo);
  const ehUpgrade = precoNovo > precoAtual;

  // Mensal (qualquer direção) OU anual que seja downgrade: só atualiza o valor no MP, novo preço entra no próximo ciclo
  if (ciclo === "mensal" || !ehUpgrade) {
    try {
      await mpFetch(`/preapproval/${u.assinaturaId}`, {
        method: "PUT",
        body: JSON.stringify({ auto_recurring: { transaction_amount: precoNovo / 100, currency_id: "BRL" } })
      });
      atualizarUsuario(u.id, { plano: novoPlano });
      const quando = ciclo === "mensal" ? "próxima cobrança mensal" : "próxima renovação anual";
      return res.json({ ok: true, tipo: "imediato", mensagem: `Plano alterado para ${PLANOS[novoPlano].nome}. Novo valor entra na ${quando}.` });
    } catch (e) {
      console.error("Upgrade simples:", e.message);
      return res.status(500).json({ erro: "Erro ao atualizar assinatura" });
    }
  }

  // Upgrade anual com proration: cobra a diferença proporcional aos dias restantes
  if (!u.proximoVencimento) return res.status(400).json({ erro: "Vencimento não disponível. Tente novamente em alguns minutos." });
  const agora = Date.now();
  const diasRestantes = Math.max(1, Math.ceil((new Date(u.proximoVencimento) - agora) / 86400000));
  const diferenca = precoNovo - precoAtual;
  const prorataCents = Math.max(100, Math.round((diferenca * diasRestantes) / 365));

  try {
    const base = mpBaseUrl();
    const pref = await mpFetch("/checkout/preferences", {
      method: "POST",
      body: JSON.stringify({
        items: [{
          title: `ChatMOVE — Upgrade para ${PLANOS[novoPlano].nome} (${diasRestantes} dias restantes)`,
          unit_price: prorataCents / 100,
          quantity: 1,
          currency_id: "BRL"
        }],
        payer: { email: u.email },
        external_reference: `upgrade|${u.id}|${novoPlano}`,
        back_urls: {
          success: `${base}/chatmove.html?upgrade=ok`,
          failure: `${base}/chatmove.html?upgrade=erro`,
          pending: `${base}/chatmove.html?upgrade=pendente`
        },
        auto_return: "approved",
        notification_url: `${base}/api/pagamento/webhook`
      })
    });
    atualizarUsuario(u.id, { upgradePendente: { plano: novoPlano, valor: prorataCents, criadoEm: new Date().toISOString() } });
    res.json({ ok: true, tipo: "proration", checkoutUrl: pref.init_point, valor: prorataCents, diasRestantes });
  } catch (e) {
    console.error("Upgrade proration:", e.message);
    res.status(500).json({ erro: "Erro ao gerar cobrança da diferença" });
  }
});

// Cancelar assinatura (mantém acesso até fim do período pago)
app.post("/api/assinatura/cancelar", authMiddleware, async (req, res) => {
  const u = req.user;
  if (!u.assinaturaId) return res.status(400).json({ erro: "Nenhuma assinatura ativa" });
  if (u.assinaturaStatus === "cancelled") return res.status(400).json({ erro: "Assinatura já cancelada" });

  try {
    await mpFetch(`/preapproval/${u.assinaturaId}`, {
      method: "PUT",
      body: JSON.stringify({ status: "cancelled" })
    });
    atualizarUsuario(u.id, { assinaturaStatus: "cancelled", canceladoEm: new Date().toISOString() });
    const ateQuando = u.proximoVencimento ? new Date(u.proximoVencimento).toLocaleDateString("pt-BR") : "fim do período atual";
    res.json({ ok: true, mensagem: `Assinatura cancelada. Você mantém acesso até ${ateQuando}.` });
  } catch (e) {
    console.error("Cancelar:", e.message);
    res.status(500).json({ erro: "Erro ao cancelar assinatura" });
  }
});

// Trocar ciclo (mensal↔anual) — V1 simples: cancela a atual e gera link pra nova
app.post("/api/assinatura/trocar-ciclo", authMiddleware, async (req, res) => {
  const u = req.user;
  const novoCiclo = req.body.ciclo === "anual" ? "anual" : "mensal";
  const cicloAtual = u.ciclo || "mensal";
  if (novoCiclo === cicloAtual) return res.status(400).json({ erro: "Você já está neste ciclo" });
  if (!u.assinaturaId) return res.status(400).json({ erro: "Nenhuma assinatura ativa" });

  try {
    // 1) Cancela a assinatura atual (mantém acesso até fim do período já pago)
    await mpFetch(`/preapproval/${u.assinaturaId}`, {
      method: "PUT",
      body: JSON.stringify({ status: "cancelled" })
    });

    // 2) Cria nova preapproval no ciclo desejado
    const planoInfo = PLANOS[u.plano];
    const preco = precoDo(u.plano, novoCiclo);
    const base = mpBaseUrl();
    const nova = await mpFetch("/preapproval", {
      method: "POST",
      body: JSON.stringify({
        reason: `ChatMOVE ${planoInfo.nome} (${novoCiclo === "anual" ? "Anual" : "Mensal"})`,
        external_reference: `${u.id}|${u.plano}|${novoCiclo}`,
        payer_email: u.email,
        back_url: `${base}/chatmove.html?ciclo=ok`,
        auto_recurring: {
          frequency: novoCiclo === "anual" ? 12 : 1,
          frequency_type: "months",
          transaction_amount: preco / 100,
          currency_id: "BRL"
        },
        status: "pending"
      })
    });

    // Preserva assinatura antiga em histórico e aponta pra nova
    atualizarUsuario(u.id, {
      assinaturaAnteriorId: u.assinaturaId,
      assinaturaId: nova.id,
      ciclo: novoCiclo,
      assinaturaStatus: "aguardando_autorizacao"
    });

    res.json({
      ok: true,
      checkoutUrl: nova.init_point,
      mensagem: `Autorize a nova assinatura ${novoCiclo}. Você mantém acesso ${cicloAtual} até o fim do período pago.`
    });
  } catch (e) {
    console.error("Trocar ciclo:", e.message);
    res.status(500).json({ erro: "Erro ao trocar ciclo de cobrança" });
  }
});

// ── LIMITES ───────────────────────────────────────────────────────────────────
function verificarLimite(userId) {
  const user  = lerUsuario(userId);
  if (!user) return { ok: false, erro: "Usuário não encontrado" };
  const plano = PLANOS[user.plano] || PLANOS.basico;
  // Owner e admin não têm limite
  if (user.admin || user.plano === "owner") return { ok: true, restantes: 999999 };
  const hoje  = new Date().toDateString();
  if (user.ultimoEnvioData !== hoje) {
    atualizarUsuario(userId, { enviosHoje: 0, ultimoEnvioData: hoje });
    return { ok: true, restantes: plano.limiteEnviosDia };
  }
  const restantes = plano.limiteEnviosDia - (user.enviosHoje || 0);
  if (restantes <= 0) return { ok: false, erro: `Limite do plano ${plano.nome} atingido (${plano.limiteEnviosDia}/dia). Seus contatos restantes serão enviados amanhã.` };
  return { ok: true, restantes };
}
function contarEnvio(userId, quantidade) {
  const user = lerUsuario(userId);
  if (!user) return;
  const hoje = new Date().toDateString();
  const atual = user.ultimoEnvioData === hoje ? (user.enviosHoje || 0) : 0;
  atualizarUsuario(userId, { enviosHoje: atual + quantidade, ultimoEnvioData: hoje });
}

// ── APIs do ChatMOVE (multi-tenant) ───────────────────────────────────────────
// Todas as rotas abaixo requerem auth e usam dados isolados por userId

app.get("/api/contas",     authMiddleware, (req, res) => res.json(lerUser(req.userId, "contas.json", [])));
app.post("/api/contas",    authMiddleware, (req, res) => {
  const { nome, numero } = req.body;
  if (!nome) return res.status(400).json({ erro: "Nome obrigatório" });
  const plano  = PLANOS[req.user.plano] || PLANOS.basico;
  const contas = lerUser(req.userId, "contas.json", []);
  if (!req.user.admin && contas.length >= plano.contasWhatsApp) return res.status(400).json({ erro: `Plano ${plano.nome} permite até ${plano.contasWhatsApp} conta(s)` });
  const id = "conta_" + Date.now();
  contas.push({ id, nome, numero: numero || "", criadaEm: new Date().toISOString() });
  salvarUser(req.userId, "contas.json", contas);
  res.json({ ok: true, id });
});
app.delete("/api/contas/:id", authMiddleware, (req, res) => {
  salvarUser(req.userId, "contas.json", lerUser(req.userId, "contas.json", []).filter(c => c.id !== req.params.id));
  const dir = path.join(userDir(req.userId), ".wwebjs_auth_" + req.params.id);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  res.json({ ok: true });
});

app.get("/api/listas",     authMiddleware, (req, res) => res.json(lerUser(req.userId, "listas.json", [])));
app.post("/api/listas",    authMiddleware, (req, res) => {
  const { nome, contatos } = req.body;
  if (!nome) return res.status(400).json({ erro: "Nome obrigatório" });
  const listas = lerUser(req.userId, "listas.json", []);
  const id = "lista_" + Date.now();
  listas.push({ id, nome, total: (contatos||[]).length, contatos: contatos||[], criadaEm: new Date().toISOString() });
  salvarUser(req.userId, "listas.json", listas);
  res.json({ ok: true, id });
});
app.delete("/api/listas/:id", authMiddleware, (req, res) => {
  salvarUser(req.userId, "listas.json", lerUser(req.userId, "listas.json", []).filter(l => l.id !== req.params.id));
  res.json({ ok: true });
});

app.get("/api/blacklist",  authMiddleware, (req, res) => res.json(lerUser(req.userId, "blacklist.json", [])));
app.post("/api/blacklist", authMiddleware, (req, res) => {
  const { numero, motivo } = req.body;
  if (!numero) return res.status(400).json({ erro: "Número obrigatório" });
  const bl = lerUser(req.userId, "blacklist.json", []);
  const num = String(numero).replace(/\D/g, "");
  if (!bl.find(b => b.numero === num)) bl.push({ numero: num, motivo: motivo||"", em: new Date().toISOString() });
  salvarUser(req.userId, "blacklist.json", bl);
  res.json({ ok: true });
});
app.delete("/api/blacklist/:numero", authMiddleware, (req, res) => {
  salvarUser(req.userId, "blacklist.json", lerUser(req.userId, "blacklist.json", []).filter(b => b.numero !== req.params.numero));
  res.json({ ok: true });
});

app.get("/api/historico",  authMiddleware, (req, res) => res.json(lerUser(req.userId, "historico.json", [])));
app.delete("/api/historico/:id", authMiddleware, (req, res) => {
  salvarUser(req.userId, "historico.json", lerUser(req.userId, "historico.json", []).filter(h => h.id !== req.params.id));
  res.json({ ok: true });
});

app.get("/api/agendamentos",  authMiddleware, (req, res) => res.json(lerUser(req.userId, "agendamentos.json", [])));
app.post("/api/agendamentos", authMiddleware, (req, res) => {
  const plano = PLANOS[req.user.plano] || PLANOS.basico;
  if (!plano.agendamento) return res.status(403).json({ erro: "Agendamento disponível a partir do plano Premium" });
  const ag = req.body;
  if (ag.tipo === "recurring" && !plano.recorrente && !req.user.admin) return res.status(403).json({ erro: "Agendamento recorrente disponível apenas no plano Pro" });
  if (!ag.nome) return res.status(400).json({ erro: "Nome obrigatório" });
  const ags = lerUser(req.userId, "agendamentos.json", []);
  ag.id = "ag_" + Date.now(); ag.status = "ativo"; ag.criadoEm = new Date().toISOString();
  ags.push(ag);
  salvarUser(req.userId, "agendamentos.json", ags);
  res.json({ ok: true, id: ag.id });
});
app.put("/api/agendamentos/:id", authMiddleware, (req, res) => {
  const plano = PLANOS[req.user.plano] || PLANOS.basico;
  if (!plano.agendamento) return res.status(403).json({ erro: "Agendamento disponível a partir do plano Premium" });
  const patch = req.body;
  if (patch.tipo === "recurring" && !plano.recorrente && !req.user.admin) return res.status(403).json({ erro: "Agendamento recorrente disponível apenas no plano Pro" });
  if (!patch.nome) return res.status(400).json({ erro: "Nome obrigatório" });
  const ags = lerUser(req.userId, "agendamentos.json", []);
  const i = ags.findIndex(a => a.id === req.params.id);
  if (i === -1) return res.status(404).json({ erro: "Agendamento não encontrado" });
  ags[i] = { ...ags[i], ...patch, id: ags[i].id, criadoEm: ags[i].criadoEm, status: "ativo" };
  salvarUser(req.userId, "agendamentos.json", ags);
  res.json({ ok: true });
});
app.delete("/api/agendamentos/:id", authMiddleware, (req, res) => {
  salvarUser(req.userId, "agendamentos.json", lerUser(req.userId, "agendamentos.json", []).filter(a => a.id !== req.params.id));
  res.json({ ok: true });
});
app.post("/api/agendamentos/:id/disparar", authMiddleware, (req, res) => {
  const uid = req.userId;
  if (processos[uid]) return res.status(400).json({ erro: "Disparo em andamento" });
  if (testes[uid])    return res.status(400).json({ erro: "Aguarde o teste finalizar" });
  const ags = lerUser(uid, "agendamentos.json", []);
  const ag = ags.find(a => a.id === req.params.id);
  if (!ag) return res.status(404).json({ erro: "Agendamento não encontrado" });
  if (ag.status !== "ativo") return res.status(400).json({ erro: "Agendamento já executado ou inativo" });
  const r = dispararAgendamento(uid, ag);
  if (!r.ok) return res.status(400).json({ erro: r.erro });
  res.json({ ok: true });
});

app.post("/api/config", authMiddleware, (req, res) => {
  salvarUser(req.userId, "chatmove.config.json", req.body);
  res.json({ ok: true });
});
app.post("/api/csv", authMiddleware, (req, res) => {
  const { conteudo } = req.body;
  if (!conteudo) return res.status(400).json({ erro: "CSV vazio" });
  
  // Contar linhas (excluindo cabeçalho)
  const linhas = conteudo.trim().split("\n").filter(l => l.trim()).length - 1;
  const plano  = PLANOS[req.user.plano] || PLANOS.basico;
  
  fs.writeFileSync(userFile(req.userId, "clientes.csv"), conteudo, "utf8");
  
  res.json({ 
    ok: true, 
    total: linhas,
    limiteEnviosDia: plano.limiteEnviosDia,
    aviso: linhas > plano.limiteEnviosDia 
      ? "Lista com " + linhas + " contatos. Serão enviados " + plano.limiteEnviosDia + " por dia   o sistema continua automaticamente nos próximos dias para os restantes."
      : null
  });
});
app.post("/api/imagem", authMiddleware, (req, res) => {
  const { nome, base64 } = req.body;
  const dir = path.join(userDir(req.userId), "imagens");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, nome), Buffer.from(base64.split(",")[1]||base64, "base64"));
  res.json({ ok: true });
});

// ── PROCESSOS ativos por userId ───────────────────────────────────────────────
const processos   = {}; // userId → processo
const testes      = {}; // userId → processo de teste
const campanhas   = {}; // userId → dados da campanha
const wsClientes  = {}; // userId → Set<ws>

app.post("/api/iniciar", authMiddleware, async (req, res) => {
  const uid = req.userId;
  if (processos[uid]) return res.status(400).json({ erro: "Disparo em andamento" });
  if (testes[uid])    return res.status(400).json({ erro: "Aguarde o teste finalizar" });

  const limite = verificarLimite(uid);
  if (!limite.ok) return res.status(403).json({ erro: limite.erro });

  const { nomeCampanha, contaId } = req.body;
  campanhas[uid] = { enviados: [], erros: [], pulados: [], total: 0, nome: nomeCampanha||"Campanha", contaId };

  const cfg     = lerUser(uid, "chatmove.config.json", {});
  const conta   = contaId ? lerUser(uid, "contas.json", []).find(c => c.id === contaId) : null;
  const authDir = path.join(userDir(uid), conta ? ".wwebjs_auth_" + conta.id : ".wwebjs_auth");

  broadcastUser(uid, { tipo: "log", nivel: "info", msg: "🚀 Iniciando..." });


  processos[uid] = spawn("node", [path.join(ROOT, "disparador2.js")], {
    cwd: ROOT,
    env: {
      ...process.env,
      AUTH_DIR_OVERRIDE:       authDir,
      ARQUIVO_LISTA_OVERRIDE:  userFile(uid, "clientes.csv"),
      CONFIG_OVERRIDE:         userFile(uid, "chatmove.config.json"),
      BLACKLIST_FILE:          userFile(uid, "blacklist.json"),
      IMAGENS_DIR:             path.join(userDir(uid), "imagens"),
      PROGRESS_FILE_OVERRIDE:  userFile(uid, "progress.json"),
      LIMITE_ENVIOS_DIA:       String(limite.restantes)
    }
  });
  iniciarHandlers(uid, processos[uid], new Date());
  res.json({ ok: true, limiteRestante: limite.restantes });
});

app.post("/api/teste", authMiddleware, (req, res) => {
  const uid = req.userId;
  if (processos[uid]) return res.status(400).json({ erro: "Disparo em andamento" });
  if (testes[uid])    return res.status(400).json({ erro: "Teste já em andamento" });
  const { numero, contaId } = req.body;
  if (!numero) return res.status(400).json({ erro: "Número obrigatório" });
  const csvPath = userFile(uid, "clientes_teste.csv");
  fs.writeFileSync(csvPath, `nome,telefone\nTeste,${numero}`, "utf8");
  const conta   = contaId ? lerUser(uid, "contas.json", []).find(c => c.id === contaId) : null;
  const authDir = path.join(userDir(uid), conta ? ".wwebjs_auth_" + conta.id : ".wwebjs_auth");
  const proc = spawn("node", [path.join(ROOT, "disparador2.js")], {
    cwd: ROOT,
    env: {
      ...process.env,
      AUTH_DIR_OVERRIDE:      authDir,
      ARQUIVO_LISTA_OVERRIDE: csvPath,
      CONFIG_OVERRIDE:        userFile(uid, "chatmove.config.json"),
      BLACKLIST_FILE:         userFile(uid, "blacklist.json"),
      IMAGENS_DIR:            path.join(userDir(uid), "imagens"),
      PROGRESS_FILE_OVERRIDE: userFile(uid, "progress_teste.json"),
      LIMITE_ENVIOS_DIA:      "1"
    }
  });
  testes[uid] = proc;
  iniciarTesteHandlers(uid, proc);
  proc.on("close", () => {
    delete testes[uid];
    try { fs.unlinkSync(csvPath); } catch {}
    try { fs.unlinkSync(userFile(uid, "progress_teste.json")); } catch {}
  });
  broadcastUser(uid, { tipo: "log", nivel: "info", msg: `📱 Enviando teste para ${numero}...` });
  res.json({ ok: true });
});

function iniciarTesteHandlers(uid, proc) {
  let buf = "";
  proc.stdout.on("data", d => {
    buf += d.toString();
    const lines = buf.split("\n"); buf = lines.pop();
    for (const linha of lines) {
      const l = linha.trim(); if (!l) continue;
      if (l.startsWith("CHATMOVE_QR:") || l.startsWith("CHATMOVE_EVENT:")) continue;
      if (/^[\s█▄▀■□\u2580-\u259F\[\]─]+$/.test(l)) continue;
      broadcastUser(uid, { tipo: "log", nivel: classificar(l), msg: "[teste] " + l });
    }
  });
  proc.stderr.on("data", d => {
    const t = d.toString().trim();
    if (t && !t.includes("DeprecationWarning")) broadcastUser(uid, { tipo: "log", nivel: "erro", msg: "[teste] " + t.slice(0,200) });
  });
  proc.on("close", code => {
    broadcastUser(uid, { tipo: "teste_concluido", ok: code === 0 });
    broadcastUser(uid, { tipo: "log", nivel: code===0?"ok":"warn", msg: code===0?"✅ Teste concluído":"⚠️ Teste falhou" });
  });
}

app.post("/api/conectar", authMiddleware, (req, res) => {
  const uid = req.userId;
  const { contaId } = req.body;
  const conta   = contaId ? lerUser(uid, "contas.json", []).find(c => c.id === contaId) : null;
  const authDir = path.join(userDir(uid), conta ? ".wwebjs_auth_" + conta.id : ".wwebjs_auth");
  const proc = spawn("node", [path.join(ROOT, "disparador2.js")], {
    cwd: ROOT, env: { ...process.env, AUTH_DIR_OVERRIDE: authDir, CONNECT_ONLY: "true" }
  });
  let buf = "";
  proc.stdout.on("data", d => {
    buf += d.toString();
    const lines = buf.split("\n"); buf = lines.pop();
    for (const l of lines) {
      if (l.startsWith("CHATMOVE_QR:"))     broadcastUser(uid, { tipo: "qr", data: l.replace("CHATMOVE_QR:","").trim() });
      if (l.startsWith("CHATMOVE_EVENT:")) {
        try { const ev = JSON.parse(l.replace("CHATMOVE_EVENT:","").trim()); if (ev.tipo==="autenticado") broadcastUser(uid, { tipo: "autenticado", contaNome: conta?.nome||"Padrão" }); } catch{}
      }
    }
  });
  proc.on("close", () => {});
  res.json({ ok: true });
});

app.post("/api/parar", authMiddleware, (req, res) => {
  const uid = req.userId;
  if (processos[uid]) { processos[uid].kill("SIGTERM"); delete processos[uid]; }
  broadcastUser(uid, { tipo: "parado" });
  res.json({ ok: true });
});
app.post("/api/desconectar", authMiddleware, (req, res) => {
  const uid = req.userId;
  if (processos[uid]) { processos[uid].kill("SIGTERM"); delete processos[uid]; }
  const dir = path.join(userDir(uid), ".wwebjs_auth");
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  broadcastUser(uid, { tipo: "desconectado" });
  res.json({ ok: true });
});
app.post("/api/reset-progress", authMiddleware, (req, res) => {
  const p = userFile(req.userId, "progress.json");
  if (fs.existsSync(p)) fs.unlinkSync(p);
  res.json({ ok: true });
});
app.get("/api/exportar/:tipo", authMiddleware, (req, res) => {
  const uid = req.userId;
  const camp = campanhas[uid] || {};
  let linhas, nome;
  if (req.params.tipo === "enviados") { linhas = ["nome,telefone", ...(camp.enviados||[]).map(c=>`${c.nome},${c.numero}`)]; nome="enviados.csv"; }
  else { linhas = ["nome,telefone,erro", ...(camp.erros||[]).map(c=>`${c.nome},${c.numero},"${c.erro}"`)]; nome="erros.csv"; }
  res.setHeader("Content-Type","text/csv;charset=utf-8");
  res.setHeader("Content-Disposition",`attachment;filename="${nome}"`);
  res.send(linhas.join("\n"));
});

// ── ADMIN ─────────────────────────────────────────────────────────────────────
app.get("/api/admin/usuarios", adminMiddleware, (req, res) => {
  const users = lerUsuarios().map(({ senha, ...u }) => u);
  res.json(users);
});
app.post("/api/admin/usuarios/:id/ativar", adminMiddleware, (req, res) => {
  const user = atualizarUsuario(req.params.id, { ativo: true });
  res.json({ ok: true, user });
});
app.post("/api/admin/usuarios/:id/suspender", adminMiddleware, (req, res) => {
  atualizarUsuario(req.params.id, { ativo: false });
  res.json({ ok: true });
});
app.post("/api/admin/usuarios/:id/plano", adminMiddleware, (req, res) => {
  const { plano } = req.body;
  if (!PLANOS[plano]) return res.status(400).json({ erro: "Plano inválido" });
  atualizarUsuario(req.params.id, { plano, ativo: true });
  res.json({ ok: true });
});
app.delete("/api/admin/usuarios/:id", adminMiddleware, async (req, res) => {
  const id = req.params.id;
  const users = lerUsuarios();
  const alvo = users.find(u => u.id === id);
  if (!alvo) return res.status(404).json({ erro: "Usuário não encontrado" });
  if (alvo.id === req.userId) return res.status(400).json({ erro: "Você não pode excluir sua própria conta" });
  // Cancela preapproval no MP (se houver)
  if (alvo.assinaturaId && process.env.MP_ACCESS_TOKEN) {
    try { await mpFetch(`/preapproval/${alvo.assinaturaId}`, { method: "PUT", body: JSON.stringify({ status: "cancelled" }) }); }
    catch (e) { console.warn("Cancelar preapproval ao excluir:", e.message); }
  }
  // Remove usuário do users.json
  salvarUsuarios(users.filter(u => u.id !== id));
  // Remove pasta de dados do usuário (sessões WhatsApp, listas, histórico, etc.)
  const dir = userDir(id);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  console.log(`🗑️  Usuário excluído · id=${id} email=${alvo.email}`);
  res.json({ ok: true });
});
app.get("/api/admin/stats", adminMiddleware, (req, res) => {
  const users  = lerUsuarios();
  const ativos = users.filter(u => u.ativo);
  const basico = ativos.filter(u => u.plano === "basico").length;
  const prem   = ativos.filter(u => u.plano === "premium").length;
  const mrr    = basico * 4990 + prem * 9990;
  res.json({ total: users.length, ativos: ativos.length, basico, premium: prem, mrr_centavos: mrr });
});

// Criar primeiro admin (só funciona se não houver admin ainda)
app.post("/api/admin/setup", (req, res) => {
  try {
    const users = lerUsuarios();
    if (users.some(u => u.admin)) return res.status(400).json({ erro: "Admin já existe" });
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ erro: "Preencha nome, email e senha" });
    const id = "admin_" + Date.now();
    const novoAdmin = { id, nome, email: email.toLowerCase().trim(), senha: hashPassword(senha), admin: true, ativo: true, plano: "premium", criadoEm: new Date().toISOString() };
    users.push(novoAdmin);
    salvarUsuarios(users);
    console.log("✅ Admin criado:", email);
    res.json({ ok: true, email: email.toLowerCase().trim() });
  } catch(e) {
    console.error("Erro setup:", e);
    res.status(500).json({ erro: e.message });
  }
});

// Página de setup visual
app.get("/logout", (req, res) => {
  res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Saindo...</title></head>
<body>
<script>
localStorage.clear();
sessionStorage.clear();
document.cookie.split(";").forEach(function(c){document.cookie=c.replace(/^ +/,"").replace(/=.*/,"=;expires="+new Date().toUTCString()+";path=/");});
window.location.href = '/login.html';
</script>
<p>Saindo...</p>
</body></html>`);
});

app.get("/setup", (req, res) => {
  const users = lerUsuarios();
  if (users.some(u => u.admin)) {
    res.redirect("/login.html");
    return;
  }
  res.send(`<!DOCTYPE html>
<html lang="pt-BR" data-theme="dark">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Setup   ChatMOVE</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
[data-theme="dark"]{--bg:#1c1c1e;--surface:#252527;--border:rgba(255,255,255,.09);--border2:rgba(255,255,255,.13);--text:#f5f5f7;--text2:rgba(245,245,247,.64);--text3:rgba(245,245,247,.36);--gold:#c6a96b;--gold2:#d9be86;--gold-bg:rgba(198,169,107,.09);--red:#ff5f57;--green:#30d158;--sh:0 2px 12px rgba(0,0,0,.35),0 12px 32px rgba(0,0,0,.22)}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;-webkit-font-smoothing:antialiased}
.glow{position:fixed;top:-200px;left:50%;transform:translateX(-50%);width:600px;height:600px;border-radius:50%;background:radial-gradient(ellipse,rgba(198,169,107,.08) 0%,transparent 70%);pointer-events:none}
.card{background:var(--surface);border:1px solid var(--border2);border-radius:20px;padding:44px 40px;width:100%;max-width:400px;position:relative;z-index:1;box-shadow:var(--sh)}
.card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent 10%,var(--gold) 40%,var(--gold2) 60%,transparent 90%);opacity:.6;border-radius:20px 20px 0 0}
.logo{text-align:center;margin-bottom:28px;font-size:20px;font-weight:800;color:var(--gold)}
h2{font-size:20px;font-weight:800;letter-spacing:-.03em;margin-bottom:4px}
p{font-size:13px;color:var(--text2);margin-bottom:24px;line-height:1.5}
.fg{margin-bottom:16px}
label{display:block;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text3);margin-bottom:7px}
input{width:100%;background:#2c2c2e;border:1px solid var(--border);border-radius:11px;color:var(--text);font-family:inherit;font-size:14px;padding:12px 14px;outline:none;transition:border-color .15s,box-shadow .15s}
input:focus{border-color:var(--gold);box-shadow:0 0 0 3px var(--gold-bg)}
.btn{width:100%;height:44px;border-radius:999px;border:none;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;background:var(--gold);color:#111;box-shadow:0 4px 14px rgba(198,169,107,.3);transition:all .15s;margin-top:4px}
.btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(198,169,107,.45)}
.btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
.msg{padding:11px 14px;border-radius:10px;font-size:13px;font-weight:500;margin-bottom:16px;display:none}
.msg.ok{background:rgba(48,209,88,.08);border:1px solid rgba(48,209,88,.2);color:var(--green)}
.msg.erro{background:rgba(255,95,87,.08);border:1px solid rgba(255,95,87,.2);color:var(--red)}
</style>
</head>
<body>
<div class="glow"></div>
<div class="card">
  <div class="logo">ChatMOVE</div>
  <h2>Configuração inicial</h2>
  <p>Crie a conta de administrador para começar.</p>
  <div id="msg" class="msg"></div>
  <div class="fg"><label>Seu nome</label><input id="nome" type="text" placeholder="Lucas"></div>
  <div class="fg"><label>E-mail</label><input id="email" type="email" placeholder="lucas@email.com"></div>
  <div class="fg"><label>Senha</label><input id="senha" type="password" placeholder="Mínimo 6 caracteres"></div>
  <button class="btn" id="btn" onclick="criar()">Criar conta admin</button>
</div>
<script>
async function criar(){
  var n=document.getElementById('nome').value.trim(),e=document.getElementById('email').value.trim(),s=document.getElementById('senha').value;
  if(!n||!e||!s){show('Preencha todos os campos','erro');return;}
  if(s.length<6){show('Senha precisa ter ao menos 6 caracteres','erro');return;}
  var btn=document.getElementById('btn');btn.disabled=true;btn.textContent='Criando...';
  try{
    var r=await fetch('/api/admin/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nome:n,email:e,senha:s})});
    var d=await r.json();
    if(!r.ok){show(d.erro||'Erro','erro');btn.disabled=false;btn.textContent='Criar conta admin';return;}
    show('✅ Admin criado! Redirecionando para o login...','ok');
    setTimeout(function(){window.location.href='/login.html';},2000);
  }catch(err){show('Erro de conexão','erro');btn.disabled=false;btn.textContent='Criar conta admin';}
}
function show(t,c){var m=document.getElementById('msg');m.textContent=t;m.className='msg '+c;m.style.display='block';}
document.addEventListener('keydown',function(e){if(e.key==='Enter')criar();});
</script>
</body>
</html>`);
});

// Rota para o admin virar owner de qualquer conta (útil para testes)
app.post("/api/admin/usuarios/:id/owner", adminMiddleware, (req, res) => {
  atualizarUsuario(req.params.id, { plano: "owner", ativo: true });
  res.json({ ok: true });
});

// ── HANDLERS de processo ──────────────────────────────────────────────────────
function iniciarHandlers(uid, proc, iniciadoEm) {
  let buf = "";
  proc.stdout.on("data", d => {
    buf += d.toString();
    const lines = buf.split("\n"); buf = lines.pop();
    for (const linha of lines) {
      const l = linha.trim(); if (!l) continue;
      if (l.startsWith("CHATMOVE_QR:"))     { broadcastUser(uid, { tipo: "qr", data: l.replace("CHATMOVE_QR:","").trim() }); continue; }
      if (l.startsWith("CHATMOVE_EVENT:"))  { try { processarEvento(uid, JSON.parse(l.replace("CHATMOVE_EVENT:","").trim())); } catch{} continue; }
      if (/^[\s█▄▀■□\u2580-\u259F\[\]─]+$/.test(l)) continue;
      broadcastUser(uid, { tipo: "log", nivel: classificar(l), msg: l });
    }
  });
  proc.stderr.on("data", d => {
    const t = d.toString().trim();
    if (t && !t.includes("DeprecationWarning")) broadcastUser(uid, { tipo: "log", nivel: "erro", msg: t.slice(0,200) });
  });
  proc.on("close", code => {
    delete processos[uid];
    const camp = campanhas[uid] || {};
    if (camp.nome) {
      contarEnvio(uid, camp.enviados.length);
      const hist = lerUser(uid, "historico.json", []);
      const conta = camp.contaId ? lerUser(uid, "contas.json", []).find(c => c.id === camp.contaId) : null;
      const duracaoMin = Math.round((Date.now() - iniciadoEm.getTime()) / 60000);
      hist.unshift({ id: "h_"+Date.now(), nome: camp.nome, conta: conta?.nome||"Padrão", contaId: camp.contaId,
        dataEnvio: iniciadoEm.toISOString(), enviados: camp.enviados.length, falhas: camp.erros.length, total: camp.total });
      salvarUser(uid, "historico.json", hist.slice(0, 100));
    }
    broadcastUser(uid, { tipo: "concluido", codigo: code });
    broadcastUser(uid, { tipo: "log", nivel: code===0?"ok":"warn", msg: code===0?"✅ Concluído!":"⚠️ Encerrado" });
  });
}
function processarEvento(uid, ev) {
  const camp = campanhas[uid]; if (!camp) return;
  if (ev.tipo==="total")     { camp.total=ev.count; broadcastUser(uid,{tipo:"total",count:ev.count}); }
  if (ev.tipo==="enviado")   { camp.enviados.push({nome:ev.nome,numero:ev.numero}); broadcastUser(uid,{tipo:"enviado",nome:ev.nome,numero:ev.numero,total:camp.enviados.length}); }
  if (ev.tipo==="erro_envio"){ camp.erros.push({nome:ev.nome,numero:ev.numero,erro:ev.erro}); broadcastUser(uid,{tipo:"erro_envio",nome:ev.nome,numero:ev.numero,erro:ev.erro,total:camp.erros.length}); }
  if (ev.tipo==="pulado")    { camp.pulados.push({nome:ev.nome,numero:ev.numero}); broadcastUser(uid,{tipo:"pulado",nome:ev.nome,numero:ev.numero,total:camp.pulados?.length||0}); }
  if (ev.tipo==="finalizado"){ broadcastUser(uid,{tipo:"finalizado",enviados:ev.enviados,erros:ev.invalidos,pulados:ev.pulados}); }
}

// ── AGENDADOR ─────────────────────────────────────────────────────────────────
function dispararAgendamento(uid, ag) {
  if (processos[uid]) return { ok: false, erro: "Disparo em andamento" };
  if (ag.tipo === "once") {
    const all = lerUser(uid, "agendamentos.json", []);
    const i = all.findIndex(a => a.id === ag.id);
    if (i !== -1) { all[i].status = "executado"; salvarUser(uid, "agendamentos.json", all); }
  }
  if (ag.config) salvarUser(uid, "chatmove.config.json", ag.config);
  if (ag.listaId) {
    const lista = lerUser(uid, "listas.json", []).find(l => l.id === ag.listaId);
    if (lista?.contatos?.length) fs.writeFileSync(userFile(uid, "clientes.csv"), "nome,telefone\n" + lista.contatos.map(c => `${c.nome},${c.phone}`).join("\n"), "utf8");
  }
  const conta = ag.contaId ? lerUser(uid, "contas.json", []).find(c => c.id === ag.contaId) : null;
  const authDir = path.join(userDir(uid), conta ? ".wwebjs_auth_" + conta.id : ".wwebjs_auth");
  campanhas[uid] = { enviados: [], erros: [], pulados: [], total: 0, nome: ag.nome, contaId: ag.contaId };
  processos[uid] = spawn("node", [path.join(ROOT, "disparador2.js")], { cwd: ROOT, env: { ...process.env, AUTH_DIR_OVERRIDE: authDir, ARQUIVO_LISTA_OVERRIDE: userFile(uid, "clientes.csv"), CONFIG_OVERRIDE: userFile(uid, "chatmove.config.json"), BLACKLIST_FILE: userFile(uid, "blacklist.json") } });
  iniciarHandlers(uid, processos[uid], new Date());
  return { ok: true };
}

setInterval(() => {
  const users = lerUsuarios().filter(u => u.ativo);
  const agora = new Date();
  const hm = `${String(agora.getHours()).padStart(2,"0")}:${String(agora.getMinutes()).padStart(2,"0")}`;
  const dia = agora.getDay();
  users.forEach(user => {
    if (processos[user.id]) return;
    const ags = lerUser(user.id, "agendamentos.json", []);
    ags.forEach(ag => {
      if (ag.status !== "ativo") return;
      let dispara = false;
      if (ag.tipo==="once"      && Math.abs(agora-new Date(ag.dataHora))<=60000 && agora>=new Date(ag.dataHora)) dispara=true;
      if (ag.tipo==="recurring" && (ag.diasSemana||[]).includes(dia) && ag.horario===hm) dispara=true;
      if (!dispara) return;
      dispararAgendamento(user.id, ag);
    });
  });
}, 60000);

// ── WebSocket com autenticação ─────────────────────────────────────────────────
wss.on("connection", (ws, req) => {
  const url = new URL(req.url, "http://localhost");
  const token = url.searchParams.get("token");
  const payload = jwtVerify(token);
  if (!payload) { ws.close(); return; }
  const uid = payload.userId;
  if (!wsClientes[uid]) wsClientes[uid] = new Set();
  wsClientes[uid].add(ws);
  ws.send(JSON.stringify({ tipo: "conectado" }));
  ws.on("close", () => wsClientes[uid]?.delete(ws));
});
function broadcastUser(uid, obj) {
  const msg = JSON.stringify(obj);
  (wsClientes[uid] || new Set()).forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(msg); });
}
function classificar(l) {
  l = l.toLowerCase();
  if (l.includes("✅")) return "ok"; if (l.includes("❌")) return "erro";
  if (l.includes("⏸")||l.includes("⚠")) return "warn"; return "info";
}

server.listen(PORT, () => console.log(`\n✅ ChatMOVE SaaS → http://localhost:${PORT}\n`));
