const express  = require("express");
const http     = require("http");
const WebSocket = require("ws");
const path     = require("path");
const fs       = require("fs");
const { spawn } = require("child_process");

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });
const PORT   = 3000;
const ROOT   = __dirname;

app.use(express.json({ limit: "50mb" }));
app.use(express.static(ROOT));

// ── JSON helpers ──────────────────────────────────────────────────────────────
function lerJSON(nome, padrao) {
  const p = path.join(ROOT, nome);
  try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : padrao; }
  catch { return padrao; }
}
function salvarJSON(nome, dados) {
  fs.writeFileSync(path.join(ROOT, nome), JSON.stringify(dados, null, 2), "utf8");
}

// ── Estado ────────────────────────────────────────────────────────────────────
let campanha = { enviados: [], erros: [], pulados: [], total: 0, nome: "", contaId: null };
let processoAtivo = null;

// ── CONTAS ────────────────────────────────────────────────────────────────────
app.get("/api/contas", (req, res) => res.json(lerJSON("contas.json", [])));

app.post("/api/contas", (req, res) => {
  const { nome, numero } = req.body;
  if (!nome) return res.status(400).json({ erro: "Nome obrigatório" });
  const contas = lerJSON("contas.json", []);
  const id = "conta_" + Date.now();
  contas.push({ id, nome, numero: numero || "", criadaEm: new Date().toISOString() });
  salvarJSON("contas.json", contas);
  res.json({ ok: true, id });
});

app.delete("/api/contas/:id", (req, res) => {
  const { id } = req.params;
  salvarJSON("contas.json", lerJSON("contas.json", []).filter(c => c.id !== id));
  const dir = path.join(ROOT, ".wwebjs_auth_" + id);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  res.json({ ok: true });
});

app.post("/api/contas/:id/desconectar", (req, res) => {
  if (processoAtivo) { processoAtivo.kill("SIGTERM"); processoAtivo = null; }
  const dir = path.join(ROOT, ".wwebjs_auth_" + req.params.id);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  broadcast({ tipo: "desconectado" });
  res.json({ ok: true });
});

// ── LISTAS SALVAS ─────────────────────────────────────────────────────────────
app.get("/api/listas", (req, res) => res.json(lerJSON("listas.json", [])));

app.post("/api/listas", (req, res) => {
  const { nome, contatos } = req.body;
  if (!nome) return res.status(400).json({ erro: "Nome obrigatório" });
  const listas = lerJSON("listas.json", []);
  const id = "lista_" + Date.now();
  listas.push({ id, nome, total: (contatos || []).length, contatos: contatos || [], criadaEm: new Date().toISOString() });
  salvarJSON("listas.json", listas);
  res.json({ ok: true, id });
});

app.delete("/api/listas/:id", (req, res) => {
  salvarJSON("listas.json", lerJSON("listas.json", []).filter(l => l.id !== req.params.id));
  res.json({ ok: true });
});

// ── BLACKLIST ─────────────────────────────────────────────────────────────────
app.get("/api/blacklist", (req, res) => res.json(lerJSON("blacklist.json", [])));

app.post("/api/blacklist", (req, res) => {
  const { numero, motivo } = req.body;
  if (!numero) return res.status(400).json({ erro: "Número obrigatório" });
  const bl = lerJSON("blacklist.json", []);
  const num = String(numero).replace(/\D/g, "");
  if (!bl.find(b => b.numero === num)) {
    bl.push({ numero: num, motivo: motivo || "", em: new Date().toISOString() });
    salvarJSON("blacklist.json", bl);
  }
  res.json({ ok: true });
});

app.delete("/api/blacklist/:numero", (req, res) => {
  salvarJSON("blacklist.json", lerJSON("blacklist.json", []).filter(b => b.numero !== req.params.numero));
  res.json({ ok: true });
});

// ── HISTÓRICO ─────────────────────────────────────────────────────────────────
app.get("/api/historico", (req, res) => res.json(lerJSON("historico.json", [])));

