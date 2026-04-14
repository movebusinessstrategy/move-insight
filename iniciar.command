#!/bin/bash

# Vai para a pasta onde este arquivo está
cd "$(dirname "$0")"

echo "🚀 Iniciando ChatMOVE..."
echo "📂 Pasta: $(pwd)"

# Verifica se Node está instalado
if ! command -v node &> /dev/null; then
  osascript -e 'display alert "Node.js não encontrado" message "Instale o Node.js em nodejs.org e tente novamente."'
  exit 1
fi

# Abre o navegador após 2 segundos
(sleep 2 && open "http://localhost:3000/chatmove.html") &

# Inicia o servidor
node server.js
