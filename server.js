// ─────────────────────────────────────────────────────────────────────────────
// MOVE Insights   Servidor Principal
// Multi-tenant: Usuários MOVE → Clientes de Tráfego
// Auth + Meta Ads + WhatsApp + Cobrança
// ─────────────────────────────────────────────────────────────────────────────
require("dotenv").config();
const express  = require("express");
const http     = require("http");
const WebSocket = require("ws");
const path     = require("path");
const fs       = require("fs");
const crypto   = require("crypto");

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });
const PORT   = process.env.PORT || 3000;
const ROOT   = __dirname;
const DATA   = path.join(ROOT, "data");
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });

app.set("trust proxy", 1);
app.use(express.json({ limit: "50mb" }));

// ── JWT simples ──────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || "moveinsights_secret_2026";

function jwtSign(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString("base64url");
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
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

// ── Persistência ─────────────────────────────────────────────────────────────
function lerUser(userId, arquivo, padrao) {
  try {
    const dir = path.join(DATA, userId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, arquivo);
    if (!fs.existsSync(file)) return padrao;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return padrao;
  }
}

function salvarUser(userId, arquivo, dados) {
  const dir = path.join(DATA, userId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, arquivo);
  fs.writeFileSync(file, JSON.stringify(dados, null, 2), "utf8");
}

// ── Middleware: Auth ─────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ erro: "Token ausente" });
  const payload = jwtVerify(token);
  if (!payload) return res.status(401).json({ erro: "Token inválido ou expirado" });
  req.userId = payload.userId;
  next();
}

// ── Rotas: Auth ──────────────────────────────────────────────────────────────
app.post("/api/auth/register", (req, res) => {
  const { email, senha, agenciaNome } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: "Email e senha obrigatórios" });

  const userId = crypto.randomBytes(8).toString("hex");
  const usuarios = lerUser("_root", "usuarios.json", []);
  if (usuarios.find(u => u.email === email)) return res.status(409).json({ erro: "Email já registrado" });

  const novoUsuario = {
    userId,
    email,
    senhaHash: hashPassword(senha),
    agenciaNome: agenciaNome || "Minha Agência",
    criadoEm: new Date().toISOString(),
    ativo: true
  };
  usuarios.push(novoUsuario);
  salvarUser("_root", "usuarios.json", usuarios);

  const token = jwtSign({ userId, exp: Date.now() + 30 * 24 * 3600000 });
  res.json({ userId, token, message: "Conta criada com sucesso" });
});

app.post("/api/auth/login", (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: "Email e senha obrigatórios" });

  const usuarios = lerUser("_root", "usuarios.json", []);
  const usuario = usuarios.find(u => u.email === email);
  if (!usuario || usuario.senhaHash !== hashPassword(senha)) {
    return res.status(401).json({ erro: "Email ou senha incorretos" });
  }

  const token = jwtSign({ userId: usuario.userId, exp: Date.now() + 30 * 24 * 3600000 });
  res.json({ userId: usuario.userId, token, agenciaNome: usuario.agenciaNome });
});

// ── Rotas: Dashboard ─────────────────────────────────────────────────────────
app.get("/api/profile", authMiddleware, (req, res) => {
  const usuarios = lerUser("_root", "usuarios.json", []);
  const usuario = usuarios.find(u => u.userId === req.userId);
  if (!usuario) return res.status(404).json({ erro: "Usuário não encontrado" });

  const clientes = lerUser(req.userId, "clientes.json", []);
  res.json({
    userId: usuario.userId,
    email: usuario.email,
    agenciaNome: usuario.agenciaNome,
    totalClientes: clientes.length
  });
});

// ── Rotas: Clientes de Tráfego ───────────────────────────────────────────────
app.get("/api/clientes", authMiddleware, (req, res) => {
  const clientes = lerUser(req.userId, "clientes.json", []);
  res.json(clientes);
});

