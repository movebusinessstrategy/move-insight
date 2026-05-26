# 🚀 MOVE Insights - Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Infrastructure
```bash
docker-compose up -d
```

Wait for health checks to pass:
```bash
docker ps  # Should show healthy postgres and redis
```

### 3. Initialize Database
```bash
npm run db:migrate    # Run all SQL migrations
npm run db:seed       # Create admin user
```

### 4. Verify Setup
```bash
# Check Meta API token
npm run meta:check-token

# Start backend dev server
cd backend && npm run dev

# In another terminal, start frontend-admin
cd frontend-admin && npm run dev

# In another terminal, start frontend-cliente
cd frontend-cliente && npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and fill required values:

| Variable | Purpose | Status |
|----------|---------|--------|
| DATABASE_URL | PostgreSQL connection | ✅ Configured |
| REDIS_URL | Redis cache | ✅ Configured |
| META_SYSTEM_USER_TOKEN | Meta API v25.0 | ✅ Provided |
| META_BUSINESS_ID | Business ID | ⚠️ Needs your value |
| ANTHROPIC_API_KEY | Claude API | ⚠️ Needs your value |
| SESSION_SECRET | Cookie encryption | ✅ Generated |
| SEED_ADMIN_NOME | Initial admin name | ✅ Lucas Macena |
| SEED_ADMIN_EMAIL | Initial admin email | ✅ contato@movebusiness.com.br |
| SEED_ADMIN_PASSWORD | Initial password | ✅ mudar-no-primeiro-login |

## Project Structure

```
Disparador/
├── backend/                      # Express API
│   ├── src/
│   │   ├── db/
│   │   │   ├── migrations/       # 6 SQL files (001-006)
│   │   │   ├── client.ts         # postgres.js connection
│   │   │   ├── migrate.ts        # Migration runner
│   │   │   └── seed.ts           # Initial data
│   │   ├── index.ts              # Entry point
│   │   └── ... (more coming)
│   ├── package.json
│   ├── tsconfig.json
│   └── dist/                     # Compiled output
│
├── frontend-admin/               # Admin dashboard (admin.movebusiness.com.br)
│   ├── src/
│   ├── package.json
│   └── ... (coming in Sprint 2)
│
├── frontend-cliente/             # Client app (app.movebusiness.com.br)
│   ├── src/
│   ├── package.json
│   └── ... (coming in Sprint 2)
│
├── docker-compose.yml            # PostgreSQL + Redis
├── package.json                  # Monorepo config
├── .env                          # Environment variables
└── .env.example                  # Template
```

## Database Schema

**6 Tables:**
1. `users` - Admin team members
2. `clientes` - Traffic clients
3. `cliente_logins` - Client login credentials (separate from users)
4. `insights_snapshots` - Meta API data snapshots
5. `mensagens_enviadas` - WhatsApp message log
6. `analises_ia` - Claude API analysis results

**Key Relationships:**
- Clientes have many InsightsSnapshots, MensagensEnviadas, AnalisesIA
- ClienteLogins references Clientes (forced password change on first login)
- AnalisesIA references Users (who initiated the analysis)

## URLs

| Service | Dev URL | Production |
|---------|---------|------------|
| Backend API | http://localhost:3001 | api.movebusiness.com.br |
| Admin Frontend | http://localhost:5173 | admin.movebusiness.com.br |
| Cliente Frontend | http://localhost:5174 | app.movebusiness.com.br |

## API Endpoints (Coming)

All endpoints are prefixed with `/api/`

### Admin Auth
- POST `/auth/admin/login` - Login
- POST `/auth/admin/logout` - Logout

### Client Auth  
- POST `/cliente/auth/login` - Login
- POST `/cliente/auth/logout` - Logout

### Insights (Admin only)
- GET `/admin/insights/clients` - List clients
- POST `/admin/insights/fetch` - Fetch from Meta API
- GET `/admin/insights/:clientId` - View insights

### Reports (Both)
- GET `/relatorio/latest` - Latest report
- POST `/relatorio/enviar` - Send via WhatsApp

## Troubleshooting

### Database connection fails
```bash
# Check if postgres is running
docker ps | grep postgres

# Check logs
docker logs move_insights_db

# Restart if needed
docker-compose down
docker-compose up -d
```

### npm install fails
```bash
# Clean cache
rm -rf node_modules package-lock.json
npm install
```

### Migration errors
```bash
# Check database is ready
docker exec move_insights_db pg_isready -U movedev

# Re-run migrations
npm run db:migrate
```

### TypeScript compilation fails
```bash
# Check Node/npm versions
node --version   # Should be ≥ 20
npm --version    # Should be ≥ 10

# Rebuild
cd backend && npm run build
```

## Development Workflow

1. Create feature branch: `git checkout -b feature/something`
2. Make changes
3. Test locally
4. Commit: `git commit -m "DESCRIPTION"`
5. Push: `git push origin feature/something`
6. Create PR for review

## Next Steps (Sprint 2+)

- [ ] Implement auth endpoints
- [ ] Build frontend login pages
- [ ] Create dashboard layouts
- [ ] Connect to Meta API
- [ ] Implement WhatsApp integration
- [ ] Add report generation
- [ ] Setup billing system

---

**Sprint 1 Status:** ✅ Foundation Complete  
**Last Updated:** 2026-05-26
