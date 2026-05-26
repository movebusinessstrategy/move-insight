# 🔑 Login Pages - MOVE Insights (Sprint 1.8 + 1.9)

## Frontend Admin Login

**URL:** http://localhost:5173/  
**Arquivo:** `frontend-admin/src/pages/Login.tsx`

### Features
✅ Form com email + senha  
✅ Validação de campos obrigatórios  
✅ Integração com POST /api/auth/admin/login  
✅ Feedback visual de loading  
✅ Exibição de erros  
✅ Redirect para /dashboard após sucesso  
✅ Cookies automáticos (credentials: 'include')  

### Fluxo
1. User vê página de login (Admin Dashboard)
2. Entra email + senha
3. Clica "Entrar"
4. Frontend chama POST /api/auth/admin/login
5. Se sucesso → Backend retorna user + set cookie (admin_session)
6. Frontend redireciona para /dashboard

### Componentes
- `Login.tsx` - Página de login (form + estilos)
- `Router.tsx` - Gerencia rotas (login vs dashboard placeholder)
- `hooks/useAuth.ts` - Hook para logout

---

## Frontend Cliente Login

**URL:** http://localhost:5174/  
**Arquivo:** `frontend-cliente/src/pages/Login.tsx`

### Features
✅ Form com email + senha  
✅ Validação de campos obrigatórios  
✅ Integração com POST /api/cliente/auth/login  
✅ Feedback visual de loading  
✅ Exibição de erros  
✅ Detecta senha_provisoria flag  
✅ Redirect para /trocar-senha (se primeira vez)  
✅ Redirect para /relatorio (se já trocou senha)  
✅ Cookies automáticos (credentials: 'include')  

### Fluxo
1. User vê página de login (Portal do Cliente)
2. Entra email + senha
3. Clica "Entrar"
4. Frontend chama POST /api/cliente/auth/login
5. Se sucesso → Backend retorna cliente + check senha_provisoria
6. **Se senha_provisoria = true** → Redirect para /trocar-senha
7. **Se senha_provisoria = false** → Redirect para /relatorio

### Componentes
- `Login.tsx` - Página de login (form + estilos)
- `Router.tsx` - Gerencia rotas (login vs trocar-senha vs relatorio)
- `hooks/useAuth.ts` - Hook para logout

---

## Estrutura de Arquivos

```
frontend-admin/
├── src/
│   ├── App.tsx              ← Importa <Router />
│   ├── Router.tsx           ← Lógica de rotas
│   ├── pages/
│   │   └── Login.tsx        ← Página de login (form + CSS)
│   ├── hooks/
│   │   └── useAuth.ts       ← Hook de logout
│   └── main.tsx

frontend-cliente/
├── src/
│   ├── App.tsx              ← Importa <Router />
│   ├── Router.tsx           ← Lógica de rotas
│   ├── pages/
│   │   └── Login.tsx        ← Página de login (form + CSS)
│   ├── hooks/
│   │   └── useAuth.ts       ← Hook de logout
│   └── main.tsx
```

---

## Design

### Tema
- Cores: Branco + azul (#1a73e8)
- Tipografia: System fonts (macOS/Windows default)
- Layout: Card centralizado (max-width: 400px)
- Espaçamento: Generoso (40px padding)

### Componentes
- Input: border 1px #ddd, padding 10px, border-radius 4px
- Button: Azul (#1a73e8), full-width, 12px padding, hover escurece
- Error: Background #fee, color #c33, padding 10px
- Disabled state: opacity 0.6, cursor not-allowed

---

## TypeScript

✅ `LoginFormData` - Interface dos dados do form  
✅ `LoginError` - Interface de erro  
✅ `ClienteData` - Interface de response do login  
✅ `User` - Interface do usuário admin  
✅ `Cliente` - Interface do cliente  

---

## Como Testar

### 1. Start Servers
```bash
# Terminal 1: Backend
npm run db:migrate    # Criar tabelas
npm run db:seed       # Criar admin
npm run dev           # http://localhost:3001

# Terminal 2: Frontend Admin
cd frontend-admin && npm run dev    # http://localhost:5173

# Terminal 3: Frontend Cliente
cd frontend-cliente && npm run dev  # http://localhost:5174
```

### 2. Test Admin Login
```
URL: http://localhost:5173
Email: contato@movebusiness.com.br
Senha: mudar-no-primeiro-login
Expected: Redirect to /dashboard
```

### 3. Test Cliente Login
```
URL: http://localhost:5174
Email: (any cliente login email from DB)
Senha: (matching password)
Expected: Redirect to /trocar-senha or /relatorio
```

### 4. Test Logout
```
Click "Logout" button → Clears cookie → Redirects to /login
```

---

## CORS + Cookies

✅ Frontend envia `credentials: 'include'` nas requisições  
✅ Backend set-cookie com HttpOnly + SameSite=Lax  
✅ Browser gerencia cookies automaticamente  
✅ Próximas requisições enviam cookie automaticamente  

---

## Sprint 1 Status

✅ 1.1  Estrutura de pastas  
✅ 1.2  Migrations 001-006  
✅ 1.3  Scripts db:migrate + db:seed  
✅ 1.4  Build system (TypeScript)  
✅ 1.5  Environment variables  
✅ 1.6  Auth admin endpoints  
✅ 1.7  Auth cliente endpoints  
✅ 1.8  Frontend admin login page ← COMPLETED  
✅ 1.9  Frontend cliente login page ← COMPLETED  
⏳ 1.10 Integration tests  
⏳ 1.11 Documentation  

---

## Próximos Passos (Sprint 2)

- [ ] Proteger rotas com middleware (só acessa /dashboard se tem admin_session)
- [ ] Página /trocar-senha para cliente
- [ ] Página /dashboard placeholder
- [ ] Página /relatorio placeholder
- [ ] Real routing (React Router v6)
- [ ] Context de autenticação global

---

**Status:** ✅ 1.8 + 1.9 Completo (login pages renderizando)  
**Build:** ✅ Todos os 3 workspaces compilam sem erros  
**Próximo:** 1.10 Integration tests
