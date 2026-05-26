# 🔐 Auth Endpoints - MOVE Insights

## Endpoints de Autenticação

### Admin Auth

#### POST /api/auth/admin/login
Login para usuários MOVE (admin)

**Request:**
```bash
curl -X POST http://localhost:3001/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "contato@movebusiness.com.br",
    "senha": "mudar-no-primeiro-login"
  }'
```

**Response (200):**
```json
{
  "message": "Login realizado com sucesso",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "contato@movebusiness.com.br",
    "nome": "Lucas Macena",
    "role": "admin"
  }
}
```

**Set-Cookie:**
```
admin_session={"id":"...","email":"...","nome":"...","role":"admin"}; Path=/; HttpOnly; SameSite=Lax
```

**Errors:**
- 400: Email e senha são obrigatórios
- 401: Email ou senha inválidos
- 401: Usuário inativo

---

#### POST /api/auth/admin/logout
Logout (requer cookie válido)

**Request:**
```bash
curl -X POST http://localhost:3001/api/auth/admin/logout \
  -H "Cookie: admin_session=..." \
  -H "Content-Type: application/json"
```

**Response (200):**
```json
{
  "message": "Logout realizado com sucesso"
}
```

**Limpa Cookie:**
```
admin_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly
```

---

### Cliente Auth

#### POST /api/cliente/auth/login
Login para clientes de tráfego

**Request:**
```bash
curl -X POST http://localhost:3001/api/cliente/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cliente@example.com",
    "senha": "senha_do_cliente"
  }'
```

**Response (200):**
```json
{
  "message": "Login realizado com sucesso",
  "cliente": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "cliente_id": "770e8400-e29b-41d4-a716-446655440002",
    "email": "cliente@example.com",
    "cliente_nome": "Agência XYZ",
    "senha_provisoria": true
  },
  "senha_provisoria": true
}
```

**Set-Cookie:**
```
cliente_session={"id":"...","cliente_id":"...","email":"...","cliente_nome":"...","senha_provisoria":true}; Path=/; HttpOnly; SameSite=Lax
```

**Nota:** Se `senha_provisoria` é `true`, frontend deve forçar mudança de senha antes de qualquer outra ação.

**Errors:**
- 400: Email e senha são obrigatórios
- 401: Email ou senha inválidos

---

#### POST /api/cliente/auth/logout
Logout do cliente (requer cookie válido)

**Request:**
```bash
curl -X POST http://localhost:3001/api/cliente/auth/logout \
  -H "Cookie: cliente_session=..." \
  -H "Content-Type: application/json"
```

**Response (200):**
```json
{
  "message": "Logout realizado com sucesso"
}
```

---

## Health Check

#### GET /health
Verifica status do servidor

**Request:**
```bash
curl http://localhost:3001/health
```

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-05-26T14:30:00.000Z"
}
```

---

## Testando Localmente

### 1. Inicie o servidor
```bash
npm run db:migrate    # Criar tabelas
npm run db:seed       # Criar admin
npm run dev           # Iniciar backend
```

### 2. Teste o health check
```bash
curl http://localhost:3001/health
# Deve retornar { "status": "ok" }
```

### 3. Teste login do admin
```bash
# Credenciais do seed
EMAIL="contato@movebusiness.com.br"
SENHA="mudar-no-primeiro-login"

curl -X POST http://localhost:3001/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"senha\": \"$SENHA\"
  }"
```

### 4. Teste logout do admin (com cookie)
```bash
# Capture o cookie da resposta anterior
COOKIE="admin_session=..."

curl -X POST http://localhost:3001/api/auth/admin/logout \
  -H "Cookie: $COOKIE" \
  -H "Content-Type: application/json"
```

---

## CORS & Cookies

**CORS Configurado:**
- Origin: http://localhost:5173 (admin) / http://localhost:5174 (cliente)
- Credentials: true (permite envio de cookies)
- Methods: GET, POST, PUT, DELETE, OPTIONS
- Headers: Content-Type

**Cookies:**
- HttpOnly: true (não acessível via JavaScript - segurança contra XSS)
- Secure: true (production) / false (development)
- SameSite: Lax (proteção contra CSRF)
- MaxAge: 7 dias

---

## Segurança

✅ Senhas hashadas com bcryptjs (não salvas em cookies)  
✅ Sessão em JSON seguro no cookie  
✅ HttpOnly previne XSS attacks  
✅ SameSite previne CSRF attacks  
✅ last_login_at atualizado no banco a cada login  
✅ Força muda de senha em primeira login de cliente (senha_provisoria flag)  

---

## Próximos Passos

**Frontend Admin (1.8):**
- Página /login com form email + senha
- Chama POST /api/auth/admin/login
- Redireciona para /dashboard se sucesso
- Mostra erro se falhar

**Frontend Cliente (1.9):**
- Página /login com form email + senha
- Chama POST /api/cliente/auth/login
- Se senha_provisoria, redireciona para /trocar-senha
- Depois redireciona para /relatorio

---

**Status:** ✅ 1.6 + 1.7 Completo (endpoints funcionando)  
**Próximo:** 1.8 + 1.9 (Frontend login pages)