app.post("/api/clientes", authMiddleware, (req, res) => {
  const { nome, email, metaAccountId, metaAccessToken } = req.body;
  if (!nome || !email) return res.status(400).json({ erro: "Nome e email obrigatórios" });

  const clientes = lerUser(req.userId, "clientes.json", []);
  const clienteId = crypto.randomBytes(8).toString("hex");

  const novoCliente = {
    clienteId,
    nome,
    email,
    metaAccountId: metaAccountId || "",
    metaAccessToken: metaAccessToken || "",
    criadoEm: new Date().toISOString(),
    ativo: true
  };

  clientes.push(novoCliente);
  salvarUser(req.userId, "clientes.json", clientes);

  // Criar pasta para o cliente
  const clienteDir = path.join(DATA, req.userId, clienteId);
  if (!fs.existsSync(clienteDir)) fs.mkdirSync(clienteDir, { recursive: true });

  res.status(201).json(novoCliente);
});

app.get("/api/clientes/:clienteId", authMiddleware, (req, res) => {
  const clientes = lerUser(req.userId, "clientes.json", []);
  const cliente = clientes.find(c => c.clienteId === req.params.clienteId);
  if (!cliente) return res.status(404).json({ erro: "Cliente não encontrado" });
  res.json(cliente);
});

// ── Rotas: Relatórios ────────────────────────────────────────────────────────
app.get("/api/clientes/:clienteId/relatorios", authMiddleware, (req, res) => {
  const relatorios = lerUser(req.userId, `${req.params.clienteId}/relatorios.json`, []);
  res.json(relatorios);
});

app.post("/api/clientes/:clienteId/relatorio-agora", authMiddleware, (req, res) => {
  const { tipo } = req.body; // tipo: "rapido", "completo", etc
  const clientes = lerUser(req.userId, "clientes.json", []);
  const cliente = clientes.find(c => c.clienteId === req.params.clienteId);
  if (!cliente) return res.status(404).json({ erro: "Cliente não encontrado" });

  // TODO: Buscar dados do Meta Ads + Gerar relatório + Disparar via WhatsApp
  res.json({ message: "Relatório sendo gerado", clienteId: req.params.clienteId, tipo });
});

// ── Rotas: Cobrança ──────────────────────────────────────────────────────────
app.post("/api/clientes/:clienteId/cobrar", authMiddleware, (req, res) => {
  const { valor, descricao } = req.body;
  if (!valor || valor <= 0) return res.status(400).json({ erro: "Valor inválido" });

  const clientes = lerUser(req.userId, "clientes.json", []);
  const cliente = clientes.find(c => c.clienteId === req.params.clienteId);
  if (!cliente) return res.status(404).json({ erro: "Cliente não encontrado" });

  const cobrancas = lerUser(req.userId, `${req.params.clienteId}/cobrancas.json`, []);
  const novaCobranca = {
    id: crypto.randomBytes(8).toString("hex"),
    valor,
    descricao: descricao || "Cobrança de tráfego",
    dataCriacao: new Date().toISOString(),
    status: "pendente",
    disparadoViaWhatsApp: false
  };

  cobrancas.push(novaCobranca);
  salvarUser(req.userId, `${req.params.clienteId}/cobrancas.json`, cobrancas);

  // TODO: Disparar via WhatsApp
  res.status(201).json({ message: "Cobrança criada", cobranca: novaCobranca });
});

// ── Static Files ─────────────────────────────────────────────────────────────
app.use(express.static(ROOT));

// ── Rotas de Página ──────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "") || req.query.token;
  if (token && jwtVerify(token)) {
    return res.sendFile(path.join(ROOT, "dashboard.html"));
  }
  res.sendFile(path.join(ROOT, "login.html"));
});

app.get("/login", (req, res) => res.sendFile(path.join(ROOT, "login.html")));

// ── Servidor ─────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`✓ MOVE Insights rodando em http://localhost:${PORT}`);
});