app.delete("/api/historico/:id", (req, res) => {
  salvarJSON("historico.json", lerJSON("historico.json", []).filter(h => h.id !== req.params.id));
  res.json({ ok: true });
});

// ── AGENDAMENTOS ──────────────────────────────────────────────────────────────
app.get("/api/agendamentos", (req, res) => res.json(lerJSON("agendamentos.json", [])));

app.post("/api/agendamentos", (req, res) => {
  const ag = req.body;
  if (!ag.nome) return res.status(400).json({ erro: "Nome obrigatório" });
  const ags = lerJSON("agendamentos.json", []);
  ag.id = "ag_" + Date.now();
  ag.status = "ativo";
  ag.criadoEm = new Date().toISOString();
  ags.push(ag);
  salvarJSON("agendamentos.json", ags);
  res.json({ ok: true, id: ag.id });
});

app.delete("/api/agendamentos/:id", (req, res) => {
  salvarJSON("agendamentos.json", lerJSON("agendamentos.json", []).filter(a => a.id !== req.params.id));
  res.json({ ok: true });
});

// ── CONFIG / CSV / IMAGEM ─────────────────────────────────────────────────────
app.post("/api/config", (req, res) => {
  const { mensagem, enviarImagem, modoCaption, imagemNome, delayMin, delayMax, pausarACada, duracaoPausa } = req.body;
  const config = { mensagem, enviarImagem, modoCaption, imagemNome: imagemNome || "",
    delayMin: parseInt(delayMin) * 1000, delayMax: parseInt(delayMax) * 1000,
    pausarACada: parseInt(pausarACada), duracaoPausa: parseInt(duracaoPausa) * 1000 };
  fs.writeFileSync(path.join(ROOT, "chatmove.config.json"), JSON.stringify(config, null, 2), "utf8");
  res.json({ ok: true });
});

app.post("/api/csv", (req, res) => {
  const { conteudo } = req.body;
  if (!conteudo) return res.status(400).json({ erro: "CSV vazio" });
  fs.writeFileSync(path.join(ROOT, "clientes.csv"), conteudo, "utf8");
  res.json({ ok: true });
});

app.post("/api/imagem", (req, res) => {
  const { nome, base64 } = req.body;
  if (!nome || !base64) return res.status(400).json({ erro: "Dados inválidos" });
  const dir = path.join(ROOT, "imagens");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, nome), Buffer.from(base64.split(",")[1] || base64, "base64"));
  res.json({ ok: true });
});

app.get("/api/exportar/:tipo", (req, res) => {
  const { tipo } = req.params;
  let linhas, nome;
  if (tipo === "enviados") {
    linhas = ["nome,telefone", ...campanha.enviados.map(c => `${c.nome},${c.numero}`)];
    nome = "chatmove-enviados.csv";
  } else if (tipo === "erros") {
    linhas = ["nome,telefone,erro", ...campanha.erros.map(c => `${c.nome},${c.numero},"${c.erro}"`)];
    nome = "chatmove-erros.csv";
  } else return res.status(400).json({ erro: "Tipo inválido" });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${nome}"`);
  res.send(linhas.join("\n"));
});

// ── CONECTAR (só autentica, não dispara) ─────────────────────────────────────
let processoConexao = null;

