# 🔧 Correção: Bot mencionando convênios não atendidos

## ❌ Problema Identificado

O bot estava mencionando **HAPVIDA** como um convênio atendido, mas segundo `src/infor_clinic.txt`, **HAPVIDA NÃO é atendido** pela clínica.

## ✅ Correções Implementadas

### 1. **Filtro de Convênios no Prompt** (`api/services/aiConfigurationService.ts`)

- ✅ Adicionado filtro para mostrar **APENAS** convênios que realmente atendemos
- ✅ Lista explícita de convênios aceitos no prompt
- ✅ Regra explícita: **NUNCA mencionar HAPVIDA, Unimed, Amil** ou outros não listados
- ✅ Instrução para o bot: se paciente mencionar convênio não atendido, dizer educadamente que não atendemos

### 2. **Script de Limpeza** (`scripts/remove_hapvida.ts`)

Script criado para remover HAPVIDA do banco de dados (caso exista).

## 📋 Convênios Corretos (conforme `src/infor_clinic.txt`)

### Convênios Normais (com tabela própria):
- BRADESCO
- SULAMÉRICA
- MEDISERVICE
- SAÚDE CAIXA
- PETROBRAS
- GEAP
- PRO SOCIAL
- POSTAL SAÚDE
- CONAB
- AFFEAM
- AMBEP
- GAMA
- LIFE
- NOTREDAME
- OAB
- CAPESAUDE
- CASEMBRAPA
- CULTURAL
- EVIDA
- FOGAS
- FUSEX
- PLAN-ASSITE

### Convênios com Desconto:
- ADEPOL
- BEM CARE
- BEMOL
- CLUBSAÚDE
- PRO-SAUDE
- VITA

### Particular:
- PARTICULAR

## 🚫 Convênios que NÃO atendemos:
- ❌ HAPVIDA
- ❌ Unimed
- ❌ Amil
- ❌ Outros não listados acima

## 🔧 Como Aplicar as Correções

### 1. Remover HAPVIDA do banco de dados (se existir):

```bash
# No terminal local:
npx tsx scripts/remove_hapvida.ts

# No Railway Shell:
npx tsx scripts/remove_hapvida.ts
```

### 2. Garantir que apenas convênios corretos estão no banco:

```bash
# Re-executar o seed completo (ele só cria/atualiza, não remove dados antigos):
npx tsx scripts/seed_clinic_data.ts
```

### 3. Reiniciar o servidor:

```bash
# Local:
npm run dev

# Railway:
railway up
```

## ✅ Resultado Esperado

Agora o bot:
- ✅ **NUNCA** mencionará HAPVIDA ou outros convênios não atendidos
- ✅ Se paciente mencionar HAPVIDA, dirá educadamente que não atendemos
- ✅ Listará apenas os convênios corretos quando perguntado
- ✅ Usará apenas dados do banco de dados filtrados pela lista correta

## 📝 Notas

- O seed (`scripts/seed_clinic_data.ts`) já está correto e não inclui HAPVIDA
- O problema era que o banco pode ter dados antigos de execuções anteriores
- O filtro no código garante que mesmo se houver dados incorretos no banco, o bot não os usará
