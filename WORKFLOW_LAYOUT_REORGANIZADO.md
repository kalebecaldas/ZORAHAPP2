# 🎨 Layout do Workflow Reorganizado

## ✅ O Que Foi Feito

### 1. Verificação de Órfãos
- ✅ **0 nodes órfãos** (sem entrada, exceto START)
- ✅ **0 nodes sem saída** (exceto END e TRANSFER_HUMAN)
- ✅ **Todas as 80 conexões** estão corretas

### 2. Reorganização Visual

Todos os **58 nodes** foram reorganizados em um **layout hierárquico e lógico**:

---

## 📐 Estrutura do Layout

### **FASE 1: Escolha da Unidade** (Topo)
```
                    [START]
                       ↓
              [CLINIC_SELECTION]
                   ↙     ↘
    [UNIDADE_VIEIRALVES]  [UNIDADE_SÃO_JOSÉ]
                   ↘     ↙
```
- **Posição:** Y = 50 a 390
- **Organização:** Vertical centralizada

---

### **FASE 2: Loop de Informações** (Centro)

#### 🎯 GPT Classifier (Centro)
```
              [GPT_CLASSIFIER]
        ↙  ↙  ↙  ↓  ↘  ↘  ↘
       1  2  3  4  5  6  ↺ (loop)
```
- **Posição:** X = 600, Y = 560
- **6 portas de saída**

#### 🔵 Branch Valores (Esquerda Superior)
```
[BRANCH_VALORES] → deteta procedimento
     ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓
     Valores de cada procedimento:
     • Fisio Ortopédica
     • Fisio Pélvica
     • Fisio Neurológica
     • Acupuntura
     • RPG
     • Pilates
     • Quiropraxia
     • Consulta
     ↓ (todos voltam)
[GPT_CLASSIFIER] ↺
```
- **Posição:** X = -400 a 200, Y = 730-900
- **8 nodes de valores**

#### 🔵 Branch Convênios (Esquerda Inferior)
```
[INFO_CONVENIOS]
     ↓
[ASK_CONVENIO_PROCEDIMENTOS]
     ↓ ↓ ↓
   Bradesco  SulAmérica  Outros
     ↓ (todos voltam)
[GPT_CLASSIFIER] ↺
```
- **Posição:** X = -800 a -400, Y = 730-1070
- **4 nodes de convênios**

#### 🔵 Branch Localização (Centro Esquerda)
```
[INFO_LOCALIZACAO]
     ↓
[GPT_CLASSIFIER] ↺
```
- **Posição:** X = 300, Y = 730

#### 🔵 Branch Explicações (Centro Direita)
```
[INFO_PROCEDIMENTO_EXPLICACAO]
     ↓ ↓ ↓ ↓
   Fisio  Acupuntura  RPG  FAQ
     ↓ (todos voltam)
[GPT_CLASSIFIER] ↺
```
- **Posição:** X = 100 a 500, Y = 730-1070
- **4 nodes de explicação**

#### 🔵 Branch Transferência (Direita)
```
[TRANSFER_HUMAN]
     ↓
   [END]
```
- **Posição:** X = 800, Y = 730

---

### **FASE 3: Fluxo de Agendamento** (Direita, Vertical)

#### 📝 Verificação de Cadastro
```
[CHECK_PATIENT]
     ↓
[PATIENT_EXISTS]
   ↙        ↘
FOUND    NOT_FOUND
  ↓           ↓
MSG      CADASTRO
```
- **Posição:** X = 400 a 800, Y = 730-1070

#### 📝 Coleta de Dados (se não cadastrado)
```
[COLLECT_NOME]
     ↓
[COLLECT_CPF]
     ↓
[COLLECT_NASCIMENTO]
     ↓
[COLLECT_EMAIL]
     ↓
[COLLECT_CONVENIO]
     ↓
[CONFIRMA_CADASTRO]
     ↓
[VALIDATE_CONFIRMACAO]
   ↙        ↘
OK       CORRIGIR
 ↓           ↓
[CREATE]  [VOLTA]
```
- **Posição:** X = 600-1000, Y = 1240-2600
- **Fluxo vertical de cadastro**