app.post("/api/conectar", (req, res) => {
  if (processoAtivo) return res.status(400).json({ erro: "Disparo em andamento" });
  if (processoConexao) { processoConexao.kill("SIGTERM"); processoConexao = null; }

  const { contaId } = req.body;
  const conta   = contaId ? lerJSON("contas.json", []).find(c => c.id === contaId) : null;
  const authDir = conta ? path.join(ROOT, ".wwebjs_auth_" + conta.id) : path.join(ROOT, ".wwebjs_auth");

  broadcast({ tipo: "log", nivel: "info", msg: "📲 Conectando WhatsApp..." });

  processoConexao = spawn("node", [path.join(ROOT, "disparador2.js")], {
    cwd: ROOT,
    env: { ...process.env, AUTH_DIR_OVERRIDE: authDir, CONNECT_ONLY: "true" }
  });

  let buf = "";
  processoConexao.stdout.on("data", (data) => {
    buf += data.toString();
    const linhas = buf.split("\n"); buf = linhas.pop();
    for (const linha of linhas) {
      const l = linha.trim(); if (!l) continue;
      if (l.startsWith("CHATMOVE_QR:")) {
        broadcast({ tipo: "qr", data: l.replace("CHATMOVE_QR:", "").trim() });
        continue;
      }
      if (l.startsWith("CHATMOVE_EVENT:")) {
        try {
          const ev = JSON.parse(l.replace("CHATMOVE_EVENT:", "").trim());
          if (ev.tipo === "autenticado") {
            broadcast({ tipo: "autenticado", contaNome: conta ? conta.nome : "Padrão" });
          }
        } catch {}
        continue;
      }
      if (/^[\s█▄▀■□\u2580-\u259F\[\]─]+$/.test(l)) continue;
      broadcast({ tipo: "log", nivel: classificar(l), msg: l });
    }
  });
  processoConexao.stderr.on("data", () => {});
  processoConexao.on("close", () => { processoConexao = null; });

  res.json({ ok: true });
});

// ── INICIAR ───────────────────────────────────────────────────────────────────
app.post("/api/iniciar", (req, res) => {
  if (processoAtivo) return res.status(400).json({ erro: "Disparo já em andamento" });
  const { nomeCampanha, contaId } = req.body;
  campanha = { enviados: [], erros: [], pulados: [], total: 0, nome: nomeCampanha || "Campanha", contaId: contaId || null };
  broadcast({ tipo: "log", nivel: "info", msg: "🚀 Iniciando disparador..." });
  const conta  = contaId ? lerJSON("contas.json", []).find(c => c.id === contaId) : null;
  const authDir = conta ? path.join(ROOT, ".wwebjs_auth_" + conta.id) : path.join(ROOT, ".wwebjs_auth");
  processoAtivo = spawn("node", [path.join(ROOT, "disparador2.js")], { cwd: ROOT, env: { ...process.env, AUTH_DIR_OVERRIDE: authDir } });
  iniciarHandlers(processoAtivo, new Date());
  res.json({ ok: true });
});

app.post("/api/teste", (req, res) => {
  const { numero, contaId } = req.body;
  if (!numero) return res.status(400).json({ erro: "Número obrigatório" });
  const csv = `nome,telefone\nTeste,${numero}`;
  fs.writeFileSync(path.join(ROOT, "clientes_teste.csv"), csv, "utf8");
  const conta   = contaId ? lerJSON("contas.json", []).find(c => c.id === contaId) : null;
  const authDir = conta ? path.join(ROOT, ".wwebjs_auth_" + conta.id) : path.join(ROOT, ".wwebjs_auth");
  const proc = spawn("node", [path.join(ROOT, "disparador2.js")], {
    cwd: ROOT, env: { ...process.env, AUTH_DIR_OVERRIDE: authDir, ARQUIVO_LISTA_OVERRIDE: "clientes_teste.csv" }
  });
  proc.on("close", () => { try { fs.unlinkSync(path.join(ROOT, "clientes_teste.csv")); } catch {} });
  broadcast({ tipo: "log", nivel: "info", msg: `📱 Teste para ${numero}...` });
  res.json({ ok: true });
});

app.post("/api/parar", (req, res) => {
  if (processoAtivo) { processoAtivo.kill("SIGTERM"); processoAtivo = null; }
  broadcast({ tipo: "log", nivel: "warn", msg: "⏹ Disparo interrompido" });
  broadcast({ tipo: "parado" });
  res.json({ ok: true });
});

app.post("/api/desconectar", (req, res) => {
  if (processoAtivo) { processoAtivo.kill("SIGTERM"); processoAtivo = null; }
  const dir = path.join(ROOT, ".wwebjs_auth");
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  broadcast({ tipo: "desconectado" });
  res.json({ ok: true });
});

