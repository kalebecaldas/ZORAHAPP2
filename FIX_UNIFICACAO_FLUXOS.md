# ✅ Unificação dos Fluxos de Cadastro

## 🎯 Problema Identificado

Existiam **dois fluxos paralelos** com nós duplicados:

### Fluxo 1: Cadastro Novo
```
msg_cadastro_sucesso 
  → action_get_procedimentos_insurance 
  → msg_procedimentos_insurance 
  → transfer_to_queue
```

### Fluxo 2: Paciente Encontrado
```
msg_paciente_encontrado 
  → action_get_procedimentos_insurance_encontrado ❌ (DUPLICADO)
  → msg_procedimentos_insurance_encontrado ❌ (DUPLICADO)
  → transfer_to_queue_encontrado ❌ (DUPLICADO)
```

## 🔧 Solução Aplicada

**Unificação completa:** Ambos os fluxos agora usam os **mesmos nós**.

### Fluxo Unificado
```
msg_cadastro_sucesso ─┐
                      ├→ action_get_procedimentos_insurance
msg_paciente_encontrado┘     ↓
                         msg_procedimentos_insurance
                              ↓
                         transfer_to_queue
```

## 📊 Resultados

| Antes | Depois | Mudança |
|-------|--------|---------|
| **31 nós** | **28 nós** | ✅ -3 nós (mais limpo) |
| **35 conexões** | **33 conexões** | ✅ -2 conexões |
| **Código duplicado** | **Código unificado** | ✅ Manutenção mais fácil |

### Nós Removidos:
1. ❌ `action_get_procedimentos_insurance_encontrado`
2. ❌ `msg_procedimentos_insurance_encontrado`
3. ❌ `transfer_to_queue_encontrado`

## ✅ Código Atualizado

### `src/services/workflow/executors/messageExecutor.ts`

Adicionado auto-advance para ambos os nós:

```typescript
const shouldAutoAdvance = 
  node.id === 'msg_solicita_cadastro' ||
  node.id === 'msg_cadastro_sucesso' ||      // ✅ Auto-avança
  node.id === 'msg_paciente_encontrado';     // ✅ Auto-avança
```

## 🎯 Fluxo Completo Agora

### Cenário 1: Paciente Novo

```
1. Usuário: "quero agendar"
   ↓
2. GPT_RESPONSE: classifica intenção
   ↓
3. DATA_COLLECTION: coleta dados (nome, CPF, email, convênio)
   ↓
4. CONDITION: valida dados
   ↓
5. ACTION: create_patient (cria no banco)
   ↓
6. MESSAGE: msg_cadastro_sucesso
   "✅ Cadastro realizado com sucesso!"
   ↓ ✅ AUTO-AVANÇA
7. ACTION: action_get_procedimentos_insurance
   (busca procedimentos do convênio)
   ↓
8. MESSAGE: msg_procedimentos_insurance
   "🩺 Procedimentos disponíveis: ..."
   ↓ ✅ AUTO-AVANÇA
9. TRANSFER_HUMAN: transfer_to_queue
   "⏳ Você foi encaminhado para um atendente!"
```

### Cenário 2: Paciente Já Cadastrado

```
1. Usuário: "quero agendar"
   ↓
2. GPT_RESPONSE: classifica intenção
   ↓
3. ACTION: search_patient (busca por telefone)
   ↓
4. CONDITION: patient_found (encontrou)
   ↓
5. MESSAGE: msg_paciente_encontrado
   "✅ Paciente encontrado! Bem-vindo de volta!"
   ↓ ✅ AUTO-AVANÇA
6. ACTION: action_get_procedimentos_insurance (MESMO NÓ!)
   (busca procedimentos do convênio)
   ↓
7. MESSAGE: msg_procedimentos_insurance (MESMO NÓ!)
   "🩺 Procedimentos disponíveis: ..."
   ↓ ✅ AUTO-AVANÇA
8. TRANSFER_HUMAN: transfer_to_queue (MESMO NÓ!)
   "⏳ Você foi encaminhado para um atendente!"
```

## 💾 Backup

Antes de qualquer mudança, um backup foi criado:
- `workflow_backup_1764181057554.json`

Se precisar reverter, use:
```bash
npm run restore:workflow:backup workflow_backup_1764181057554.json
```

## 🚀 Deploy

### Local
✅ Já aplicado

### Railway

**Opção 1: Automático (via GitHub)**
```bash
git add -A
git commit -m "fix: unificar fluxos de cadastro novo e paciente encontrado"
git push origin main
```

**Opção 2: Manual (via Railway CLI)**
```bash
railway up
```

**Após deploy:**
```bash
railway ssh
npm run check:workflow:railway
```

## ✅ Verificação

Teste ambos os cenários:

### Teste 1: Cadastro Novo
1. Use um número que não está no banco
2. Envie "quero agendar"
3. Preencha todos os dados
4. Confirme com "sim"
5. **Resultado esperado:**
   - Mostra "Cadastro realizado"
   - Mostra lista de procedimentos
   - Transfere para fila
   - **Tudo automaticamente, sem pausas**

### Teste 2: Paciente Existente
1. Use um número que já está no banco
2. Envie "quero agendar"
3. **Resultado esperado:**
   - Mostra "Paciente encontrado"
   - Mostra lista de procedimentos
   - Transfere para fila
   - **Tudo automaticamente, sem pausas**

## 📋 Resumo

- ✅ Fluxos unificados: menos código, mais fácil de manter
- ✅ Auto-advance configurado: fluxo contínuo sem pausas
- ✅ Workflow mais limpo: 28 nós vs 31 nós
- ✅ Comportamento consistente: ambos os cenários funcionam igual
- ✅ Backup criado: segurança para reverter se necessário

---

**Status:** RESOLVIDO ✅

Deploy pendente no Railway.

