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

// Confia em 1 nível de proxy (Nginx) pra que req.ip devolva o IP real do cliente
app.set("trust proxy", 1);

app.use(express.json({ limit: "50mb" }));

// ── Helpers de auditoria ─────────────────────────────────────────────────────
function getClientIp(req) {
  return (req.headers["x-forwarded-for"] || "").split(",")[0].trim()
      || req.ip
      || req.connection?.remoteAddress
      || "?";
}
function getClientUa(req) {
  return String(req.headers["user-agent"] || "?").slice(0, 220);
}
// Hash SHA-256 truncado a 16 chars do número E.164 (pra log de destinatários sem guardar raw)
function hashNumero(numero) {
  return crypto.createHash("sha256").update(String(numero)).digest("hex").slice(0, 16);
}
// Guarda entry de auditoria; purga > 90 dias na gravação
const AUDIT_RETENCAO_DIAS = 90;
// Versão do Termo de Responsabilidade do Uso. Incrementar quando o texto mudar,
// forçando novo aceite dos usuários existentes.
const TERMO_USO_VERSAO = 1;
function salvarAuditoria(userId, entry) {
  const lista = lerUser(userId, "audit.json", []);
  lista.unshift(entry);
  const corte = Date.now() - AUDIT_RETENCAO_DIAS * 86400000;
  const filtrada = lista.filter(a => new Date(a.iniciadoEm || a.em || 0).getTime() >= corte);
  salvarUser(userId, "audit.json", filtrada);
}

// ── URLs limpas ───────────────────────────────────────────────────────────────
// Mapeia rotas amigáveis para os arquivos HTML
const rotasLimpas = {
  "/":         "landing.html",
  "/login":    "login.html",
  "/registro": "registro.html",
  "/painel":   "chatmove.html",
  "/admin":    "admin.html",
  "/termos":   "termos.html"
};
Object.entries(rotasLimpas).forEach(([rota, arquivo]) => {
  app.get(rota, (req, res) => res.sendFile(path.join(ROOT, arquivo)));
});
// Redirect permanente dos .html antigos para as URLs limpas (SEO + hygiene)
const mapaRedirect = { "/landing.html": "/", "/login.html": "/login", "/registro.html": "/registro", "/chatmove.html": "/painel", "/admin.html": "/admin", "/termos.html": "/termos" };
Object.entries(mapaRedirect).forEach(([de, para]) => {
  app.get(de, (req, res) => {
    const qs = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
    res.redirect(301, para + qs);
  });
});

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
// Preços em centavos. Anual = mensal × 10 (2 meses grátis). Trial: 7 dias.
const TRIAL_DIAS = 7;
const PLANOS = {
  basico: {
    id: "basico", nome: "Básico",
    precoMensal: 3990, precoAnual: 39900,
    limiteEnviosDia: 100,
    contasWhatsApp: 1,
    agendamento: false,
    recorrente: false,
    descricao: "Para restaurantes começando no WhatsApp marketing",
    features: [
      "100 envios por dia",
      "1 número de WhatsApp conectado",
      "Listas e contatos ilimitados",
      "Mensagens com nome do cliente ({nome})",
      "Envio de imagem + texto em campanhas"
    ]
  },
  premium: {
    id: "premium", nome: "Premium",
    precoMensal: 7990, precoAnual: 79900,
    limiteEnviosDia: 500,
    contasWhatsApp: 2,
    agendamento: true,
    recorrente: false,
    descricao: "Para restaurantes com base ativa de clientes",
    features: [
      "500 envios por dia",
      "Até 2 números de WhatsApp",
      "Agendamento de campanhas",
      "Tudo que o Básico oferece"
    ]
  },
  pro: {
    id: "pro", nome: "Pro",
    precoMensal: 14990, precoAnual: 149900,
    limiteEnviosDia: 1000,
    contasWhatsApp: 5,
    agendamento: true,
    recorrente: true,
    descricao: "Para franquias e redes de restaurantes",
    features: [
      "1.000 envios por dia",
      "Até 5 números de WhatsApp",
      "Agendamento recorrente (ex: toda sexta às 18h)",
      "Tudo que o Premium oferece"
    ]
  },
  // Plano Agência: exclusivo B2B, não aparece no pricing público. Liberado pelo admin
  // via /api/admin/usuarios/:id/plano após contato comercial via WhatsApp.
  agencia: {
    id: "agencia", nome: "Agência",
    precoMensal: 0, precoAnual: 0, // valor negociado caso a caso pelo admin
    limiteEnviosDia: 5000,
    contasWhatsApp: 15,
    agendamento: true,
    recorrente: true,
    descricao: "Plano exclusivo para agências que operam múltiplos clientes",
    features: [
      "5.000 envios por dia",
      "Até 15 números de WhatsApp conectados",
      "Agendamento pontual e recorrente",
      "Suporte prioritário via WhatsApp",
      "Condições comerciais negociadas caso a caso"
    ],
    oculto: true
  },
  owner: {
    id: "owner", nome: "Owner",
    precoMensal: 0, precoAnual: 0,
    limiteEnviosDia: 999999,
    contasWhatsApp: 999,
    agendamento: true,
    recorrente: true,
    descricao: "Acesso total do proprietário",
    features: [],
    oculto: true
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
  const ip = getClientIp(req);
  const ua = getClientUa(req);
  const agora = new Date().toISOString();
  const user = {
    id, email: email.toLowerCase().trim(),
    senha: hashPassword(senha), plano, ciclo: cicloNorm, ativo: false,
    admin: false, criadoEm: agora,
    enviosHoje: 0, ultimoEnvioData: null,
    assinaturaId: null, proximoVencimento: null,
    cadastroCompleto: true,
    registroIp: ip, registroUa: ua,
    ultimoLoginIp: ip, ultimoLoginUa: ua, ultimoLoginEm: agora,
    ...v.dados
  };
  const users = lerUsuarios();
  users.push(user);
  salvarUsuarios(users);
  salvarAuditoria(id, { id:"aud_"+Date.now(), tipo:"registro", em:agora, ip, ua, iniciadoEm:agora });
  res.json({ ok: true, userId: id, mensagem: "Conta criada. Finalize o pagamento para ativar." });
});

app.post("/api/auth/login", (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: "Preencha e-mail e senha" });
  const user = lerUsuarioPorEmail(email);
  if (!user || user.senha !== hashPassword(senha)) return res.status(401).json({ erro: "E-mail ou senha incorretos" });
  if (!user.ativo && !user.admin) return res.status(403).json({ erro: "Conta pendente de pagamento", pendente: true });
  const ip = getClientIp(req); const ua = getClientUa(req); const agora = new Date().toISOString();
  atualizarUsuario(user.id, { ultimoLoginIp: ip, ultimoLoginUa: ua, ultimoLoginEm: agora });
  salvarAuditoria(user.id, { id:"aud_"+Date.now(), tipo:"login", em:agora, ip, ua, iniciadoEm:agora });
  const token = jwtSign({ userId: user.id, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 });
  res.json({ ok: true, token, user: { id: user.id, nome: user.nome, email: user.email, plano: user.plano, admin: user.admin } });
});

// Config pública (valores seguros de expor no frontend)
app.get("/api/config/public", (req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null });
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  const { senha, ...safe } = req.user;
  res.json({
    ...safe,
    plano_info: PLANOS[req.user.plano] || PLANOS.owner,
    termoUsoVersaoAtual: TERMO_USO_VERSAO,
    termoUsoPendente: !req.user.admin && (!req.user.termoResponsabilidade || req.user.termoResponsabilidade.versao < TERMO_USO_VERSAO)
  });
});

// Aceite explícito do Termo de Responsabilidade do Uso. Registra com IP/UA/timestamp.
app.post("/api/user/aceitar-termo-uso", authMiddleware, (req, res) => {
  const ip = getClientIp(req);
  const ua = getClientUa(req);
  const agora = new Date().toISOString();
  const aceite = { aceitoEm: agora, ip, ua, versao: TERMO_USO_VERSAO, itens: Array.isArray(req.body?.itens) ? req.body.itens : [] };
  atualizarUsuario(req.userId, { termoResponsabilidade: aceite });
  salvarAuditoria(req.userId, {
    id: "aud_" + Date.now(),
    tipo: "termo_uso_aceito",
    em: agora, iniciadoEm: agora,
    ip, ua,
    versaoTermo: TERMO_USO_VERSAO,
    itens: aceite.itens
  });
  res.json({ ok: true, aceitoEm: agora, versao: TERMO_USO_VERSAO });
});