app.post("/api/notif", (req, res) => {
  const { ativo, numero } = req.body;
  const cfg = lerJSON("notif.json", {});
  cfg.ativo = !!ativo;
  cfg.numero = numero || "";
  salvarJSON("notif.json", cfg);
  res.json({ ok: true });
});

app.post("/api/reset-progress", (req, res) => {
  const p = path.join(ROOT, "progress.json");
  if (fs.existsSync(p)) fs.unlinkSync(p);
  res.json({ ok: true });
});

// ── HANDLERS ──────────────────────────────────────────────────────────────────
function iniciarHandlers(proc, iniciadoEm) {
  let buf = "";
  proc.stdout.on("data", (data) => {
    buf += data.toString();
    const linhas = buf.split("\n"); buf = linhas.pop();
    for (const linha of linhas) {
      const l = linha.trim(); if (!l) continue;
      if (l.startsWith("CHATMOVE_QR:")) {
        broadcast({ tipo: "qr", data: l.replace("CHATMOVE_QR:", "").trim() });
        broadcast({ tipo: "log", nivel: "warn", msg: "🔳 QR Code gerado" });
        continue;
      }
      if (l.startsWith("CHATMOVE_EVENT:")) {
        try { processarEvento(JSON.parse(l.replace("CHATMOVE_EVENT:", "").trim())); } catch {}
        continue;
      }
      if (/^[\s█▄▀■□\u2580-\u259F\[\]─]+$/.test(l)) continue;
      broadcast({ tipo: "log", nivel: classificar(l), msg: l });
    }
  });
  proc.stderr.on("data", (data) => {
    const txt = data.toString().trim();
    if (txt && !txt.includes("DeprecationWarning")) broadcast({ tipo: "log", nivel: "erro", msg: txt.slice(0, 300) });
  });
  proc.on("close", (code) => {
    processoAtivo = null;
    // Salva histórico
    if (campanha.nome) {
      const hist  = lerJSON("historico.json", []);
      const conta = campanha.contaId ? lerJSON("contas.json", []).find(c => c.id === campanha.contaId) : null;
      const contaNome = conta ? conta.nome : "Padrão";
      const duracaoMin = Math.round((Date.now() - (iniciadoEm || new Date()).getTime()) / 60000);
      hist.unshift({ id: "h_" + Date.now(), nome: campanha.nome, conta: contaNome,
        contaId: campanha.contaId, dataEnvio: (iniciadoEm || new Date()).toISOString(),
        enviados: campanha.enviados.length, falhas: campanha.erros.length, total: campanha.total });
      salvarJSON("historico.json", hist.slice(0, 100));

      // Notificação WhatsApp
      enviarNotificacao({
        nome: campanha.nome, conta: contaNome,
        enviados: campanha.enviados.length, erros: campanha.erros.length,
        pulados: campanha.pulados.length, total: campanha.total, duracaoMin
      });
    }
    if (code === 0) {
      broadcast({ tipo: "concluido", codigo: 0 });
      broadcast({ tipo: "log", nivel: "ok", msg: "✅ Disparo concluído!" });
    } else {
      let temRestante = false;
      try {
        const pf = path.join(ROOT, "progress.json");
        if (fs.existsSync(pf)) {
          const p = JSON.parse(fs.readFileSync(pf, "utf8"));
          for (const c of Object.values(p.campanhas || {})) { if (c.lastIndex > 0) { temRestante = true; break; } }
        }
      } catch {}
      if (temRestante) {
        broadcast({ tipo: "log", nivel: "warn", msg: "⚠️ Conexão perdida. Reiniciando em 10s..." });
        setTimeout(() => {
          broadcast({ tipo: "log", nivel: "info", msg: "🔄 Reiniciando..." });
          processoAtivo = spawn("node", [path.join(ROOT, "disparador2.js")], { cwd: ROOT, env: proc.env || process.env });
          iniciarHandlers(processoAtivo, iniciadoEm);
        }, 10000);
      } else {
        broadcast({ tipo: "concluido", codigo: code });
        broadcast({ tipo: "log", nivel: "erro", msg: `Encerrado (código ${code})` });
      }
    }
  });
}

