# SPRINT 1: Fundação - Status de Conclusão

## ✅ Tarefas Completadas

### 1.1 - Estrutura de pastas
- [x] `backend/` - Backend Node.js/Express
- [x] `frontend-admin/` - Interface admin (admin.movebusiness.com.br)
- [x] `frontend-cliente/` - Interface cliente (app.movebusiness.com.br)
- [x] `docker-compose.yml` - PostgreSQL 16 + Redis 7
- [x] Root `package.json` - Monorepo com npm workspaces

### 1.2 - Migrations 001-006
- [x] 001-create-users.sql - Usuários da equipe MOVE
- [x] 002-create-clientes.sql - Clientes de tráfego
- [x] 003-create-cliente-logins.sql - Credenciais dos clientes
- [x] 004-create-insights-snapshots.sql - Snapshots Meta API
- [x] 005-create-mensagens-enviadas.sql - Registro WhatsApp
- [x] 006-create-analises-ia.sql - Análises Claude API

### 1.3 - Scripts de database
- [x] `backend/src/db/client.ts` - Conexão PostgreSQL (postgres.js)
- [x] `backend/src/db/migrate.ts` - Runner de migrations
- [x] `backend/src/db/seed.ts` - Seed admin user
- [x] `npm run db:migrate` - Executa todas as migrations
- [x] `npm run db:seed` - Cria usuário admin

### 1.4 - Build & Dependencies
- [x] `backend/package.json` - Dependencies para Express, PostgreSQL, Redis, BullMQ, bcryptjs, @anthropic-ai/sdk, whatsapp-web.js
- [x] `backend/tsconfig.json` - TypeScript com strict mode
- [x] `npm install` - Todas dependências instaladas
- [x] `npm run build` - Compila sem erros

### 1.5 - Ambiente
- [x] `.env` - Variáveis configuradas (Meta API v25.0, Claude, Anthropic, WhatsApp)
- [x] `.env.example` - Template documentado
- [x] `backend/src/index.ts` - Entry point básico

## 🚀 Como Rodar

### Pré-requisitos
- Node.js ≥ 20
- npm ≥ 10
- Docker + Docker Compose (para PostgreSQL e Redis)

### Setup
```bash
# 1. Instalar dependências
npm install

# 2. Iniciar bancos de dados
docker-compose up -d

# 3. Rodar migrations
npm run db:migrate

# 4. Seed admin user
npm run db:seed
```

### Credenciais Admin (após seed)
```
Email: contato@movebusiness.com.br
Senha: mudar-no-primeiro-login
```

## 📋 Tarefas Pendentes - Sprint 1 Restante

### 1.6 - Auth Admin Backend
- [ ] POST /api/auth/admin/login
- [ ] POST /api/auth/admin/logout
- [ ] Middleware de proteção para rotas admin

### 1.7 - Auth Cliente Backend
- [ ] POST /api/cliente/auth/login
- [ ] POST /api/cliente/auth/logout
- [ ] Middleware de proteção para rotas cliente

### 1.8 - Frontend Admin
- [ ] Tela /login renderiza
- [ ] Form de login com validação
- [ ] Redirect pós-login para /dashboard

### 1.9 - Frontend Cliente
- [ ] Tela /login renderiza
- [ ] Form de login com validação
- [ ] Redirect pós-login para /relatorio

### 1.10 - Testes de Integração
- [ ] db:migrate funciona
- [ ] db:seed funciona
- [ ] Auth endpoints funcionam
- [ ] Frontend login flows funcionam

### 1.11 - Documentação
- [ ] README.md com setup
- [ ] Diagramas arquitetura
- [ ] API specification (OpenAPI)

## 📊 Checklist Técnico

- [x] PostgreSQL migrations compilam e não têm SQL errors
- [x] TypeScript compila sem errors
- [x] npm workspaces configurado
- [x] ENV variables documentadas
- [x] Docker compose com health checks
- [x] Database client genérico para postgres.js

## 🔗 Estrutura de Dados

### Usuários MOVE (Admin)
- id, nome, email, senha_hash, role, ativo, created_at, last_login_at

### Clientes (Traffic)
- id, nome, empresa, nicho, email
- ad_accounts (JSONB: Meta account IDs)
- contatos (JSONB: contact info)
- report_frequency, report_day, report_hour, report_timezone
- valor_mensal, dia_vencimento (cobrança)
- observacoes (internal notes, nunca mostrado ao cliente)

### Cliente Logins (Separate)
- id, cliente_id, email, senha_hash
- senha_provisoria (force change on first login)
- last_login_at, created_by

### Insights Snapshots (Meta API Data)
- cliente_id, ad_account_id, period_type, period_start, period_end
- KPIs: spend, impressions, reach, clicks, ctr, cpc, cpm, frequency
- Conversions: leads, messaging_started, purchases, purchase_value
- JSONB: campaigns, ads, demographics, daily_series, raw_response

### Mensagens Enviadas (WhatsApp)
- cliente_id, tipo, destinatario_phone, status
- whatsapp_msg_id, triggered_by (audit), sent_at

### Análises IA (Claude)
- cliente_id, periodo_inicio, periodo_fim
- analise_texto, recomendacoes
- tokens_input, tokens_output, custo_usd
- criada_por (user_id)

## 🔐 Segurança

- Senhas hashadas com bcryptjs
- Sessões baseadas em cookies (SESSION_SECRET em .env)
- Filtro de dados por cliente em middleware (nunca expor full objects)
- Tokens Meta nunca salvos (System User, non-expiring)
- WhatsApp session persistido em arquivo

## 📝 Notas

- Monolito Node.js - não é microserviços
- Express 5 (latest)
- TypeScript strict mode obrigatório
- Migrations executam em ordem alfabética
- Sem ORMs - queries diretas com postgres.js
- Redis para caching e BullMQ para jobs