// Encerra worker de conexão e dispatcher do usuário ao sair
app.post("/api/auth/logout", authMiddleware, (req, res) => {
  const uid = req.userId;
  if (conexoes[uid]?.proc) { try { conexoes[uid].proc.kill("SIGTERM"); } catch(_) {} delete conexoes[uid]; }
  if (processos[uid])      { try { processos[uid].kill("SIGTERM"); } catch(_) {} delete processos[uid]; }
  if (testes[uid])         { try { testes[uid].kill("SIGTERM"); } catch(_) {} delete testes[uid]; }
  // Força fechar WS do usuário (o cliente também deve fechar, mas por segurança)
  (wsClientes[uid] || new Set()).forEach(ws => { try { ws.close(); } catch(_) {} });
  delete wsClientes[uid];
  res.json({ ok: true });
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

  const ip = getClientIp(req); const ua = getClientUa(req); const agora = new Date().toISOString();
  let user = lerUsuarioPorEmail(email);
  if (user) {
    const patch = { ultimoLoginIp: ip, ultimoLoginUa: ua, ultimoLoginEm: agora };
    if (!user.googleId) patch.googleId = googleId;
    atualizarUsuario(user.id, patch);
    salvarAuditoria(user.id, { id:"aud_"+Date.now(), tipo:"login_google", em:agora, ip, ua, iniciadoEm:agora });
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
    admin: false, criadoEm: agora,
    enviosHoje: 0, ultimoEnvioData: null,
    assinaturaId: null, proximoVencimento: null,
    cadastroCompleto: false,
    registroIp: ip, registroUa: ua,
    ultimoLoginIp: ip, ultimoLoginUa: ua, ultimoLoginEm: agora
  };
  salvarAuditoria(id, { id:"aud_"+Date.now(), tipo:"registro_google", em:agora, ip, ua, iniciadoEm:agora });
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
        reason: `ChatMOVE ${planoInfo.nome} (${cicloNorm === "anual" ? "Anual" : "Mensal"}) · ${TRIAL_DIAS} dias grátis`,
        external_reference: `${userId}|${plano}|${cicloNorm}`,
        payer_email: user.email,
        back_url: `${base}/login?ativado=1`,
        auto_recurring: {
          frequency: cicloNorm === "anual" ? 12 : 1,
          frequency_type: "months",
          transaction_amount: preco / 100,
          currency_id: "BRL",
          free_trial: { frequency: TRIAL_DIAS, frequency_type: "days" }
        },
        status: "pending"
      })
    });
    const trialFim = new Date(Date.now() + TRIAL_DIAS * 86400000).toISOString();
    atualizarUsuario(userId, { assinaturaId: data.id, plano, ciclo: cicloNorm, trialFim });
    res.json({ ok: true, checkoutUrl: data.init_point, assinaturaId: data.id, trialDias: TRIAL_DIAS });
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

