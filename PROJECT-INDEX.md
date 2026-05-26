# 📑 MOVE Insights - Project Index

## 🗺️ Project Overview

**MOVE Insights** is a multi-tenant SaaS dashboard for traffic agencies to manage Meta Ads campaigns and client reporting. Built with Node.js monorepo architecture.

- **Owner:** Lucas Macena (MOVE Business)
- **Status:** Sprint 1 - Foundation (✅ Complete)
- **Architecture:** Express.js backend + React frontends (admin + cliente)
- **Database:** PostgreSQL 16 + Redis 7
- **Deployment:** Docker Compose

## 📁 Directory Structure

### Backend (`backend/`)
```
backend/
├── src/
│   ├── db/
│   │   ├── migrations/          # 6 SQL migration files
│   │   │   ├── 001-create-users.sql
│   │   │   ├── 002-create-clientes.sql
│   │   │   ├── 003-create-cliente-logins.sql
│   │   │   ├── 004-create-insights-snapshots.sql
│   │   │   ├── 005-create-mensagens-enviadas.sql
│   │   │   └── 006-create-analises-ia.sql
│   │   ├── client.ts            # PostgreSQL connection (postgres.js)
│   │   ├── migrate.ts           # Migration runner script
│   │   └── seed.ts              # Database seeding script
│   ├── index.ts                 # Entry point
│   └── ...
├── dist/                        # Compiled output
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config (ES2020, strict)
└── node_modules/
```

**Key Files:**
- [backend/package.json](backend/package.json) - Express 5.2.1, postgres 3.4.4, redis 4.6.11, bullmq 5.4.8, @anthropic-ai/sdk 0.12.0
- [backend/tsconfig.json](backend/tsconfig.json) - TypeScript ES2020, strict mode
- [backend/src/index.ts](backend/src/index.ts) - Server entry point

**Scripts:**
- `npm run db:migrate` - Execute all SQL migrations
- `npm run db:seed` - Create initial admin user
- `npm run build` - Compile TypeScript
- `npm run dev` - Development server (ts-node)

### Frontend Admin (`frontend-admin/`)
```
frontend-admin/
├── src/
│   ├── main.tsx                 # React entry point
│   └── App.tsx                  # Root component
├── index.html                   # HTML template
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript config
├── tsconfig.node.json           # Vite TypeScript config
├── package.json                 # React + Vite
├── dist/                        # Built output
└── node_modules/
```

**URL:** http://localhost:5173 (dev) / admin.movebusiness.com.br (prod)  
**Purpose:** Admin dashboard for MOVE team to manage clients, view insights, trigger reports

### Frontend Cliente (`frontend-cliente/`)
```
frontend-cliente/
├── src/
│   ├── main.tsx                 # React entry point
│   └── App.tsx                  # Root component
├── index.html                   # HTML template
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript config
├── tsconfig.node.json           # Vite TypeScript config
├── package.json                 # React + Vite
├── dist/                        # Built output
└── node_modules/
```

**URL:** http://localhost:5174 (dev) / app.movebusiness.com.br (prod)  
**Purpose:** Client portal for traffic clients to view reports and account insights

### Root Configuration
```
./
├── package.json                 # Monorepo with npm workspaces
├── docker-compose.yml           # PostgreSQL 16 + Redis 7
├── .env                         # Environment variables (gitignored)
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore rules
└── CLAUDE.md                    # Project specification
```

**Root Scripts:**
- `npm run dev` - Start all dev servers
- `npm run build` - Build all workspaces
- `npm run db:migrate` - Run migrations
- `npm run db:seed` - Seed database
- `npm run meta:check-token` - Verify Meta API token

## 🗄️ Database Schema

### 6 Tables (from migrations 001-006)

1. **users** (admin team)
   - id, nome, email, senha_hash, role, ativo, created_at, last_login_at

2. **clientes** (traffic clients)
   - id, nome, empresa, nicho, email
   - ad_accounts (JSONB), contatos (JSONB)
   - report scheduling: frequency, day, hour, timezone
   - billing: valor_mensal, dia_vencimento, reminder settings
   - observacoes (internal notes, never shown to client)

3. **cliente_logins** (client credentials)
   - id, cliente_id, email, senha_hash
   - senha_provisoria flag (forces change on first login)

4. **insights_snapshots** (Meta API data)
   - KPIs: spend, impressions, reach, clicks, ctr, cpc, cpm, frequency
   - Conversions: leads, messaging_started, purchases, purchase_value
   - JSONB: campaigns, ads, demographics, daily_series, raw_response

5. **mensagens_enviadas** (WhatsApp log)
   - cliente_id, tipo, destinatario_phone, status
   - whatsapp_msg_id, triggered_by (audit)

6. **analises_ia** (Claude API results)
   - cliente_id, periodo, analise_texto, recomendacoes
   - tokens_input, tokens_output, custo_usd tracking

## 🔐 Authentication Architecture

**Two Separate Auth Systems:**

### Admin Auth (`/api/admin/*`)
- Session-based with httpOnly cookies
- Users table + bcryptjs hashing
- Requires role='admin'

### Client Auth (`/api/cliente/*`)
- Session-based with httpOnly cookies
- ClienteLogins table + bcryptjs hashing
- Requires senha_provisoria flag check on first login

