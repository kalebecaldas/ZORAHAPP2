# Sistema de Hierarquia e Permissões de Usuários

## 📋 Resumo da Implementação

Foi criado um sistema completo de configuração de permissões baseado em hierarquia de usuários, permitindo que MASTER e ADMIN configurem quais funcionalidades cada tipo de usuário pode acessar.

---

## 🎯 Funcionalidades Implementadas

### 1. **Botão de Configuração de Hierarquia**
- Localização: Página de Usuários (`/users`)
- Ícone: Shield (escudo)
- Cor: Roxo
- Visível apenas para MASTER e ADMIN

### 2. **Modal com Abas por Role**
O modal possui 4 abas, uma para cada tipo de usuário:

#### Roles Disponíveis:
- **Master** (Roxo) - Acesso total, não pode ser restringido
- **Administrador** (Vermelho) - Gerencia usuários e configurações
- **Supervisor** (Azul) - Supervisiona pacientes e conversas
- **Atendente** (Verde) - Atende conversas

### 3. **Permissões Configuráveis**

As seguintes funcionalidades podem ser ativadas/desativadas por role:

| Funcionalidade | Descrição | Padrão Master | Padrão Admin | Padrão Supervisor | Padrão Atendente |
|----------------|-----------|---------------|--------------|-------------------|------------------|
| **Conversas** | Acessar e gerenciar conversas com pacientes | ✅ | ✅ | ✅ | ✅ |
| **Pacientes** | Visualizar e gerenciar dados de pacientes | ✅ | ✅ | ✅ | ❌ |
| **Usuários** | Gerenciar usuários e hierarquia | ✅ | ✅ | ❌ | ❌ |
| **Configurações** | Acessar configurações da clínica | ✅ | ✅ | ❌ | ❌ |
| **Workflows** | Gerenciar fluxos de conversa | ✅ | ✅ | ❌ | ❌ |
| **Estatísticas** | Visualizar relatórios | ✅ | ✅ | ✅ | ❌ |
| **Configuração da IA** | Configurar comportamento da IA | ✅ | ✅ | ❌ | ❌ |
| **Teste do Bot** | Testar o bot antes do deploy | ✅ | ✅ | ❌ | ❌ |

---

## 🔧 Arquitetura Técnica

### **Backend**

#### Rota de Permissões: `/api/permissions`

**GET `/api/permissions`**
- Retorna permissões configuradas ou padrões
- Armazenado em `AuditLog` com `action: 'ROLE_PERMISSIONS'`
- Formato:
```json
{
  "permissions": {
    "MASTER": { "users": true, "settings": true, ... },
    "ADMIN": { "users": true, "settings": true, ... },
    "SUPERVISOR": { ... },
    "ATENDENTE": { ... }
  }
}
```

**PUT `/api/permissions`**
- Salva novas configurações de permissões
- Requer autenticação: MASTER ou ADMIN
- Cria registro em `AuditLog` para auditoria

**Arquivo:** `api/routes/permissions.ts`

---

### **Frontend**

#### 1. Hook de Permissões: `usePermissions`

**Arquivo:** `src/hooks/usePermissions.ts`

Funções disponíveis:
```typescript
const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions();

// Verificar permissão única
if (hasPermission('users')) { ... }

// Verificar múltiplas permissões (OR)
if (hasAnyPermission(['users', 'settings'])) { ... }

// Verificar múltiplas permissões (AND)
if (hasAllPermissions(['users', 'settings'])) { ... }
```

#### 2. Componente Modal: `PermissionsModal`

**Arquivo:** `src/pages/Users.tsx`

Features:
- Interface com abas responsiva
- Toggle switches para cada permissão
- Badge "Sempre ativo" para MASTER
- Loading state durante carregamento
- Saving state durante salvamento
- Descrições contextuais por role

#### 3. Proteção de Rotas

**Arquivo:** `src/App.tsx`

Todas as rotas agora verificam permissões:
```tsx
<Route path="/users" element={
  <ProtectedRoute permission="users">
    <Users />
  </ProtectedRoute>
} />
```

Se o usuário não tiver permissão, é redirecionado para `/dashboard`.