// ── HOME / DASHBOARD ──────────────────────────────────────────────────────────
app.get("/api/home", authMiddleware, (req, res) => {
  const uid = req.userId;
  const contas = lerUser(uid, "contas.json", []);
  const listas = lerUser(uid, "listas.json", []);
  const cfg    = lerUser(uid, "chatmove.config.json", {});
  const hist   = lerUser(uid, "historico.json", []);
  const user   = req.user;
  const plano  = PLANOS[user.plano] || PLANOS.basico;

  // Estatísticas últimos 30 dias
  const agora = Date.now();
  const ult30 = hist.filter(h => (agora - new Date(h.data || h.criadoEm || 0).getTime()) < 30 * 86400000);
  const totalEnviados30d = ult30.reduce((s, h) => s + (h.enviados || 0), 0);
  const campanhasMes = ult30.length;

  // Checklist de onboarding — verifica conexão real, não apenas conta criada
  const temWhatsApp = contas.some(c => {
    const marker = path.join(userDir(uid), ".wwebjs_auth_" + c.id, ".wa-authenticated");
    return fs.existsSync(marker);
  });
  const temLista = listas.length > 0;
  const temMsg = !!(cfg && cfg.mensagem && cfg.mensagem.trim().length > 0);
  const temDisparo = hist.length > 0;

  res.json({
    nome: user.nome || "",
    planoNome: plano.nome,
    envioRestanteHoje: Math.max(0, plano.limiteEnviosDia - (user.enviosHoje || 0)),
    limiteEnviosDia: plano.limiteEnviosDia,
    stats: {
      totalEnviados30d,
      campanhasMes,
      totalContatosUnicos: listas.reduce((s, l) => s + (l.total || 0), 0),
      totalListas: listas.length,
      totalContas: contas.length
    },
    checklist: {
      whatsapp: temWhatsApp,
      lista: temLista,
      mensagem: temMsg,
      disparo: temDisparo,
      tudo: temWhatsApp && temLista && temMsg && temDisparo
    },
    ultimasCampanhas: hist.slice(0, 5).map(h => ({ id: h.id, nome: h.nome, enviados: h.enviados, data: h.data || h.criadoEm }))
  });
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
    // Esconde planos marcados como oculto (owner, agencia) do pricing público.
    // Esses só podem ser atribuídos manualmente pelo admin.
    planos: Object.fromEntries(Object.entries(PLANOS).filter(([,v]) => !v.oculto).map(([k, v]) => [k, {
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
          success: `${base}/painel?upgrade=ok`,
          failure: `${base}/painel?upgrade=erro`,
          pending: `${base}/painel?upgrade=pendente`
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
        back_url: `${base}/painel?ciclo=ok`,
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
// Data "hoje" em timezone Brasil (America/Sao_Paulo), formato estável "DD/MM/AAAA".
// Evita bug de reset quando o servidor está em UTC: lá a virada de dia acontece 21h Brasil.
function hojeBR() {
  return new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}
function verificarLimite(userId) {
  const user  = lerUsuario(userId);
  if (!user) return { ok: false, erro: "Usuário não encontrado" };
  const plano = PLANOS[user.plano] || PLANOS.basico;
  // Owner e admin não têm limite
  if (user.admin || user.plano === "owner") return { ok: true, restantes: 999999 };
  const hoje  = hojeBR();
  if (user.ultimoEnvioData !== hoje) {
    atualizarUsuario(userId, { enviosHoje: 0, ultimoEnvioData: hoje });
    return { ok: true, restantes: plano.limiteEnviosDia };
  }
  const restantes = plano.limiteEnviosDia - (user.enviosHoje || 0);
  if (restantes <= 0) {
    const podeUpgrade = user.plano === "basico" || user.plano === "premium";
    return {
      ok: false,
      erro: `Limite do plano ${plano.nome} atingido (${plano.limiteEnviosDia}/dia). Seus contatos restantes serão enviados amanhã.`,
      limiteAtingido: true,
      podeUpgrade,
      planoAtual: user.plano,
      limiteEnviosDia: plano.limiteEnviosDia
    };
  }
  return { ok: true, restantes };
}
function contarEnvio(userId, quantidade) {
  const user = lerUsuario(userId);
  if (!user) return;
  const hoje = hojeBR();
  const atual = user.ultimoEnvioData === hoje ? (user.enviosHoje || 0) : 0;
  atualizarUsuario(userId, { enviosHoje: atual + quantidade, ultimoEnvioData: hoje });
}

// ── APIs do ChatMOVE (multi-tenant) ───────────────────────────────────────────
// Todas as rotas abaixo requerem auth e usam dados isolados por userId

app.get("/api/contas",     authMiddleware, (req, res) => {
  const contas = lerUser(req.userId, "contas.json", []);
  // Marca como conectada só se o worker escreveu o marker de autenticação
  const enriched = contas.map(c => {
    const dir = path.join(userDir(req.userId), ".wwebjs_auth_" + c.id);
    const marker = path.join(dir, ".wa-authenticated");
    return { ...c, conectado: fs.existsSync(marker) };
  });
  res.json(enriched);
});
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

// Divide uma lista em N partes. Modo "tamanho" (cada parte tem X contatos) ou
// "partes" (total dividido em N partes iguais). A original fica intacta.
app.post("/api/listas/:id/dividir", authMiddleware, (req, res) => {
  const uid = req.userId;
  const { modo, valor, intercalar } = req.body || {};
  const listas = lerUser(uid, "listas.json", []);
  const orig = listas.find(l => l.id === req.params.id);
  if (!orig) return res.status(404).json({ erro: "Lista não encontrada" });
  const contatos = Array.isArray(orig.contatos) ? orig.contatos : [];
  if (!contatos.length) return res.status(400).json({ erro: "Lista vazia" });

  const v = Math.max(2, parseInt(valor, 10) || 0);
  if (!v || v < 2) return res.status(400).json({ erro: "Valor inválido (mínimo 2)" });

  let partes;
  if (modo === "tamanho") {
    // v = contatos por parte
    if (v >= contatos.length) return res.status(400).json({ erro: "Tamanho maior ou igual ao total — nada a dividir" });
    partes = Math.ceil(contatos.length / v);
  } else if (modo === "partes") {
    // v = número de partes
    if (v > contatos.length) return res.status(400).json({ erro: "Mais partes do que contatos" });
    partes = v;
  } else {
    return res.status(400).json({ erro: "Modo inválido (use 'tamanho' ou 'partes')" });
  }

  // Distribui: intercalado (round-robin) ou sequencial
  const buckets = Array.from({ length: partes }, () => []);
  if (intercalar) {
    contatos.forEach((c, i) => buckets[i % partes].push(c));
  } else {
    const porParte = Math.ceil(contatos.length / partes);
    contatos.forEach((c, i) => {
      const idx = Math.min(Math.floor(i / porParte), partes - 1);
      buckets[idx].push(c);
    });
  }

  const agora = Date.now();
  const novasIds = [];
  buckets.forEach((b, i) => {
    if (!b.length) return;
    const novo = {
      id: "lista_" + (agora + i),
      nome: `${orig.nome} (parte ${i + 1}/${partes})`,
      total: b.length,
      contatos: b,
      criadaEm: new Date().toISOString()
    };
    listas.push(novo);
    novasIds.push(novo.id);
  });
  salvarUser(uid, "listas.json", listas);
  res.json({ ok: true, partes: buckets.length, ids: novasIds });
});

app.get("/api/blacklist",  authMiddleware, (req, res) => res.json(lerUser(req.userId, "blacklist.json", [])));

// Candidatos sugeridos pra blacklist: 10+ campanhas recebidas sem NENHUMA resposta.
// Não adiciona automático — só sugere pro dono revisar.
app.get("/api/blacklist/candidatos", authMiddleware, (req, res) => {
  const LIMITE = 10; // threshold: 10+ disparos sem resposta = candidato
  const stats = lerUser(req.userId, "stats_contatos.json", {});
  const blacklistAtual = new Set((lerUser(req.userId, "blacklist.json", [])).map(b => b.numero));
  // Tenta achar nome no progresso atual ou em listas salvas
  const listas = lerUser(req.userId, "listas.json", []);
  const nomesPorNumero = {};
  listas.forEach(l => (l.contatos || []).forEach(c => {
    const n = String(c.phone || c.telefone || "").replace(/\D/g, "");
    if (n && c.nome) nomesPorNumero[n] = nomesPorNumero[n] || c.nome;
  }));

  const candidatos = Object.entries(stats)
    .filter(([num, s]) => !blacklistAtual.has(num) && s.recebidas >= LIMITE && s.respondidas === 0)
    .map(([num, s]) => ({
      numero: num,
      nome: nomesPorNumero[num] || nomesPorNumero[numeroAlternativo(num) || ""] || "",
      recebidas: s.recebidas,
      respondidas: s.respondidas,
      primeiraRecepcao: s.primeiraRecepcao,
      ultimaRecepcao: s.ultimaRecepcao
    }))
    .sort((a, b) => b.recebidas - a.recebidas);
  res.json({ candidatos, threshold: LIMITE });
});
// Ignora um candidato: reseta o contador de "recebidas sem resposta" pra ele parar de aparecer
app.post("/api/blacklist/candidatos/ignorar", authMiddleware, (req, res) => {
  const { numero } = req.body || {};
  if (!numero) return res.status(400).json({ erro: "numero obrigatório" });
  const stats = lerUser(req.userId, "stats_contatos.json", {});
  if (stats[numero]) {
    stats[numero].recebidas = 0; // zera pra recomeçar contagem
    stats[numero].ignoradoEm = new Date().toISOString();
    salvarUser(req.userId, "stats_contatos.json", stats);
  }
  res.json({ ok: true });
});

// Helper duplicado pra não depender do disparador (só conversão de formato do número)
function numeroAlternativo(num) {
  if (!num) return null;
  const s = String(num);
  if (s.length === 13) return s.slice(0, 4) + s.slice(5);
  if (s.length === 12) return s.slice(0, 4) + "9" + s.slice(4);
  return null;
}
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

// Repetir campanha: aplica config+mensagem do histórico e, opcional, troca lista+conta.
// Não inicia o disparo aqui — deixa o cliente chamar /api/iniciar depois (gate de termo/limite/etc continua valendo).
app.post("/api/historico/:id/repetir", authMiddleware, (req, res) => {
  const uid = req.userId;
  const hist = lerUser(uid, "historico.json", []);
  const h = hist.find(x => x.id === req.params.id);
  if (!h) return res.status(404).json({ erro: "Campanha do histórico não encontrada" });
  // Aplica config+mensagem do snapshot como a config atual
  const cfgAtual = lerUser(uid, "chatmove.config.json", {});
  let novaCfg = cfgAtual;
  if (h.config || h.mensagem) {
    novaCfg = {
      ...cfgAtual,
      mensagem: h.mensagem !== undefined ? h.mensagem : cfgAtual.mensagem,
      ...(h.config || {})
    };
  }
  // Override de mídia vindo do modal: { enviarImagem: bool, imagemNome: string }
  const { listaId, imagem } = req.body || {};
  if (imagem && typeof imagem === "object") {
    novaCfg = {
      ...novaCfg,
      enviarImagem: !!imagem.enviarImagem,
      imagemNome: imagem.imagemNome || ""
    };
    // Se ligou imagem mas o arquivo não existe no disco, falha cedo pra não disparar sem mídia
    if (novaCfg.enviarImagem && novaCfg.imagemNome) {
      const img = path.join(userDir(uid), "imagens", novaCfg.imagemNome);
      if (!fs.existsSync(img)) return res.status(400).json({ erro: "Arquivo de mídia não encontrado no servidor. Anexe de novo antes de disparar." });
    }
  }
  salvarUser(uid, "chatmove.config.json", novaCfg);
  if (listaId) {
    const lista = lerUser(uid, "listas.json", []).find(l => l.id === listaId);
    if (!lista) return res.status(404).json({ erro: "Lista escolhida não encontrada" });
    const csv = "nome,telefone\n" + (lista.contatos || []).map(c => `${c.nome || ""},${c.phone || c.telefone || ""}`).join("\n");
    fs.writeFileSync(userFile(uid, "clientes.csv"), csv, "utf8");
  }
  // Retorna info pra o cliente poder montar a tela de Monitor já com os dados certos
  const contas = lerUser(uid, "contas.json", []);
  res.json({
    ok: true,
    nomeCampanhaSugerido: h.nome + " (repetido)",
    contaIdOriginal: h.contaId || null,
    listas: lerUser(uid, "listas.json", []).map(l => ({ id: l.id, nome: l.nome, total: l.total })),
    contas: contas.map(c => ({ id: c.id, nome: c.nome, numero: c.numero, conectado: c.conectado || false }))
  });
});
app.delete("/api/historico/:id", authMiddleware, (req, res) => {
  salvarUser(req.userId, "historico.json", lerUser(req.userId, "historico.json", []).filter(h => h.id !== req.params.id));
  res.json({ ok: true });
});

// ── Info do usuário logado (usado na aba Relatórios pra pré-preencher destino) ──
app.get("/api/user/me", authMiddleware, (req, res) => {
  const u = req.user || {};
  res.json({
    id: u.id, nome: u.nome || "", email: u.email || "",
    whatsapp: u.whatsapp || "", plano: u.plano || "basico", admin: !!u.admin
  });
});

// ── RELATÓRIOS por período ─────────────────────────────────────────────────────
// Agrega o histórico no intervalo [inicio, fim] (YYYY-MM-DD, fuso Brasil).
app.get("/api/relatorio", authMiddleware, (req, res) => {
  const uid = req.userId;
  const { inicio, fim } = req.query;
  if (!inicio || !fim) return res.status(400).json({ erro: "Informe inicio e fim (YYYY-MM-DD)" });
  // Datas inclusivas no fuso Brasil: 00:00 do início até 23:59:59 do fim
  const iniDt = new Date(inicio + "T00:00:00-03:00");
  const fimDt = new Date(fim    + "T23:59:59-03:00");
  if (isNaN(iniDt) || isNaN(fimDt) || iniDt > fimDt) return res.status(400).json({ erro: "Período inválido" });

  const hist = lerUser(uid, "historico.json", []);
  const noPeriodo = hist.filter(h => {
    const dt = new Date(h.dataEnvio || h.data || h.criadoEm || 0);
    return dt >= iniDt && dt <= fimDt;
  });

  const resumo = noPeriodo.reduce((s, h) => {
    s.campanhas += 1;
    s.enviados  += Number(h.enviados  || 0);
    s.falhas    += Number(h.falhas    || 0);
    s.pulados   += Math.max(0, Number(h.total || 0) - Number(h.enviados || 0) - Number(h.falhas || 0));
    s.respostas += Number(h.respostas || 0);
    s.optouts   += Number(h.optOuts   || 0);
    return s;
  }, { campanhas:0, enviados:0, falhas:0, pulados:0, respostas:0, optouts:0 });

  res.json({
    periodo: { inicio, fim },
    resumo,
    campanhas: noPeriodo.map(h => ({
      id: h.id, nome: h.nome, conta: h.conta,
      em: h.dataEnvio || h.data || h.criadoEm,
      enviados: h.enviados || 0, falhas: h.falhas || 0,
      respostas: h.respostas || 0, optOuts: h.optOuts || 0,
      taxaResposta: h.taxaResposta || 0
    }))
  });
});

// Envia o relatório pelo WhatsApp via worker separado (enviar_msg_avulsa.js)
app.post("/api/relatorio/enviar", authMiddleware, (req, res) => {
  const uid = req.userId;
  const { contaId, destino, inicio, fim } = req.body || {};
  if (!contaId || !destino || !inicio || !fim) return res.status(400).json({ erro: "Dados incompletos" });
  if (processos[uid]) return res.status(400).json({ erro: "Aguarde — há um disparo em andamento" });

  const conta = lerUser(uid, "contas.json", []).find(c => c.id === contaId);
  if (!conta) return res.status(404).json({ erro: "Conta não encontrada" });

  // Reaproveita o endpoint de relatório pra montar o resumo
  const iniDt = new Date(inicio + "T00:00:00-03:00");
  const fimDt = new Date(fim    + "T23:59:59-03:00");
  if (isNaN(iniDt) || isNaN(fimDt) || iniDt > fimDt) return res.status(400).json({ erro: "Período inválido" });
  const hist = lerUser(uid, "historico.json", []);
  const noPeriodo = hist.filter(h => {
    const dt = new Date(h.dataEnvio || h.data || h.criadoEm || 0);
    return dt >= iniDt && dt <= fimDt;
  });
  const r = noPeriodo.reduce((s, h) => {
    s.campanhas += 1; s.enviados += +h.enviados||0; s.falhas += +h.falhas||0;
    s.pulados += Math.max(0, (+h.total||0) - (+h.enviados||0) - (+h.falhas||0));
    s.respostas += +h.respostas||0; s.optouts += +h.optOuts||0;
    return s;
  }, { campanhas:0, enviados:0, falhas:0, pulados:0, respostas:0, optouts:0 });

  const fmtDt = d => d.split("-").reverse().join("/");
  const taxa = r.enviados > 0 && r.respostas > 0 ? Math.round(r.respostas/r.enviados*100) : 0;
  const nomeUsuario = (req.user.nome || "").split(" ")[0] || "";
  const linhas = [
    `📊 *Relatório ChatMOVE*` + (nomeUsuario ? ` — ${nomeUsuario}` : ""),
    `Período: ${fmtDt(inicio)} → ${fmtDt(fim)}`,
    ``,
    `*Campanhas:* ${r.campanhas}`,
    `*Mensagens enviadas:* ${r.enviados}`,
    `*Falhas:* ${r.falhas}`,
    `*Pulados:* ${r.pulados}`,
    `*Respostas:* ${r.respostas}${taxa ? `  (taxa ${taxa}%)` : ""}`,
    `*Opt-outs:* ${r.optouts}`,
    ``
  ];
  if (noPeriodo.length) {
    linhas.push(`*Top campanhas:*`);
    noPeriodo.slice(0, 5).forEach(h => {
      const tx = h.enviados > 0 && h.respostas > 0 ? ` · ${Math.round(h.respostas/h.enviados*100)}% resp` : "";
      linhas.push(`• ${h.nome}: ${h.enviados||0} env${tx}`);
    });
    linhas.push("");
  }
  linhas.push(`_Gerado em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}_`);
  const texto = linhas.join("\n");

  const authDir = path.join(userDir(uid), ".wwebjs_auth_" + conta.id);
  if (!fs.existsSync(path.join(authDir, ".wa-authenticated"))) {
    return res.status(400).json({ erro: "Essa conta não está conectada. Abra a aba Contas e conecte antes." });
  }

  const proc = spawn("node", [path.join(ROOT, "enviar_msg_avulsa.js")], {
    cwd: ROOT,
    env: {
      ...process.env,
      AUTH_DIR_OVERRIDE: authDir,
      MSG_DESTINO:       String(destino).replace(/\D/g, ""),
      MSG_TEXTO:         texto
    }
  });
  let saida = "";
  proc.stdout.on("data", d => { saida += d.toString(); });
  proc.stderr.on("data", d => { saida += d.toString(); });
  proc.on("close", code => {
    console.log(`[relatorio-enviar ${uid}] exit ${code}\n${saida.slice(0, 500)}`);
  });
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

app.get("/api/config", authMiddleware, (req, res) => {
  res.json(lerUser(req.userId, "chatmove.config.json", {}));
});
app.post("/api/config", authMiddleware, (req, res) => {
  salvarUser(req.userId, "chatmove.config.json", req.body);
  res.json({ ok: true });
});

// ── Calendário comercial brasileiro: datas fixas + móveis ────────────────────
// Algoritmo de Gauss pra calcular a Páscoa (base pra Carnaval, Sexta Santa)
function calcularPascoa(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const L = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * L) / 451);
  const mes = Math.floor((h + L - 7 * m + 114) / 31);
  const dia = ((h + L - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}
function iso(d) { return d.toISOString().slice(0, 10); }
function ddMM(d) { return d.getUTCDate() + "/" + (d.getUTCMonth() + 1); }
// Segundo domingo de um mês (mês 0-indexed em UTC)
function segundoDomingo(ano, mes0) {
  let d = new Date(Date.UTC(ano, mes0, 1));
  while (d.getUTCDay() !== 0) d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCDate(d.getUTCDate() + 7);
  return d;
}
// Última sexta-feira de novembro (Black Friday)
function ultimaSextaNov(ano) {
  let d = new Date(Date.UTC(ano, 10, 30));
  while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() - 1);
  return d;
}
function datasComerciaisAno(ano) {
  const pascoa = calcularPascoa(ano);
  const sextaSanta = new Date(pascoa); sextaSanta.setUTCDate(pascoa.getUTCDate() - 2);
  const carnaval = new Date(pascoa); carnaval.setUTCDate(pascoa.getUTCDate() - 47);
  const diaDasMaes = segundoDomingo(ano, 4); // maio = mês 4 (0-indexed)
  const diaDosPais = segundoDomingo(ano, 7); // agosto
  const blackFriday = ultimaSextaNov(ano);
  return [
    { data: `${ano}-01-01`, nome: "Ano Novo",                     icone: "champagne",  oportunidade: "combos de começo de ano, energia de recomeço" },
    { data: iso(carnaval),  nome: "Carnaval",                     icone: "mask",       oportunidade: "promoção pra fim de semana de folia, delivery pra quem tá em casa" },
    { data: `${ano}-03-08`, nome: "Dia Internacional da Mulher",  icone: "flower",     oportunidade: "homenagem com sobremesa grátis ou desconto pra mulheres" },
    { data: iso(sextaSanta), nome: "Sexta-feira Santa",           icone: "fish",       oportunidade: "cardápio com peixe, moqueca, bacalhau" },
    { data: iso(pascoa),    nome: "Páscoa",                       icone: "egg",        oportunidade: "almoço em família, sobremesa de chocolate" },
    { data: `${ano}-04-21`, nome: "Tiradentes",                   icone: "flag",       oportunidade: "feriado, almoço com família, promoção pra casa cheia" },
    { data: `${ano}-05-01`, nome: "Dia do Trabalhador",           icone: "briefcase",  oportunidade: "promoção do trabalhador, feriado prolongado" },
    { data: iso(diaDasMaes), nome: "Dia das Mães",                icone: "heart",      oportunidade: "almoço/brunch especial, reserva antecipada, combo família" },
    { data: `${ano}-06-12`, nome: "Dia dos Namorados",            icone: "heart-solid",oportunidade: "jantar romântico, combo casal, sobremesa especial" },
    { data: `${ano}-06-24`, nome: "São João",                     icone: "flame",      oportunidade: "comida junina, quentão, milho, pé de moleque, temático" },
    { data: `${ano}-07-20`, nome: "Dia do Amigo",                 icone: "users",      oportunidade: "desconto em combos pra turma, promoção 'chama os amigos'" },
    { data: iso(diaDosPais), nome: "Dia dos Pais",                icone: "medal",      oportunidade: "churrasco, combo do pai, almoço família" },
    { data: `${ano}-09-07`, nome: "Independência",                icone: "flag",       oportunidade: "feriado, almoço com família, churrasco" },
    { data: `${ano}-09-15`, nome: "Dia do Cliente",               icone: "gift",       oportunidade: "desconto exclusivo pra base, 'você é motivo'" },
    { data: `${ano}-10-12`, nome: "Dia das Crianças",             icone: "balloon",    oportunidade: "combo família, porção criança grátis, brinde" },
    { data: `${ano}-10-15`, nome: "Dia dos Professores",          icone: "book",       oportunidade: "desconto pra professores apresentando algo" },
    { data: `${ano}-11-02`, nome: "Finados",                      icone: "candle",     oportunidade: "delivery (dia de estar em casa)" },
    { data: `${ano}-11-15`, nome: "Proclamação da República",     icone: "flag",       oportunidade: "feriado, almoço família, movimento em casa" },
    { data: iso(blackFriday), nome: "Black Friday",               icone: "bag",        oportunidade: "desconto forte, menu especial, combo 'só hoje'" },
    { data: `${ano}-12-24`, nome: "Véspera de Natal",             icone: "tree",       oportunidade: "ceia pronta, encomendas, combos especiais" },
    { data: `${ano}-12-25`, nome: "Natal",                        icone: "tree",       oportunidade: "almoço de Natal, combos família" },
    { data: `${ano}-12-31`, nome: "Réveillon",                    icone: "sparkles",   oportunidade: "combo de virada, entrega antes das 22h" }
  ];
}

// GET /api/calendario/proximas — retorna eventos nos próximos X dias (default 60)
app.get("/api/calendario/proximas", authMiddleware, (req, res) => {
  const diasFrente = Math.min(365, Math.max(7, parseInt(req.query.dias, 10) || 60));
  const agora = new Date();
  const ano = agora.getFullYear();
  // Pega ano corrente + próximo pra cobrir virada (ex: se estamos em dezembro, já pega Ano Novo do ano seguinte)
  const todas = [...datasComerciaisAno(ano), ...datasComerciaisAno(ano + 1)];
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const limite = new Date(hoje); limite.setDate(limite.getDate() + diasFrente);
  const proximas = todas
    .map(d => {
      const [y, m, dia] = d.data.split("-").map(Number);
      const quando = new Date(y, m - 1, dia);
      const diasRestantes = Math.round((quando - hoje) / 86400000);
      return { ...d, quando, diasRestantes };
    })
    .filter(d => d.diasRestantes >= 0 && d.quando <= limite)
    .sort((a, b) => a.diasRestantes - b.diasRestantes)
    .map(d => ({
      data: d.data, nome: d.nome, icone: d.icone, oportunidade: d.oportunidade,
      diasRestantes: d.diasRestantes,
      quandoLegivel: d.quando.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
    }));
  res.json({ proximas, hoje: hoje.toISOString().slice(0, 10) });
});

// ── IA: gera 3 variações de mensagem de WhatsApp pra restaurante ──────────────
// Usa Claude Haiku 4.5 (rápido e barato). Rate limit: 20 chamadas/24h por usuário.
const AI_LIMITE_DIARIO = 20;
const AI_SYSTEM_PROMPT = `Você é um copywriter especialista em marketing de restaurante pelo WhatsApp no Brasil.

Sua tarefa: gerar EXATAMENTE 3 variações de mensagem de WhatsApp baseado no briefing que o dono do negócio vai passar.

REGRAS OBRIGATÓRIAS:
- Cada mensagem tem NO MÁXIMO 280 caracteres
- Use SEMPRE {nome} onde o nome do cliente entra (será substituído automaticamente no disparo)
- Português brasileiro, tom próximo e direto, como um atendente simpático do bairro (nunca "COMPRE AGORA!!!" ou corporativo)
- Inclua 1-2 emojis relevantes no máximo, nunca mais
- CTA claro e simples (responde aqui, passa no balcão, manda a palavra X, etc)
- Seja específico: número, hora, data, valor se o briefing trouxer
- Evite palavras "promocionais" demais que aumentam risco de flag (URGENTE, IMPERDÍVEL, OFERTA LIMITADA)
- NÃO invente dados que o briefing não trouxe

FORMATO DA RESPOSTA: retorne APENAS um JSON válido neste formato, sem markdown, sem comentários:
{"variacoes":[{"abordagem":"Direta","mensagem":"..."},{"abordagem":"Emocional","mensagem":"..."},{"abordagem":"Criativa","mensagem":"..."}]}`;

app.post("/api/ai/gerar-mensagem", authMiddleware, async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ erro: "IA ainda não configurada. Avise o admin." });
  }
  const { prompt, tom, tipo } = req.body || {};
  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 10) {
    return res.status(400).json({ erro: "Descreva em pelo menos 10 caracteres o que quer disparar." });
  }
  if (prompt.length > 1000) {
    return res.status(400).json({ erro: "Briefing longo demais. Limite: 1000 caracteres." });
  }

  // Rate limit: 20 chamadas nas últimas 24h por usuário (admin sem limite)
  if (!req.user.admin) {
    const audit = lerUser(req.userId, "audit.json", []);
    const cutoff = Date.now() - 86400000;
    const ult24h = audit.filter(a => a.tipo === "ai_gerar_msg" && new Date(a.em || a.iniciadoEm || 0).getTime() >= cutoff).length;
    if (ult24h >= AI_LIMITE_DIARIO) {
      return res.status(429).json({ erro: `Você chegou no limite de ${AI_LIMITE_DIARIO} gerações nas últimas 24h. Volte mais tarde.` });
    }
  }

  const userMsg =
    `Briefing do dono:\n${prompt.trim()}` +
    (tom ? `\nTom desejado: ${tom}` : "") +
    (tipo ? `\nTipo de mensagem: ${tipo}` : "") +
    `\n\nGere 3 variações em JSON conforme instruído.`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        system: AI_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMsg }]
      })
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error("Claude API erro:", data);
      return res.status(502).json({ erro: "IA indisponível: " + (data.error?.message || "tente de novo em 1 min") });
    }
    const text = (data.content?.[0]?.text || "").trim();
    // A IA pode ocasionalmente devolver com ```json ... ```, extrai o bloco
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(502).json({ erro: "IA retornou formato inesperado. Tente de novo." });
    let parsed;
    try { parsed = JSON.parse(match[0]); }
    catch { return res.status(502).json({ erro: "IA retornou JSON inválido. Tente de novo." }); }
    const variacoes = (parsed.variacoes || []).filter(v => v && v.mensagem).slice(0, 3);
    if (!variacoes.length) return res.status(502).json({ erro: "IA não gerou variações. Tente reformular o briefing." });

    // Registra no audit pro rate limit e auditoria geral
    salvarAuditoria(req.userId, {
      id: "aud_" + Date.now(),
      tipo: "ai_gerar_msg",
      em: new Date().toISOString(),
      iniciadoEm: new Date().toISOString(),
      promptLen: prompt.length,
      ip: getClientIp(req),
      ua: getClientUa(req),
      modelo: "claude-haiku-4-5",
      tokensIn: data.usage?.input_tokens || null,
      tokensOut: data.usage?.output_tokens || null
    });

    res.json({ ok: true, variacoes });
  } catch (e) {
    console.error("IA gerar-mensagem:", e.message);
    res.status(500).json({ erro: "Erro ao consultar a IA. Tente novamente." });
  }
});