function processarEvento(ev) {
  switch (ev.tipo) {
    case "total":   campanha.total = ev.count; broadcast({ tipo: "total", count: ev.count }); break;
    case "enviado": campanha.enviados.push({ nome: ev.nome, numero: ev.numero }); broadcast({ tipo: "enviado", nome: ev.nome, numero: ev.numero, total: campanha.enviados.length }); break;
    case "erro_envio": campanha.erros.push({ nome: ev.nome, numero: ev.numero, erro: ev.erro }); broadcast({ tipo: "erro_envio", nome: ev.nome, numero: ev.numero, erro: ev.erro, total: campanha.erros.length }); break;
    case "pulado":  campanha.pulados.push({ nome: ev.nome, numero: ev.numero }); broadcast({ tipo: "pulado", nome: ev.nome, numero: ev.numero, total: campanha.pulados.length }); break;
    case "finalizado": broadcast({ tipo: "finalizado", enviados: ev.enviados, erros: ev.invalidos, pulados: ev.pulados }); break;
  }
}

// ── AGENDADOR ─────────────────────────────────────────────────────────────────
setInterval(() => {
  if (processoAtivo) return;
  const ags  = lerJSON("agendamentos.json", []);
  const agora = new Date();
  const hm   = `${String(agora.getHours()).padStart(2,"0")}:${String(agora.getMinutes()).padStart(2,"0")}`;
  const dia  = agora.getDay();
  ags.forEach(ag => {
    if (ag.status !== "ativo") return;
    let dispara = false;
    if (ag.tipo === "once") {
      const d = new Date(ag.dataHora);
      if (Math.abs(agora - d) <= 60000 && agora >= d) dispara = true;
    } else if (ag.tipo === "recurring") {
      if ((ag.diasSemana || []).includes(dia) && ag.horario === hm) dispara = true;
    }
    if (!dispara) return;
    broadcast({ tipo: "log", nivel: "ok", msg: `⏰ Agendamento: ${ag.nome}` });
    if (ag.config) fs.writeFileSync(path.join(ROOT, "chatmove.config.json"), JSON.stringify(ag.config, null, 2), "utf8");
    if (ag.csvContent) fs.writeFileSync(path.join(ROOT, "clientes.csv"), ag.csvContent, "utf8");
    if (ag.tipo === "once") {
      const todos = lerJSON("agendamentos.json", []);
      const i = todos.findIndex(a => a.id === ag.id);
      if (i !== -1) { todos[i].status = "executado"; salvarJSON("agendamentos.json", todos); }
    }

    // Prepara config
    if (ag.config) fs.writeFileSync(path.join(ROOT, "chatmove.config.json"), JSON.stringify(ag.config, null, 2), "utf8");

    // Prepara CSV — prioriza lista salva, depois csvContent inline
    if (ag.listaId) {
      const listas = lerJSON("listas.json", []);
      const lista = listas.find(l => l.id === ag.listaId);
      if (lista && lista.contatos && lista.contatos.length) {
        const csv = "nome,telefone\n" + lista.contatos.map(c => `${c.nome},${c.phone}`).join("\n");
        fs.writeFileSync(path.join(ROOT, "clientes.csv"), csv, "utf8");
        broadcast({ tipo: "log", nivel: "info", msg: `📋 Lista: ${lista.nome} (${lista.contatos.length} contatos)` });
      }
    } else if (ag.csvContent) {
      fs.writeFileSync(path.join(ROOT, "clientes.csv"), ag.csvContent, "utf8");
    }

    // Salva mídia se houver
    if (ag.midiaBase64 && ag.midiaNome) {
      const dir = path.join(ROOT, "imagens");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, ag.midiaNome), Buffer.from(ag.midiaBase64.split(",")[1] || ag.midiaBase64, "base64"));
    }

    const conta   = ag.contaId ? lerJSON("contas.json", []).find(c => c.id === ag.contaId) : null;
    const authDir = conta ? path.join(ROOT, ".wwebjs_auth_" + conta.id) : path.join(ROOT, ".wwebjs_auth");
    campanha = { enviados: [], erros: [], pulados: [], total: 0, nome: ag.nome, contaId: ag.contaId };
    processoAtivo = spawn("node", [path.join(ROOT, "disparador2.js")], { cwd: ROOT, env: { ...process.env, AUTH_DIR_OVERRIDE: authDir } });
    iniciarHandlers(processoAtivo, new Date());
  });
}, 60000);