#### 📝 Escolha de Procedimentos
```
[ASK_PROCEDIMENTOS]
     ↓
[COLLECT_PROC_1]
     ↓
[ASK_PROC_2]  quer mais?
     ↓
[CONDITION_2]
   ↙    ↘
 SIM    NÃO → [DATES]
  ↓
[COLLECT_PROC_2]
  ↓
[ASK_PROC_3] quer mais?
  ↓
[CONDITION_3]
   ↙    ↘
 SIM    NÃO → [DATES]
  ↓
[COLLECT_PROC_3]
  ↓
[SHOW_DATES]
```
- **Posição:** X = 0-400, Y = 2770-4130
- **Loop de até 3 procedimentos**

#### 📝 Data e Turno
```
[SHOW_DATES]
     ↓
[COLLECT_DATE]
     ↓
[ASK_TURNO]
     ↓
[COLLECT_TURNO]
```
- **Posição:** X = 300, Y = 4130-4640

#### 📝 Confirmação e Fim
```
[RESUMO_AGENDAMENTO]
     ↓
[CONFIRMA_AGENDAMENTO]
   ↙        ↘
 SIM       NÃO
  ↓         ↓
[CREATE]  [CANCEL]
  ↓         ↓
[FILA]   [GPT] ↺
  ↓
[END]
```
- **Posição:** X = 100-500, Y = 4810-5490

---

## 🎯 Dimensões do Canvas

- **Largura total:** ~2.400px
- **Altura total:** ~5.500px
- **Espaçamento horizontal:** 200-400px entre colunas
- **Espaçamento vertical:** 170px entre linhas

---

## 🔄 Loops Implementados

### Loop Principal (GPT Classifier)
- ✅ Valores → GPT
- ✅ Convênios → GPT
- ✅ Localização → GPT
- ✅ Explicações → GPT
- ✅ FAQ → GPT

### Loop de Procedimentos
- ✅ Proc 1 → Proc 2 (opcional)
- ✅ Proc 2 → Proc 3 (opcional)
- ✅ Qualquer ponto → Datas

### Loop de Correção
- ✅ Cadastro incorreto → Volta para nome

---

## 🎨 Cores por Tipo de Node

- 🟢 **START** - Verde (entrada do fluxo)
- 🔵 **MESSAGE** - Azul (mensagens ao usuário)
- 🟠 **CONDITION** - Laranja (decisões)
- 🟣 **GPT_RESPONSE** - Roxo (IA)
- 🟠 **API_CALL** - Laranja (consultas)
- 🔵 **DATA_COLLECTION** - Azul turquesa (coleta de dados)
- 🔴 **TRANSFER_HUMAN** - Vermelho (transferência)
- ⚫ **END** - Cinza (fim do fluxo)

---

## ✅ Validação

### Conectividade
- ✅ Todos os nodes têm entrada (exceto START)
- ✅ Todos os nodes têm saída (exceto END e TRANSFER_HUMAN)
- ✅ Nenhum node isolado

### Organização Visual
- ✅ Layout hierárquico (cima → baixo)
- ✅ Agrupamento por fase
- ✅ Separação clara entre branches
- ✅ Fluxos de loop bem definidos

---

## 🖱️ Como Usar no Editor

### Navegação
1. **Fit View** - Ver todo o workflow
2. **Zoom In/Out** - Ajustar zoom
3. **Arrastar** - Mover canvas
4. **Clicar node** - Ver propriedades

### Edição
1. **Clicar no node** - Abre painel de propriedades
2. **Editar mensagem** - Campo de texto
3. **Adicionar conexão** - Arrastar handle
4. **Mover node** - Arrastar o card

### Salvar
1. **Salvar Fluxo** - Salva nodes + edges + **posições**
2. **Ativar/Desativar** - Liga/desliga workflow

---

## 📝 Notas Técnicas

### Posições são Salvas Automaticamente
- ✅ Ao clicar em "Salvar Fluxo"
- ✅ Função `reactFlowToWorkflow` salva `node.position`
- ✅ Banco de dados armazena no campo `config.nodes[].position`

### Reorganização Manual
Se precisar reorganizar:
1. Edite `scripts/reorganize_workflow_positions.ts`
2. Execute: `npx ts-node scripts/reorganize_workflow_positions.ts`
3. Recarregue o editor

---

## 🎉 Status Final

✅ **58 nodes** organizados logicamente
✅ **80 conexões** mapeadas corretamente
✅ **0 órfãos** ou nodes desconectados
✅ **Layout hierárquico** e visual
✅ **Posições salvas** no banco de dados
✅ **Pronto para uso** em produção

---

**Última atualização:** 24/11/2025
**Workflow ID:** `cmid7w6gf0000xgtvf4j0n0qe`
**Status:** 🟢 ATIVO