// IA especializada pra campanha de DATA COMERCIAL: usa nome do evento + oportunidade +
// histórico recente do usuário (as últimas 3 campanhas) como contexto pra continuidade de voz.
app.post("/api/ai/gerar-mensagem-evento", authMiddleware, async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ erro: "IA ainda não configurada." });
  const { evento, oportunidade, diasRestantes, detalhes } = req.body || {};
  if (!evento || !oportunidade) return res.status(400).json({ erro: "evento e oportunidade são obrigatórios" });

  // Rate limit compartilhado com gerar-mensagem
  if (!req.user.admin) {
    const audit = lerUser(req.userId, "audit.json", []);
    const cutoff = Date.now() - 86400000;
    const ult24h = audit.filter(a => (a.tipo === "ai_gerar_msg" || a.tipo === "ai_gerar_evento") && new Date(a.em || 0).getTime() >= cutoff).length;
    if (ult24h >= AI_LIMITE_DIARIO) return res.status(429).json({ erro: `Limite de ${AI_LIMITE_DIARIO} gerações/24h atingido.` });
  }

  // Contexto de continuidade: últimas 3 campanhas (só mensagem, pra IA manter tom/estilo)
  const hist = lerUser(req.userId, "historico.json", []).slice(0, 3)
    .filter(h => h.mensagem).map(h => ({ nome: h.nome, mensagem: h.mensagem.slice(0, 200) }));

  const systemEvento = `Você é um copywriter de WhatsApp pra restaurantes brasileiros. Agora o dono quer uma campanha pra uma data comercial específica.

REGRAS:
- 280 caracteres máximo por mensagem
- Use SEMPRE {nome}
- Tom próximo, brasileiro, de atendente simpático
- 1-2 emojis relevantes à data
- CTA claro (retirar, reservar, pedir delivery, responder)
- Ancorar na data específica (ex: "pro Dia das Mães", "nessa Sexta Santa")
- Se tiver histórico do cliente, mantenha continuidade de voz
- Gere 3 variações com abordagens diferentes

FORMATO: JSON puro, sem markdown:
{"variacoes":[{"abordagem":"...","mensagem":"..."},...]}`;

  const contextoHist = hist.length
    ? `\n\nHistórico recente do dono (pra manter estilo/voz consistente):\n${hist.map((h,i) => `${i+1}. ${h.nome}: "${h.mensagem}"`).join("\n")}`
    : "";
  const userMsg =
    `Data comercial: ${evento}` +
    (diasRestantes != null ? ` (faltam ${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""})` : "") +
    `\nOportunidade desta data: ${oportunidade}` +
    (detalhes ? `\nDetalhes extras do dono: ${detalhes}` : "") +
    contextoHist +
    `\n\nGere 3 variações de mensagem específicas pra essa data.`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        system: systemEvento,
        messages: [{ role: "user", content: userMsg }]
      })
    });
    const data = await resp.json();
    if (!resp.ok) return res.status(502).json({ erro: "IA indisponível: " + (data.error?.message || "tente de novo") });
    const text = (data.content?.[0]?.text || "").trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(502).json({ erro: "IA retornou formato inesperado." });
    const parsed = JSON.parse(match[0]);
    const variacoes = (parsed.variacoes || []).filter(v => v && v.mensagem).slice(0, 3);
    if (!variacoes.length) return res.status(502).json({ erro: "IA não gerou variações." });

    salvarAuditoria(req.userId, {
      id: "aud_" + Date.now(),
      tipo: "ai_gerar_evento",
      em: new Date().toISOString(), iniciadoEm: new Date().toISOString(),
      evento, diasRestantes, ip: getClientIp(req),
      modelo: "claude-haiku-4-5",
      tokensIn: data.usage?.input_tokens || null,
      tokensOut: data.usage?.output_tokens || null
    });

    res.json({ ok: true, variacoes, usouHistorico: hist.length > 0 });
  } catch (e) {
    console.error("IA gerar-evento:", e.message);
    res.status(500).json({ erro: "Erro ao consultar a IA." });
  }
});

