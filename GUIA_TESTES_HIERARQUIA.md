# 🧪 Guia de Testes - Sistema de Hierarquia de Usuários

## Como Testar a Implementação

### 1️⃣ Acessar a Página de Configuração

1. Faça login como **MASTER** ou **ADMIN**
2. No menu lateral, clique em **"Usuários"**
3. Você verá dois botões no topo:
   - 🟦 Azul: "Novo Usuário"
   - 🟪 Roxo: "Configurar Hierarquia" ← **CLIQUE AQUI**

---

### 2️⃣ Explorar o Modal de Permissões

O modal abrirá com 4 abas:

#### 🟪 Master (Roxo)
- Todas as permissões **sempre ativas**
- Toggles **desabilitados** (não pode alterar)
- Badge "Sempre ativo" em cada item

#### 🟥 Administrador (Vermelho)
- Padrão: Todas permissões ativas
- Pode ser customizado

#### 🟦 Supervisor (Azul)
- Padrão: Conversas, Pacientes, Estatísticas
- Sem acesso a config, users, workflows, etc.

#### 🟩 Atendente (Verde)
- Padrão: Apenas Conversas
- Acesso mais restrito

---

### 3️⃣ Modificar Permissões (Exemplo)

**Cenário:** Remover acesso a "Estatísticas" do Supervisor

1. Clique na aba **"Supervisor"**
2. Localize o item **"Estatísticas"**
3. Clique no **toggle à direita** para desativar (ficará cinza)
4. Clique em **"Salvar Permissões"**
5. Aguarde mensagem de sucesso: ✅ "Permissões atualizadas com sucesso"

---

### 4️⃣ Verificar Efeitos no Sistema

#### A) Teste no Menu Lateral

1. Faça login com um usuário **SUPERVISOR**
2. Observe o menu lateral:
   - ✅ Dashboard aparece
   - ✅ Conversas aparece
   - ✅ Pacientes aparece
   - ❌ Estatísticas **NÃO** aparece (se você desativou)
   - ❌ Usuários não aparece
   - ❌ Configurações não aparece

#### B) Teste de Acesso Direto (Proteção de Rota)

1. Ainda logado como **SUPERVISOR**
2. Na barra de URL, tente acessar: `http://localhost:4002/stats`
3. O sistema deve:
   - Mostrar um loading rápido
   - **Redirecionar automaticamente** para `/dashboard`
   - Não deixar ver a página

#### C) Teste com Atendente

1. Faça login com usuário **ATENDENTE**
2. Menu lateral deve mostrar apenas:
   - ✅ Dashboard
   - ✅ Conversas
3. Tente acessar `/patients` na URL:
   - Deve redirecionar para `/dashboard`

---

### 5️⃣ Testar Diferentes Configurações

#### Exemplo 1: Dar acesso a Pacientes para Atendente

1. Login como MASTER/ADMIN
2. Configurar Hierarquia → Aba **Atendente**
3. Ativar toggle de **"Pacientes"**
4. Salvar
5. Login como ATENDENTE
6. Verificar que "Pacientes" agora aparece no menu

#### Exemplo 2: Permitir Workflows para Supervisor

1. Login como MASTER/ADMIN
2. Configurar Hierarquia → Aba **Supervisor**
3. Ativar toggle de **"Workflows"**
4. Salvar
5. Login como SUPERVISOR
6. "Workflows" aparece no menu e pode acessar

---

### 6️⃣ Verificar Visual do Modal

#### Elementos a Checar:

✅ **Header:**
- Título "Configurar Hierarquia de Usuários"
- Subtítulo explicativo
- Botão X para fechar

✅ **Abas:**
- 4 tabs com cores diferentes
- Indicador visual da aba ativa (borda inferior)

✅ **Card Informativo (azul):**
- Ícone Shield
- Texto descritivo do role atual

✅ **Lista de Permissões:**
- 8 itens (Conversas, Pacientes, Usuários, etc.)
- Descrição abaixo de cada nome
- Toggle à direita de cada item

✅ **Footer:**
- Botão "Cancelar" (cinza)
- Botão "Salvar Permissões" (azul, com ícone Shield)

---

### 7️⃣ Testar Estados de Loading

#### Loading Inicial:
1. Abrir modal
2. Ver spinner com "Carregando permissões..."

#### Saving State:
1. Modificar uma permissão
2. Clicar "Salvar"
3. Botão deve mostrar:
   - Spinner girando
   - Texto "Salvando..."
   - Ficar desabilitado temporariamente

---

### 8️⃣ Testar Auditoria (Opcional)

1. Acesse o banco de dados
2. Execute:
```sql
SELECT * FROM "AuditLog" 
WHERE action = 'ROLE_PERMISSIONS' 
ORDER BY "createdAt" DESC 
LIMIT 5;
```

3. Verificar que cada salvamento cria um registro com:
   - `actorId`: ID do usuário que salvou
   - `action`: `'ROLE_PERMISSIONS'`
   - `details`: JSON completo das permissões

---

## 🐛 Possíveis Problemas e Soluções

### Problema: Modal não abre
- **Causa:** Permissões no backend
- **Solução:** Verificar que usuário é MASTER ou ADMIN

### Problema: Permissões não salvam
- **Causa:** Erro na API
- **Solução:** Abrir console do browser (F12) e verificar erro
- **Check:** Endpoint `/api/permissions` está acessível?

### Problema: Menu não atualiza após salvar
- **Causa:** Cache do frontend
- **Solução:** Fazer logout e login novamente

### Problema: Usuário MASTER vê toggles ativos mas não consegue alterar
- **Causa:** Comportamento esperado (segurança)
- **Solução:** Não é um bug, é feature de proteção

---

## 📋 Checklist Completo

- [ ] Modal abre ao clicar no botão roxo
- [ ] 4 abas aparecem e são clicáveis
- [ ] Permissões de MASTER não podem ser alteradas
- [ ] Toggles funcionam nas outras 3 abas
- [ ] Salvar cria toast de sucesso
- [ ] Menu lateral respeita permissões
- [ ] Rotas protegidas redirecionam usuários sem permissão
- [ ] Dashboard sempre acessível independente de permissões
- [ ] Loading state aparece durante carregamento
- [ ] Saving state aparece durante salvamento
- [ ] Auditoria registra mudanças no banco

---

## 🎯 Casos de Uso Reais

### Caso 1: Recepcionista
**Cenário:** Atendente que só responde WhatsApp

**Configuração:**
- Role: ATENDENTE
- Permissões: Apenas "Conversas"

**Resultado:** 
- Só vê dashboard e conversas
- Não pode ver dados de pacientes
- Não pode acessar configurações

---

### Caso 2: Enfermeira Coordenadora
**Cenário:** Gerencia agendamentos e pacientes

**Configuração:**
- Role: SUPERVISOR
- Permissões: Conversas + Pacientes + Estatísticas

**Resultado:**
- Vê conversas e pode assumir
- Acessa lista de pacientes
- Visualiza relatórios
- Não mexe em configurações

---

### Caso 3: Gerente da Clínica
**Cenário:** Gerencia tudo exceto usuários

**Configuração:**
- Role: ADMIN
- Permissões: Todas exceto "Usuários"

**Resultado:**
- Acesso total ao sistema
- Não pode criar/editar usuários
- Pode configurar permissões de outros

---

**Data:** 25/01/2026  
**Status:** Pronto para testar ✅