## 📊 Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| DATABASE_URL | ✅ | postgresql://movedev:movesecret123@localhost:5432/move_insights | PostgreSQL connection |
| REDIS_URL | ✅ | redis://localhost:6379 | Redis cache |
| META_SYSTEM_USER_TOKEN | ✅ | [API token] | Meta API v25.0 |
| META_BUSINESS_ID | ⚠️ | - | Meta business ID |
| ANTHROPIC_API_KEY | ⚠️ | - | Claude API key |
| SESSION_SECRET | ✅ | [generated] | Cookie encryption |
| SEED_ADMIN_EMAIL | ✅ | contato@movebusiness.com.br | Initial admin |
| SEED_ADMIN_PASSWORD | ✅ | mudar-no-primeiro-login | Initial password |
| PORT | ✅ | 3001 | Backend port |
| NODE_ENV | ✅ | development | Environment |

## 🚀 Quick Start

```bash
# 1. Install
npm install

# 2. Start infrastructure
docker-compose up -d

# 3. Initialize DB
npm run db:migrate
npm run db:seed

# 4. Run dev servers
npm run dev
```

## 📝 File Checklist

### Backend ✅
- [x] package.json with all dependencies
- [x] tsconfig.json (ES2020, strict)
- [x] src/db/client.ts (postgres.js)
- [x] src/db/migrate.ts (migration runner)
- [x] src/db/seed.ts (initial data)
- [x] src/db/migrations/001-006 (6 SQL files)
- [x] src/index.ts (entry point)
- [x] Builds without errors
- [x] npm scripts: db:migrate, db:seed

### Frontend Admin ✅
- [x] package.json with React + Vite
- [x] tsconfig.json (React JSX)
- [x] tsconfig.node.json (Vite config)
- [x] vite.config.ts (port 5173, API proxy)
- [x] index.html (React root)
- [x] src/main.tsx (React render)
- [x] src/App.tsx (placeholder component)
- [x] Builds without errors

### Frontend Cliente ✅
- [x] package.json with React + Vite
- [x] tsconfig.json (React JSX)
- [x] tsconfig.node.json (Vite config)
- [x] vite.config.ts (port 5174, API proxy)
- [x] index.html (React root)
- [x] src/main.tsx (React render)
- [x] src/App.tsx (placeholder component)
- [x] Builds without errors

### Root Config ✅
- [x] package.json (npm workspaces)
- [x] docker-compose.yml (Postgres 16 + Redis 7)
- [x] .env (configured)
- [x] .env.example (template)
- [x] .gitignore (secrets + builds)

### Documentation ✅
- [x] SETUP.md (installation guide)
- [x] SPRINT-1-STATUS.md (completion report)
- [x] PROJECT-INDEX.md (this file)
- [x] CLAUDE.md (original specification)

## 🎯 Sprint 1 Milestones

- ✅ **1.1** - Folder structure (backend + 2 frontends)
- ✅ **1.2** - Migrations 001-006 created
- ✅ **1.3** - Database scripts (migrate, seed)
- ✅ **1.4** - Build system configured
- ✅ **1.5** - Environment variables
- ⏳ **1.6** - Auth admin backend (next)
- ⏳ **1.7** - Auth cliente backend (next)
- ⏳ **1.8** - Frontend admin login page (next)
- ⏳ **1.9** - Frontend cliente login page (next)
- ⏳ **1.10** - Integration tests (next)
- ⏳ **1.11** - Documentation (in progress)

## 📚 Important Files to Know

### Specification
- [CLAUDE.md](CLAUDE.md) - Full project specification (9 sprints)

### Configuration
- [.env.example](.env.example) - Environment template
- [docker-compose.yml](docker-compose.yml) - Infrastructure
- [package.json](package.json) - Monorepo root

### Backend
- [backend/tsconfig.json](backend/tsconfig.json) - TypeScript settings
- [backend/package.json](backend/package.json) - Dependencies
- [backend/src/db/client.ts](backend/src/db/client.ts) - DB connection
- [backend/src/db/migrations/](backend/src/db/migrations/) - All SQL files

### Frontend Admin
- [frontend-admin/vite.config.ts](frontend-admin/vite.config.ts) - Build config
- [frontend-admin/package.json](frontend-admin/package.json) - Dependencies

### Frontend Cliente
- [frontend-cliente/vite.config.ts](frontend-cliente/vite.config.ts) - Build config
- [frontend-cliente/package.json](frontend-cliente/package.json) - Dependencies

## 🔗 External Resources

- **Meta API:** v25.0 (System User token)
- **Claude API:** Anthropic SDK v0.12.0
- **WhatsApp:** whatsapp-web.js with persistent session
- **Database:** PostgreSQL 16 (Docker)
- **Cache:** Redis 7 (Docker)

## 👤 Team Info

- **Owner:** Lucas Macena
- **Email:** contato@movebusiness.com.br
- **Phone:** 28082808
- **Organization:** MOVE Business Strategy (Cambé-PR)
- **Other Project:** ChatMOVE (retired, WhatsApp integration being reused)

## 📅 Timeline

- **Sprint 1:** Foundation (✅ ~75% complete)
- **Sprint 2-3:** Core Features (Auth, Insights, Dashboard)
- **Sprint 4-5:** Reports & Billing (WhatsApp, Automation)
- **Sprint 6-7:** Analytics & AI (Claude integration)
- **Sprint 8-9:** Polish & Deployment (Optimization, Production)

---

**Last Updated:** 2026-05-26  
**Status:** Development  
**Environment:** PostgreSQL 16, Redis 7, Node.js 20+, npm 10+