// Limpeza de lista client-side complementada por IA opcional. Mas client-side já resolve
// 99% dos casos então o endpoint de IA vira "melhorar ainda mais" quando houver casos edge.
app.post("/api/ai/limpar-contatos", authMiddleware, async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ erro: "IA ainda não configurada." });
  const { contatos } = req.body || {};
  if (!Array.isArray(contatos) || !contatos.length) return res.status(400).json({ erro: "Envie um array de contatos" });
  if (contatos.length > 200) return res.status(400).json({ erro: "Máximo 200 contatos por chamada. Divida em lotes." });

  // Rate limit separado: 10 chamadas/24h (pode processar até 2000 contatos/dia)
  if (!req.user.admin) {
    const audit = lerUser(req.userId, "audit.json", []);
    const cutoff = Date.now() - 86400000;
    const ult24h = audit.filter(a => a.tipo === "ai_limpar_contatos" && new Date(a.em || 0).getTime() >= cutoff).length;
    if (ult24h >= 10) return res.status(429).json({ erro: "Limite de 10 limpezas/24h atingido." });
  }

  const systemLimpar = `Você recebe uma lista de contatos brasileiros em JSON (nome bruto + telefone bruto) e devolve a versão limpa.

REGRAS DE NOME:
- Extrair apenas o PRIMEIRO NOME (antes do primeiro espaço), ignorando "de", "da", "do", "dos", "das" como preposições
- Nomes compostos conhecidos ficam juntos: Ana Paula, Maria Clara, Maria Eduarda, José Carlos, João Pedro, Luiz Felipe, Carlos Eduardo, Ana Luiza, Ana Júlia, Maria Fernanda
- Capitalizar corretamente: "JOÃO" → "João", "maria" → "Maria", "josé" → "José"
- Preservar acentos
- Se não conseguir extrair nome válido, retornar string vazia ""

REGRAS DE TELEFONE (IMPORTANTE — NÃO INVENTAR O 9):
- Só LIMPA a formatação. NÃO adiciona nem remove o dígito 9 de celular. NUNCA.
- O "9" extra em celulares brasileiros foi adicionado em épocas diferentes por região (SP em 2012, PR/SC/interior depois). Muitos WhatsApps antigos ainda estão cadastrados sem o 9 na região Sul e em cidades menores, especialmente PR (DDDs 41-46). Mexer no 9 quebra a entrega.
- Remover APENAS caracteres não-dígito (espaços, parênteses, traços, pontos, +)
- Se vier SEM o "55" no início, adicione "55"
- Se vier com "055" ou "0055", normalize pra "55"
- Resultado aceitável: 12 dígitos (55 + DDD + 8 dígitos, sem o 9) OU 13 dígitos (55 + DDD + 9 + 8 dígitos)
- AMBOS os formatos são válidos. Retorne EXATAMENTE como veio, só sem a formatação.
- Se número claramente inválido (menos de 10 dígitos totais, ou mais de 13, ou DDD inválido), retornar null

EXEMPLOS:
- "(43) 9625-5556" → "554396255556" (12 dígitos, sem o 9, formato PR antigo — MANTÉM ASSIM)
- "(11) 99999-8888" → "5511999998888" (13 dígitos, com o 9, formato SP — MANTÉM ASSIM)
- "43 9 9625-5556" → "5543996255556" (13 dígitos, com o 9, usuário informou o 9 — MANTÉM ASSIM)
- "+55 43 96255556" → "554396255556" (sem o 9, do jeito que veio)
- "996255556" (só 9 dígitos, sem DDD) → null (ambíguo demais)

FORMATO RESPOSTA: JSON puro sem markdown, array na mesma ordem de entrada:
{"limpos":[{"nome":"...","telefone":"..."},...]}`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4000,
        system: systemLimpar,
        messages: [{ role: "user", content: "Contatos a limpar (JSON):\n" + JSON.stringify(contatos) }]
      })
    });
    const data = await resp.json();
    if (!resp.ok) return res.status(502).json({ erro: "IA indisponível." });
    const text = (data.content?.[0]?.text || "").trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(502).json({ erro: "IA retornou formato inesperado." });
    const parsed = JSON.parse(match[0]);
    const limpos = (parsed.limpos || []).slice(0, contatos.length);

    salvarAuditoria(req.userId, {
      id: "aud_" + Date.now(),
      tipo: "ai_limpar_contatos",
      em: new Date().toISOString(), iniciadoEm: new Date().toISOString(),
      qtd: contatos.length, ip: getClientIp(req),
      modelo: "claude-haiku-4-5",
      tokensIn: data.usage?.input_tokens || null,
      tokensOut: data.usage?.output_tokens || null
    });

    res.json({ ok: true, limpos });
  } catch (e) {
    console.error("IA limpar-contatos:", e.message);
    res.status(500).json({ erro: "Erro ao consultar a IA." });
  }
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
const processos   = {}; // userId → processo de disparo
const testes      = {}; // userId → processo de teste
const campanhas   = {}; // userId → dados da campanha
const wsClientes  = {}; // userId → Set<ws>
const conexoes    = {}; // userId → { proc, contaId, contaNome } — worker de conexão WhatsApp