// ── NOTIFICAÇÃO WHATSAPP ─────────────────────────────────────────────────────
async function enviarNotificacao(dados) {
  const notifCfg = lerJSON("notif.json", {});
  if (!notifCfg.ativo || !notifCfg.numero) return;

  const num = String(notifCfg.numero).replace(/\D/g, "");
  if (num.length < 10) return;

  const taxa = dados.total > 0 ? Math.round(dados.enviados / dados.total * 100) : 0;
  const duracao = dados.duracaoMin > 0 ? `${dados.duracaoMin} min` : "< 1 min";
  const conta = dados.conta || "Padrão";

  const msg = [
    `✅ *Campanha concluída!*`,
    ``,
    `📋 *${dados.nome}*`,
    `📱 Conta: ${conta}`,
    `⏱ Duração: ${duracao}`,
    ``,
    `📊 *Resultado:*`,
    `✓ Enviados: ${dados.enviados}`,
    `✗ Falhas: ${dados.erros}`,
    `⏭ Pulados: ${dados.pulados}`,
    `📈 Taxa: ${taxa}%`,
    ``,
    `_ChatMOVE · Move Business Solution_`
  ].join("\n");

  // Salva config de notificação temporária
  const cfgAtual = lerJSON("chatmove.config.json", {});
  const cfgNotif = {
    ...cfgAtual,
    mensagem: msg,
    enviarImagem: false,
    modoCaption: false,
    imagemNome: "",
    delayMin: 0,
    delayMax: 0,
    pausarACada: 999,
    duracaoPausa: 0
  };
  fs.writeFileSync(path.join(ROOT, "chatmove.notif.config.json"), JSON.stringify(cfgNotif, null, 2), "utf8");

  // CSV com só o número de notificação
  const numE164 = num.startsWith("55") ? num : "55" + num;
  fs.writeFileSync(path.join(ROOT, "clientes_notif.csv"), `nome,telefone\nVocê,${numE164}`, "utf8");

  try {
    const proc = require("child_process").spawn("node", [path.join(ROOT, "disparador2.js")], {
      cwd: ROOT,
      env: {
        ...process.env,
        ARQUIVO_LISTA_OVERRIDE: "clientes_notif.csv",
        CONFIG_OVERRIDE: "chatmove.notif.config.json"
      }
    });
    proc.on("close", () => {
      try { fs.unlinkSync(path.join(ROOT, "clientes_notif.csv")); } catch {}
      try { fs.unlinkSync(path.join(ROOT, "chatmove.notif.config.json")); } catch {}
    });
  } catch (e) {
    console.error("Erro ao enviar notificação:", e.message);
  }
}

// ── WS / UTILS ────────────────────────────────────────────────────────────────
wss.on("connection", ws => ws.send(JSON.stringify({ tipo: "conectado" })));
function broadcast(obj) {
  const msg = JSON.stringify(obj);
  wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(msg); });
}
function classificar(l) {
  l = l.toLowerCase();
  if (l.includes("✅") || l.includes("pronto")) return "ok";
  if (l.includes("❌") || l.includes("erro"))   return "erro";
  if (l.includes("⏸") || l.includes("⚠"))      return "warn";
  if (l.includes("🏁") || l.includes("finalizado")) return "ok";
  return "info";
}
server.listen(PORT, () => console.log(`\n✅ ChatMOVE → http://localhost:${PORT}/chatmove.html\n`));