#### 4. Sidebar Dinâmica

**Arquivo:** `src/components/Sidebar.tsx`

A sidebar agora:
- Oculta automaticamente itens sem permissão
- Usa `hasPermission()` para filtrar menu
- Dashboard sempre visível (sem permissão requerida)

---

## 🎨 Design e UX

### Visual do Modal

- **Header:** Título com ícone Shield e botão fechar
- **Abas:** 4 tabs coloridas (uma por role)
- **Card Informativo:** Explica cada role com ícone
- **Lista de Permissões:** Cards com toggle switches
- **Footer:** Botões Cancelar e Salvar com loading state

### Estados Visuais

1. **Loading:** Spinner com mensagem
2. **Saving:** Botão com spinner e texto "Salvando..."
3. **Master:** Toggles desabilitados com badge "Sempre ativo"
4. **Hover:** Destaque suave nos cards de permissão

---

## 📁 Arquivos Modificados

### Novos Arquivos
- ✨ `src/hooks/usePermissions.ts` - Hook de permissões

### Arquivos Modificados
- 🔧 `src/pages/Users.tsx` - Botão e modal de hierarquia
- 🔧 `src/components/Sidebar.tsx` - Filtro de menu por permissão
- 🔧 `src/App.tsx` - Proteção de rotas
- 🔧 `api/routes/permissions.ts` - Atualização de defaults

---

## 🔐 Regras de Segurança

1. **Master é Intocável:** Permissões de MASTER não podem ser alteradas via UI
2. **Auditoria:** Todas as mudanças são registradas em `AuditLog`
3. **Autenticação Obrigatória:** Endpoints requerem JWT válido
4. **Autorização Hierárquica:** Apenas MASTER e ADMIN podem alterar permissões
5. **Fallback Seguro:** Em caso de erro, usa permissões padrão seguras
6. **Redirect Automático:** Usuários sem permissão são redirecionados

---

## 🚀 Como Usar

### Para Configurar Permissões:

1. Acesse `/users` como MASTER ou ADMIN
2. Clique no botão **"Configurar Hierarquia"** (roxo, com escudo)
3. Selecione a aba do role desejado
4. Ative/desative permissões usando os toggles
5. Clique em **"Salvar Permissões"**
6. As mudanças são aplicadas imediatamente

### Para Usuários:

- Ao fazer login, o sistema carrega permissões do role
- Apenas páginas/funcionalidades permitidas aparecem no menu
- Tentativas de acesso direto à rota são bloqueadas
- Redirecionamento automático para Dashboard se sem permissão

---

## 🧪 Testando o Sistema

### Cenário 1: Atendente
- Login como ATENDENTE
- Verificar menu: apenas Dashboard e Conversas
- Tentar acessar `/users` diretamente → Redireciona para `/dashboard`

### Cenário 2: Supervisor
- Login como SUPERVISOR
- Verificar menu: Dashboard, Conversas, Pacientes, Estatísticas
- Não vê Usuários, Configurações, Workflows, etc.

### Cenário 3: Admin
- Login como ADMIN
- Acessa `/users`
- Clica em "Configurar Hierarquia"
- Remove permissão "stats" de SUPERVISOR
- Salva
- Usuários SUPERVISOR não veem mais Estatísticas

---

## 📊 Benefícios

✅ **Segurança:** Controle granular de acesso  
✅ **Flexibilidade:** Permissões customizáveis por empresa  
✅ **UX:** Interface intuitiva com feedback visual  
✅ **Auditoria:** Histórico completo em AuditLog  
✅ **Performance:** Permissões carregadas 1x por sessão  
✅ **Escalável:** Fácil adicionar novas permissões  

---

## 🔮 Possíveis Extensões Futuras

- [ ] Permissões por funcionalidade específica (ex: "Editar Paciente" vs "Ver Paciente")
- [ ] Permissões temporárias com data de expiração
- [ ] Grupos de permissões customizados além dos roles
- [ ] Logs de auditoria na interface
- [ ] Permissões por clínica/unidade
- [ ] Exportar/importar configurações de permissões

---

**Implementado em:** 25/01/2026  
**Status:** ✅ Completo e Funcional