app.post("/api/iniciar", authMiddleware, async (req, res) => {
  const uid = req.userId;
  if (processos[uid]) return res.status(400).json({ erro: "Disparo em andamento" });
  if (testes[uid])    return res.status(400).json({ erro: "Aguarde o teste finalizar" });

  // Gate: precisa ter aceito o Termo de Responsabilidade do Uso na versão atual
  if (!req.user.admin) {
    const tr = req.user.termoResponsabilidade;
    if (!tr || !tr.aceitoEm || (tr.versao || 0) < TERMO_USO_VERSAO) {
      return res.status(403).json({
        erro: "Você precisa aceitar o Termo de Responsabilidade do Uso antes de disparar.",
        termoPendente: true,
        versaoAtual: TERMO_USO_VERSAO
      });
    }
  }

  const limite = verificarLimite(uid);
  if (!limite.ok) {
    const { erro, limiteAtingido, podeUpgrade, planoAtual, limiteEnviosDia } = limite;
    return res.status(403).json({ erro, limiteAtingido, podeUpgrade, planoAtual, limiteEnviosDia });
  }

  const { nomeCampanha, contaId } = req.body;
  const cfg     = lerUser(uid, "chatmove.config.json", {});
  campanhas[uid] = {
    enviados: [], erros: [], pulados: [], total: 0,
    nome: nomeCampanha||"Campanha", contaId,
    // Snapshot pra auditoria: config no momento do disparo + contexto do usuário
    configSnapshot: {
      delayMin: cfg.delayMin, delayMax: cfg.delayMax,
      pausarACada: cfg.pausarACada, duracaoPausa: cfg.duracaoPausa,
      enviarImagem: cfg.enviarImagem, modoCaption: cfg.modoCaption,
      mensagemTamanho: (cfg.mensagem || "").length
    },
    ip: getClientIp(req), ua: getClientUa(req),
    planoAtivo: req.user.plano
  };
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
      LIMITE_ENVIOS_DIA:       String(limite.restantes),
      // Relatório + janela de escuta pós-campanha
      WA_DONO:                 req.user.whatsapp || "",
      NOME_DONO:               req.user.nome || "",
      APP_URL:                 mpBaseUrl(),
      ESCUTA_MIN:              "120"
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
  const { contaId, phone } = req.body;
  const conta   = contaId ? lerUser(uid, "contas.json", []).find(c => c.id === contaId) : null;
  const authDir = path.join(userDir(uid), conta ? ".wwebjs_auth_" + conta.id : ".wwebjs_auth");
  const env = { ...process.env, AUTH_DIR_OVERRIDE: authDir, CONNECT_ONLY: "true" };
  if (phone) {
    const digits = String(phone).replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) return res.status(400).json({ erro: "Número inválido. Inclua DDI+DDD+número (ex: 5511999998888)" });
    env.PAIR_WITH_NUMBER = digits;
  }
  // Mata conexão anterior do mesmo usuário (se houver) — evita workers duplicados
  if (conexoes[uid] && conexoes[uid].proc) {
    try { conexoes[uid].proc.kill("SIGTERM"); } catch(_) {}
    console.log(`[conectar] matou worker anterior pid=${conexoes[uid].proc.pid} uid=${uid}`);
    delete conexoes[uid];
  }
  const proc = spawn("node", [path.join(ROOT, "disparador2.js")], { cwd: ROOT, env });
  const cId = conta?.id || null;
  const cNome = conta?.nome || "Padrão";
  conexoes[uid] = { proc, contaId: cId, contaNome: cNome };
  console.log(`[conectar] spawn pid=${proc.pid} uid=${uid} conta=${cId||'default'}${phone?' phone=***':''}`);
  let buf = "";
  proc.stdout.on("data", d => {
    const text = d.toString();
    process.stdout.write(`[worker ${proc.pid}] ${text}`);
    buf += text;
    const lines = buf.split("\n"); buf = lines.pop();
    for (const l of lines) {
      // Só despacha eventos se este worker ainda é o ativo (evita eventos
      // tardios de worker antigo "marcarem" tela da nova conta)
      if (conexoes[uid]?.proc !== proc) continue;
      if (l.startsWith("CHATMOVE_QR:"))     broadcastUser(uid, { tipo: "qr", data: l.replace("CHATMOVE_QR:","").trim(), contaId: cId, contaNome: cNome });
      if (l.startsWith("CHATMOVE_CODE:"))   broadcastUser(uid, { tipo: "pairing_code", data: l.replace("CHATMOVE_CODE:","").trim(), contaId: cId, contaNome: cNome });
      if (l.startsWith("CHATMOVE_EVENT:")) {
        try { const ev = JSON.parse(l.replace("CHATMOVE_EVENT:","").trim()); if (ev.tipo==="autenticado") broadcastUser(uid, { tipo: "autenticado", contaId: cId, contaNome: cNome }); } catch{}
      }
    }
  });
  proc.stderr.on("data", d => process.stderr.write(`[worker ${proc.pid} ERR] ${d}`));
  proc.on("close", code => {
    console.log(`[conectar] worker pid=${proc.pid} closed code=${code}`);
    if (conexoes[uid]?.proc === proc) delete conexoes[uid];
  });
  proc.on("error", err => console.error(`[conectar] spawn error pid=${proc.pid}:`, err.message));
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
// Auditoria detalhada de 1 usuário: registro + logins + disparos com configs/hashes
app.get("/api/admin/usuarios/:id/auditoria", adminMiddleware, (req, res) => {
  const user = lerUsuario(req.params.id);
  if (!user) return res.status(404).json({ erro: "Usuário não encontrado" });
  const { senha, ...safe } = user;
  const audit = lerUser(req.params.id, "audit.json", []);
  const hist = lerUser(req.params.id, "historico.json", []);
  res.json({
    usuario: safe,
    registro: {
      registroIp: user.registroIp || null, registroUa: user.registroUa || null,
      ultimoLoginIp: user.ultimoLoginIp || null, ultimoLoginUa: user.ultimoLoginUa || null,
      ultimoLoginEm: user.ultimoLoginEm || null,
      ativadoEm: user.ativadoEm || null, canceladoEm: user.canceladoEm || null,
      trialFim: user.trialFim || null, assinaturaStatus: user.assinaturaStatus || null
    },
    audit, historico: hist,
    retencaoDias: AUDIT_RETENCAO_DIAS
  });
});

// Painel geral de abuso: multi-contas por IP/CPF/email + cancelamentos em trial
app.get("/api/admin/auditoria/geral", adminMiddleware, (req, res) => {
  const users = lerUsuarios();
  const porIpReg = {}, porIpLogin = {}, porCpf = {}, porEmailBase = {};
  users.forEach(u => {
    if (u.registroIp) (porIpReg[u.registroIp] = porIpReg[u.registroIp] || []).push(u.id);
    if (u.ultimoLoginIp) (porIpLogin[u.ultimoLoginIp] = porIpLogin[u.ultimoLoginIp] || []).push(u.id);
    if (u.cpf) (porCpf[u.cpf] = porCpf[u.cpf] || []).push(u.id);
    // Base do email antes do "+": lucas+x@a.com -> lucas@a.com
    if (u.email) {
      const base = u.email.replace(/\+[^@]*@/, "@").toLowerCase();
      (porEmailBase[base] = porEmailBase[base] || []).push(u.id);
    }
  });
  const multiIpRegistro = Object.entries(porIpReg).filter(([,v]) => v.length > 1).map(([ip, ids]) => ({ ip, userIds: ids }));
  const multiIpLogin = Object.entries(porIpLogin).filter(([,v]) => v.length > 1).map(([ip, ids]) => ({ ip, userIds: ids }));
  const multiCpf = Object.entries(porCpf).filter(([,v]) => v.length > 1).map(([cpf, ids]) => ({ cpf, userIds: ids }));
  const multiEmail = Object.entries(porEmailBase).filter(([,v]) => v.length > 1).map(([e, ids]) => ({ emailBase: e, userIds: ids }));
  // Cancelados dentro de 7 dias (trial abuse)
  const trialCancelados = users.filter(u => u.canceladoEm && u.ativadoEm &&
    (new Date(u.canceladoEm) - new Date(u.ativadoEm)) < 8 * 86400000
  ).map(u => ({ id: u.id, email: u.email, ativadoEm: u.ativadoEm, canceladoEm: u.canceladoEm,
    diasAtivo: Math.round((new Date(u.canceladoEm) - new Date(u.ativadoEm)) / 86400000) }));
  res.json({ multiIpRegistro, multiIpLogin, multiCpf, multiEmail, trialCancelados, totalUsuarios: users.length });
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
window.location.href = '/login';
</script>
<p>Saindo...</p>
</body></html>`);
});

app.get("/setup", (req, res) => {
  const users = lerUsuarios();
  if (users.some(u => u.admin)) {
    res.redirect("/login");
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
    setTimeout(function(){window.location.href='/login';},2000);
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
      const consumoLimite = camp.msgsReais || camp.enviados.length;
      contarEnvio(uid, consumoLimite);
      const hist = lerUser(uid, "historico.json", []);
      const conta = camp.contaId ? lerUser(uid, "contas.json", []).find(c => c.id === camp.contaId) : null;
      const fimEm = new Date();
      const duracaoSeg = Math.round((fimEm.getTime() - iniciadoEm.getTime()) / 1000);
      const duracaoMin = Math.round(duracaoSeg / 60);
      const histId = "h_" + Date.now();
      const cfgAtual = lerUser(uid, "chatmove.config.json", {});
      // Se a escuta rodou, usa os resultados. Senão, placeholders
      const escuta = camp.escutaResumo || { respostas: 0, optOuts: 0, numerosQueResponderam: [] };
      const taxaResposta = camp.enviados.length > 0
        ? Math.round((escuta.respostas / camp.enviados.length) * 100 * 10) / 10
        : 0;
      hist.unshift({
        id: histId, nome: camp.nome, conta: conta?.nome||"Padrão", contaId: camp.contaId,
        dataEnvio: iniciadoEm.toISOString(), enviados: camp.enviados.length, falhas: camp.erros.length, total: camp.total,
        // Snapshot pra conseguir repetir depois, mesmo que a config atual mude
        mensagem: cfgAtual.mensagem || "",
        config: {
          delayMin: cfgAtual.delayMin, delayMax: cfgAtual.delayMax,
          pausarACada: cfgAtual.pausarACada, duracaoPausa: cfgAtual.duracaoPausa,
          enviarImagem: cfgAtual.enviarImagem, modoCaption: cfgAtual.modoCaption,
          imagemNome: cfgAtual.imagemNome || ""
        },
        // Métricas de engajamento captadas na janela de escuta (2h pós-envio)
        respostas: escuta.respostas,
        optOuts: escuta.optOuts,
        taxaResposta
      });
      salvarUser(uid, "historico.json", hist.slice(0, 100));

      // Atualiza stats_contatos (base da recomendação de blacklist "10+ sem resposta")
      atualizarStatsContatos(uid, camp.enviados.map(e => e.numero), new Set(escuta.numerosQueResponderam));

      // ── AUDITORIA: entrada detalhada pra defesa jurídica / abuso ──
      const msgsReais = camp.msgsReais || camp.enviados.length;
      const intervaloMedioSeg = msgsReais > 1 ? +(duracaoSeg / msgsReais).toFixed(2) : null;
      const hashDestinatarios = (camp.enviados || []).map(e => hashNumero(e.numero));
      salvarAuditoria(uid, {
        id: "aud_" + Date.now(),
        tipo: "disparo",
        campanhaId: histId,
        nome: camp.nome,
        iniciadoEm: iniciadoEm.toISOString(),
        finalizadoEm: fimEm.toISOString(),
        duracaoSeg, duracaoMin,
        configUsada: camp.configSnapshot || null,
        planoAtivo: camp.planoAtivo || null,
        contaId: camp.contaId || null, contaNome: conta?.nome || "Padrão",
        totalContatos: camp.total,
        enviados: camp.enviados.length,
        msgsReais,
        falhas: camp.erros.length,
        pulados: camp.pulados.length,
        intervaloMedioSeg,
        limiteDiarioPlano: (PLANOS[camp.planoAtivo] || {}).limiteEnviosDia || null,
        encerramentoCodigo: code,
        ip: camp.ip || null, ua: camp.ua || null,
        hashDestinatarios
      });
    }
    try { fs.unlinkSync(userFile(uid, "progress.json")); } catch(_) {}
    broadcastUser(uid, { tipo: "concluido", codigo: code });
    broadcastUser(uid, { tipo: "log", nivel: code===0?"ok":"warn", msg: code===0?"✅ Concluído!":"⚠️ Encerrado" });
  });
}
function processarEvento(uid, ev) {
  const camp = campanhas[uid]; if (!camp) return;
  if (ev.tipo==="total")     { camp.total=ev.count; broadcastUser(uid,{tipo:"total",count:ev.count}); }
  if (ev.tipo==="enviado")   {
    camp.enviados.push({nome:ev.nome,numero:ev.numero});
    if (typeof ev.totalMsgsReais === "number") camp.msgsReais = ev.totalMsgsReais;
    broadcastUser(uid,{tipo:"enviado",nome:ev.nome,numero:ev.numero,total:camp.enviados.length});
  }
  if (ev.tipo==="erro_envio"){ camp.erros.push({nome:ev.nome,numero:ev.numero,erro:ev.erro}); broadcastUser(uid,{tipo:"erro_envio",nome:ev.nome,numero:ev.numero,erro:ev.erro,total:camp.erros.length}); }
  if (ev.tipo==="pulado")    { camp.pulados.push({nome:ev.nome,numero:ev.numero}); broadcastUser(uid,{tipo:"pulado",nome:ev.nome,numero:ev.numero,total:camp.pulados?.length||0}); }
  if (ev.tipo==="finalizado"){
    if (typeof ev.msgsReais === "number") camp.msgsReais = ev.msgsReais;
    broadcastUser(uid,{tipo:"finalizado",enviados:ev.enviados,erros:ev.invalidos,pulados:ev.pulados,limiteAtingido:ev.limiteAtingido});
  }
  if (ev.tipo==="relatorio_enviado") {
    broadcastUser(uid, { tipo:"log", nivel:"ok", msg:`📤 Relatório enviado pro seu WhatsApp (${ev.para})` });
  }
  if (ev.tipo==="escuta_iniciou") {
    camp.escutando = true;
    camp.escutaFimEm = ev.fimEm;
    camp.respostas = camp.respostas || [];
    // Evento silencioso: monitor usa pra atualizar contador, sem avisar o usuário
    broadcastUser(uid, { tipo:"escuta_iniciou", fimEm: ev.fimEm, duracaoMin: ev.duracaoMin });
  }
  if (ev.tipo==="resposta") {
    camp.respostas = camp.respostas || [];
    camp.respostas.push({ numero: ev.numero, optOut: !!ev.optOut, em: ev.em });
    broadcastUser(uid, { tipo:"resposta", numero: ev.numero, total: camp.respostas.length, optOut: !!ev.optOut });
    // Auto-blacklist imediato em caso de opt-out
    if (ev.optOut) {
      const bl = lerUser(uid, "blacklist.json", []);
      if (!bl.find(b => b.numero === ev.numero)) {
        bl.push({ numero: ev.numero, motivo: "opt-out automático (resposta contém palavra de saída)", em: new Date().toISOString(), auto: true });
        salvarUser(uid, "blacklist.json", bl);
      }
    }
  }
  if (ev.tipo==="escuta_fim") {
    camp.escutando = false;
    // Guarda resultados; o proc.on("close") vai gravar no histórico + stats_contatos
    camp.escutaResumo = {
      respostas: ev.respostas,
      optOuts: ev.optOuts,
      numerosQueResponderam: ev.numerosQueResponderam || []
    };
    broadcastUser(uid, { tipo:"escuta_fim", respostas: ev.respostas, optOuts: ev.optOuts });
  }
}

// Stats por contato: quantas campanhas recebeu e respondeu. Base da recomendação de blacklist.
function atualizarStatsContatos(uid, numerosEnviados, numerosResponderam) {
  const stats = lerUser(uid, "stats_contatos.json", {});
  const agora = new Date().toISOString();
  numerosEnviados.forEach(n => {
    if (!stats[n]) stats[n] = { recebidas: 0, respondidas: 0, primeiraRecepcao: agora, ultimaRecepcao: agora, ultimaResposta: null };
    stats[n].recebidas += 1;
    stats[n].ultimaRecepcao = agora;
    if (numerosResponderam.has(n)) {
      stats[n].respondidas += 1;
      stats[n].ultimaResposta = agora;
    }
  });
  salvarUser(uid, "stats_contatos.json", stats);
}

// ── AGENDADOR ─────────────────────────────────────────────────────────────────
function dispararAgendamento(uid, ag) {
  if (processos[uid]) return { ok: false, erro: "Disparo em andamento" };
  const limite = verificarLimite(uid);
  if (!limite.ok) return { ok: false, erro: limite.erro };
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
  const user = lerUsuario(uid) || {};
  campanhas[uid] = { enviados: [], erros: [], pulados: [], total: 0, nome: ag.nome, contaId: ag.contaId };
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
      LIMITE_ENVIOS_DIA:       String(limite.restantes),
      WA_DONO:                 user.whatsapp || "",
      NOME_DONO:               user.nome || "",
      APP_URL:                 mpBaseUrl(),
      ESCUTA_MIN:              "120"
    }
  });
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
