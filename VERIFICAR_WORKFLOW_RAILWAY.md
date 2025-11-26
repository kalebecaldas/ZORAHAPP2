# 🔍 Como Verificar o Workflow no Railway

## 📋 Script de Verificação

Criei um script que verifica se o workflow no Railway tem todos os nós e conexões necessários para o fluxo de cadastro funcionar corretamente.

## 🚀 Como Usar

### 1. Acessar o Railway Shell

```bash
railway ssh
```

### 2. Executar o Script de Verificação

```bash
npm run check:workflow:railway
```

## 📊 O que o Script Verifica

### Nós Obrigatórios:
1. ✅ `create_patient` (ACTION: `create_patient_profile`) - Cria o paciente no banco
2. ✅ `msg_cadastro_sucesso` (MESSAGE) - Mensagem de cadastro realizado
3. ✅ `action_get_procedimentos_insurance` (ACTION: `get_procedures_by_insurance`) - Busca procedimentos do convênio
4. ✅ `msg_procedimentos_insurance` (MESSAGE) - Mostra procedimentos disponíveis
5. ✅ `transfer_to_queue` (TRANSFER_HUMAN) - Transfere para fila

### Conexões Obrigatórias:
1. ✅ `create_patient` → `msg_cadastro_sucesso`
2. ✅ `msg_cadastro_sucesso` → `action_get_procedimentos_insurance`
3. ✅ `action_get_procedimentos_insurance` → `msg_procedimentos_insurance`
4. ✅ `msg_procedimentos_insurance` → `transfer_to_queue`

### Verificações Adicionais:
- ⚠️ Conexões duplicadas ou incorretas
- ⚠️ Nós com tipos ou actions incorretos
- ⚠️ Estatísticas do workflow (total de nós e conexões)

## 📋 Exemplo de Saída

```
🔍 Verificando workflow no Railway...

✅ Workflow encontrado: Sistema Completo v2 - Refatorado
   ID: cmidioe4q0000xg3s8bwjl2rg
   Criado em: 2025-11-26T10:00:00.000Z
   Ativo: true

📊 Estatísticas:
   Nós: 31
   Conexões: 35

🔍 Verificando nós obrigatórios:

  ✅ create_patient
     Tipo: ACTION ✅
     Action: create_patient_profile ✅
     Descrição: Cria o paciente no banco

  ✅ msg_cadastro_sucesso
     Tipo: MESSAGE ✅
     Descrição: Mensagem de cadastro realizado

  ...

📋 RESUMO:

   Nós encontrados: 5/5
   Conexões encontradas: 4/4

   ✅ Workflow completo! Todos os nós e conexões estão presentes.
```

## ⚠️ Se Encontrar Problemas

### Nós Faltando:
```bash
npm run sync:workflow:railway:upload
```

### Conexões Duplicadas:
```bash
npm run fix:duplicate-edges
```

## 🎯 Fluxo Esperado

```
create_patient (ACTION)
  ↓
msg_cadastro_sucesso (MESSAGE)
  ↓
action_get_procedimentos_insurance (ACTION)
  ↓
msg_procedimentos_insurance (MESSAGE)
  ↓
transfer_to_queue (TRANSFER_HUMAN)
```

---

**Dica**: Execute este script antes de sincronizar para ver o que está faltando!

