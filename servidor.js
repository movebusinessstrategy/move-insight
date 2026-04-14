const express = require("express");
const multer = require("multer");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.static("interface"));

if (!fs.existsSync("upload")) fs.mkdirSync("upload");

let proc = null;
let currentMode = null; // "connect" | "send" | null
let waStatus = "Desconectado";
let progressText = "Aguardando…";

function setStatusDefaults() {
  waStatus = "Desconectado";
  progressText = "Aguardando…";
  currentMode = null;
  proc = null;
}

function startProcess(mode) {
  if (proc) return false;

  currentMode = mode;
  waStatus = "Conectando…";
  progressText = "Iniciando…";

  proc = spawn("node", ["disparador.js"], {
    env: { ...process.env, MODE: mode },
    stdio: ["ignore", "pipe", "pipe"],
  });

  proc.stdout.on("data", (data) => {
    const lines = data.toString().split("\n").map(s => s.trim()).filter(Boolean);

    for (const line of lines) {
      console.log(line);

      if (line.startsWith("WA_STATUS:")) {
        waStatus = line.replace("WA_STATUS:", "").trim();
      } else if (line.startsWith("PROGRESS:")) {
        progressText = line.replace("PROGRESS:", "").trim();
      } else {
        progressText = line;
        if (line.toLowerCase().includes("whatsapp conectado")) waStatus = "Conectado";
      }
    }
  });

  proc.stderr.on("data", (data) => {
    const msg = data.toString().trim();
    console.log(msg);
    if (msg) progressText = msg;
  });

  proc.on("close", () => {
    // Se era MODE=send, terminou o disparo.
    // Se era MODE=connect, foi desconectado/parado.
    setStatusDefaults();
  });

  return true;
}

function stopProcess() {
  if (!proc) return false;
  try {
    proc.kill("SIGINT");
  } catch {}
  return true;
}

/** ========= Upload ========= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "upload"),
  filename: (req, file, cb) => {
    if (file.fieldname === "csv") return cb(null, "clientes.csv");
    if (file.fieldname === "imagem") {
      return cb(null, "imagem" + path.extname(file.originalname).toLowerCase());
    }
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });

app.post("/upload", upload.fields([{ name: "csv" }, { name: "imagem" }]), (req, res) => {
  res.type("text").send("✅ Arquivos atualizados. Pronto para disparar.");
});

/** ========= Status ========= */
app.get("/status", (req, res) => {
  res.json({
    whatsapp: waStatus,
    progress: progressText,
    running: !!proc,
    mode: currentMode,
  });
});

/** ========= Conectar ========= */
app.get("/conectar", (req, res) => {
  if (proc) return res.type("text").send("⚠️ Já tem um processo rodando.");
  const ok = startProcess("connect");
  res.type("text").send(ok ? "🔌 Conectando… (QR no terminal se precisar)" : "❌ Não consegui iniciar.");
});

/** ========= Desconectar ========= */
app.get("/desconectar", (req, res) => {
  if (!proc) return res.type("text").send("✅ Já está desconectado.");
  stopProcess();
  res.type("text").send("🔌 Desconectando…");
});

/** ========= Disparar ========= */
app.get("/disparar", async (req, res) => {
  // Se já tem connect rodando, derruba e inicia send.
  if (proc && currentMode === "connect") {
    progressText = "Trocando CONNECT → SEND…";
    stopProcess();

    // dá um tempinho pro processo fechar e liberar
    setTimeout(() => {
      if (!proc) startProcess("send");
    }, 800);

    return res.type("text").send("🚀 Iniciando disparo…");
  }

  if (proc) return res.type("text").send("⚠️ Já existe um disparo rodando.");
  const ok = startProcess("send");
  res.type("text").send(ok ? "🚀 Disparo iniciado!" : "❌ Não consegui iniciar.");
});

/** ========= Parar ========= */
app.get("/parar", (req, res) => {
  if (!proc) return res.type("text").send("Nada rodando.");
  stopProcess();
  res.type("text").send("⛔ Processo interrompido.");
});

app.listen(3000, () => {
  console.log("🚀 Interface MOVE rodando em http://localhost:3000");
});