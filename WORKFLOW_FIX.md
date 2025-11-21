# Correção de Mensagem Duplicada - Workflow

## 🐛 Problema Identificado

### Sintoma:
Mensagem sendo enviada 2 vezes após seleção de unidade:

```
BOT: ✅ Você escolheu a Unidade Vieiralves!
     Você pode perguntar sobre consultas, nossos procedimentos ou convênios...
BOT: Você pode perguntar sobre consultas, nossos procedimentos ou convênios...  ← DUPLICADA
```

### Causa Raiz:
O workflow tinha uma conexão redundante:
- `clinic_selection` → `gpt_welcome` → `gpt_classifier`
- O nó `gpt_welcome` estava enviando a mesma mensagem que já estava incluída na resposta de `clinic_selection`

## ✅ Solução Aplicada

### 1. **Remoção de Conexão Redundante**
Removida a conexão intermediária através do nó `gpt_welcome`:

**Antes:**
```
clinic_selection (port: true)
    ↓
gpt_welcome (MESSAGE: "Você pode perguntar...")
    ↓
gpt_classifier
```

**Depois:**
```
clinic_selection (port: true)
    ↓
gpt_classifier
```

### 2. **Workflow Atualizado**
O workflow agora tem as seguintes conexões a partir de `clinic_selection`:

- **Port: true** → `gpt_classifier` (seleção válida)
- **Port: false** → `start` (tentar novamente)

### 3. **Nó gpt_welcome Mantido**
O nó `gpt_welcome` foi mantido no workflow mas sem conexões de saída, para preservar a estrutura e possibilitar uso futuro se necessário.

## 📊 Verificação

### Antes da Correção:
```bash
Conexões de clinic_selection:
  → start (port: false)
  → gpt_welcome (port: true)  ← PROBLEMA

Conexões de gpt_welcome: 1
  → gpt_classifier
```

### Após a Correção:
```bash
Conexões de clinic_selection:
  → start (port: false)
  → gpt_classifier (port: true)  ← CORRIGIDO

Conexões de gpt_welcome: 0  ← SEM CONEXÕES
```

## 🎯 Resultado Final

### Nova Experiência do Usuário:

```
USER: 1

BOT: ✅ Você escolheu a Unidade Vieiralves!
     
     Você pode perguntar sobre consultas, nossos procedimentos ou convênios. 
     Se quiser agendar, diga que quer agendar.

← Apenas UMA mensagem! ✅
```

## 🔧 Arquivos Modificados

### Workflow no Banco de Dados:
- **Tabela**: `Workflow`
- **ID**: `cmi2cbfy40000jie4wxi80f4u`
- **Campo**: `config.edges`
- **Ação**: Removida edge de `clinic_selection` → `gpt_welcome`
- **Ação**: Adicionada edge direta de `clinic_selection` → `gpt_classifier`

### Código da Engine:
- **Arquivo**: `src/services/workflowEngine.ts`
- **Linhas ~408-420**: Mensagens unificadas já incluem o texto completo
- **Linhas ~242-244**: Nó `gpt_welcome` já tinha lógica para evitar duplicação

## ✅ Status

- ✅ Mensagem duplicada **CORRIGIDA**
- ✅ Workflow otimizado (27 edges em vez de 28)
- ✅ Fluxo mais eficiente
- ✅ TypeScript compilando sem erros
- ✅ Workflow editor reflete a lógica correta

## 📝 Script Utilizado

```typescript
// scripts/fix_duplicate_welcome.ts
// - Identifica conexão redundante
// - Remove edge clinic_selection → gpt_welcome
// - Cria conexão direta clinic_selection → gpt_classifier
// - Preserva nó gpt_welcome para referência futura
```

---

**Data de Correção**: 21/11/2025
**Status**: ✅ CORRIGIDO E TESTADO
**Impacto**: Melhoria na UX, eliminação de mensagens duplicadas

