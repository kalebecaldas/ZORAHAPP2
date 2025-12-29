# 🔄 WORKFLOW ENGINE - IMPLEMENTAÇÃO COMPLETA

## ✅ Status: TOTALMENTE IMPLEMENTADO!

---

## 🎯 O Que Foi Feito

### 1. ✅ Limpeza da Interface
- Removida aba "Regras de Transferência" (não estava sendo usada)
- Removidos campos não utilizados (`maxResponseLength`, `temperature`, `maxTokens`)
- Interface mais limpa e focada no que realmente funciona

### 2. ✅ WorkflowEngine Backend (Completo)
**Arquivo:** `api/services/workflowEngine.ts`

**Recursos:**
- ✅ Sistema de nós (nodes) e conexões (edges)
- ✅ 6 tipos de nós: `start`, `condition`, `action`, `gpt`, `transfer`, `end`
- ✅ Execução sequencial de workflows
- ✅ Sistema de triggers (intent, keyword, always)
- ✅ Priorização de workflows
- ✅ Interpolação de variáveis
- ✅ Avaliação de condições (equals, contains, matches, greaterThan, lessThan)
- ✅ 3 workflows padrão prontos para usar

### 3. ✅ API Routes (Completo)
**Arquivo:** `api/routes/workflows.ts`

**Endpoints:**
```
GET    /api/workflows          → Lista todos workflows
GET    /api/workflows/:id      → Obtém workflow específico
POST   /api/workflows          → Cria novo workflow
PUT    /api/workflows/:id      → Atualiza workflow
DELETE /api/workflows/:id      → Remove workflow
POST   /api/workflows/:id/test → Testa workflow
POST   /api/workflows/execute  → Executa workflow por contexto
```

### 4. ✅ WorkflowEditor Frontend (Completo)
**Arquivo:** `src/components/WorkflowEditor.tsx`

**Recursos:**
- ✅ Lista de workflows com filtro
- ✅ Criação de novos workflows
- ✅ Edição de workflows existentes
- ✅ Configuração de triggers (intent, keyword, always)
- ✅ Visualização de nós e fluxo
- ✅ Status ativo/inativo
- ✅ Teste de workflows em tempo real
- ✅ Salvar/Excluir workflows

### 5. ✅ Integração com Bot (Completo)
**Arquivo:** `api/services/intelligentBot.ts`

**Prioridade de Processamento:**
```
1º → Workflows (se houver match)
2º → Simple Fallbacks  
3º → Response Cache
4º → GPT convencional
```

---

## 📊 Tipos de Nós Disponíveis

### 1. 🟢 Start (Início)
- **Uso:** Ponto de entrada do workflow
- **Ação:** Passa para o próximo nó
- **Configuração:** Nenhuma

### 2. ❓ Condition (Condição)
- **Uso:** Toma decisões baseadas em dados
- **Ação:** Roteamento condicional (sim/não)
- **Configuração:**
  - `field`: Campo a avaliar (ex: `intent`, `message`, `patient.insuranceCompany`)
  - `operator`: `equals`, `contains`, `matches`, `greaterThan`, `lessThan`
  - `value`: Valor para comparar

### 3. ⚡ Action (Ação)
- **Uso:** Executa ações específicas
- **Ação:** Reply, coletar dados, salvar variáveis
- **Configuração:**
  - `actionType`: `reply`, `collect_data`, `save_data`, `call_api`
  - `message`: Mensagem a enviar
  - `variable`: Nome da variável (para save_data)

### 4. 🤖 GPT (Inteligência Artificial)
- **Uso:** Processa com GPT quando necessário
- **Ação:** Gera resposta inteligente
- **Configuração:**
  - `prompt`: Instrução para o GPT
  - `model`: `gpt-4o-mini` (padrão)
  - `maxTokens`: Limite de tokens

### 5. 👤 Transfer (Transferência)
- **Uso:** Transfere para atendente humano
- **Ação:** Encaminha para fila
- **Configuração:**
  - `queue`: Nome da fila (ex: `agendamento`, `supervisor`)
  - `transferMessage`: Mensagem ao transferir

### 6. 🔴 End (Fim)
- **Uso:** Finaliza o workflow
- **Ação:** Encerra processamento
- **Configuração:** Nenhuma

---

## 🎯 Workflows Padrão Incluídos

### 1. Informações Gerais
**Trigger:** `intent = INFORMACAO`  
**Fluxo:**
```
Início → GPT (responde pergunta) → Fim
```

**Uso:** Responde perguntas sobre procedimentos, preços, horários

---

### 2. Agendamento
**Trigger:** `intent = AGENDAR`  
**Fluxo:**
```
Início 
  → Perguntar Procedimento 
  → Perguntar Data 
  → Transferir para Atendente
```

**Uso:** Coleta informações e transfere para confirmação

---

### 3. Reclamações
**Trigger:** `intent = RECLAMACAO`  
**Fluxo:**
```
Início 
  → Mensagem de Empatia 
  → Transferir para Supervisor
```

**Uso:** Trata reclamações com prioridade

---

## 🚀 Como Usar

### Acessar o Editor
1. Acesse: **Configuração da IA**
2. Clique na aba **🔄 Workflows**
3. Veja lista de workflows existentes

### Criar Novo Workflow
1. Clique no botão **+** (Plus)
2. Configure:
   - Nome
   - Descrição
   - Trigger (intent, keyword, ou always)
   - Valor do trigger
   - Status (ativo/inativo)
3. Os nós Start e End são criados automaticamente
4. Clique em **Salvar**

### Editar Workflow
1. Selecione o workflow na lista
2. Clique em um nó para ver detalhes
3. Modifique as configurações
4. Clique em **Salvar**

### Testar Workflow
1. Selecione o workflow
2. Clique em **Testar**
3. Digite uma mensagem de teste
4. Veja o resultado em JSON

### Ativar/Desativar
1. Selecione o workflow
2. Clique no botão de Status (verde = ativo, cinza = inativo)
3. Clique em **Salvar**

---

## 💡 Exemplos de Configuração

### Exemplo 1: Workflow de Preços

```yaml
Nome: Informações de Preços
Trigger: keyword
Valor: "quanto custa, preço, valor"
Status: Ativo

Nós:
  1. Start
     ↓
  2. Condition
     field: "patient.insuranceCompany"
     operator: "equals"
     value: ""
     ↓ (yes: sem convênio)
  3. Action (reply)
     message: "Nossos preços particulares: Acupuntura R$ 180, Fisioterapia R$ 90"
     ↓
  4. End
  
     ↓ (no: tem convênio)
  5. Action (reply)
     message: "Seu convênio cobre! Não há custo por sessão."
     ↓
  6. End
```

### Exemplo 2: Workflow de Cancelamento

```yaml
Nome: Cancelamento de Consulta
Trigger: intent
Valor: CANCELAR
Status: Ativo

Nós:
  1. Start
     ↓
  2. Action (collect_data)
     message: "Qual consulta você deseja cancelar? Me informe a data."
     ↓
  3. Action (save_data)
     variable: "cancelamento_data"
     ↓
  4. Transfer
     queue: "atendimento"
     message: "Vou transferir você para confirmar o cancelamento."
```

---

## 🔍 Como o Sistema Processa

### Ordem de Prioridade:
```
1. Workflow Engine procura workflow com match
   ↓ (match encontrado)
2. Executa workflow
   ↓ (sem match ou erro)
3. Tenta Simple Fallbacks
   ↓ (não tem fallback)
4. Tenta Response Cache
   ↓ (não tem cache)
5. Processa com GPT convencional
```

### Critérios de Match:
- **Intent**: `context.intent === workflow.triggerValue`
- **Keyword**: Mensagem contém palavra-chave
- **Always**: Sempre executa (prioridade mais baixa)

### Priorização:
Workflows são ordenados por `priority` (maior = mais prioritário).

---

## 📈 Benefícios

### Para o Admin:
✅ **Controle Visual** - Vê exatamente o que o bot faz  
✅ **Fácil Configurar** - Sem programar, só configurar  
✅ **Teste Rápido** - Testa antes de ativar  
✅ **Flexível** - Pode criar fluxos customizados  
✅ **Transparente** - Sabe qual fluxo está sendo usado  

### Para o Sistema:
✅ **Organizado** - Lógica separada em workflows  
✅ **Manutenível** - Fácil de modificar  
✅ **Escalável** - Pode adicionar infinitos workflows  
✅ **Reutilizável** - Workflows podem ser copiados  
✅ **Testável** - Cada workflow pode ser testado isoladamente  

### Para o Usuário Final:
✅ **Respostas Mais Rápidas** - Workflows otimizados  
✅ **Fluxo Consistente** - Sempre o mesmo caminho  
✅ **Transferências Inteligentes** - Sabe quando transferir  

---

## 🎨 Próximas Melhorias Possíveis

### Curto Prazo:
- [ ] Adicionar mais tipos de nós (webhook, delay, loop)
- [ ] Editor drag-and-drop visual (react-flow)
- [ ] Copiar/duplicar workflows
- [ ] Histórico de execuções
- [ ] Debug mode com log de execução

### Médio Prazo:
- [ ] Workflows em múltiplas linguagens
- [ ] A/B testing de workflows
- [ ] Analytics por workflow
- [ ] Exportar/importar workflows (JSON)
- [ ] Templates de workflows prontos

### Longo Prazo:
- [ ] Workflows com IA treinada por workflow
- [ ] Sub-workflows (chamar workflow dentro de workflow)
- [ ] Versionamento de workflows
- [ ] Colaboração em tempo real
- [ ] Marketplace de workflows

---

## 🐛 Troubleshooting

### Workflow não está sendo executado
**Causa:** Trigger não está configurado corretamente  
**Solução:** Verifique se o trigger value corresponde ao intent ou palavra-chave

### Mensagem não aparece
**Causa:** Nó de action sem mensagem configurada  
**Solução:** Configure a propriedade `message` no nó

### Erro ao salvar
**Causa:** Campos obrigatórios faltando  
**Solução:** Certifique-se de preencher nome e trigger

### Transferência não funciona
**Causa:** Queue não configurada  
**Solução:** Configure a propriedade `queue` no nó de transferência

---

## 📚 Arquivos Criados/Modificados

### Novos Arquivos:
```
api/services/workflowEngine.ts       → Engine de execução
api/routes/workflows.ts              → API routes
src/components/WorkflowEditor.tsx    → Editor visual
```

### Arquivos Modificados:
```
api/app.ts                          → Importa workflowEngine
api/server.ts                       → Inicializa workflows
api/services/intelligentBot.ts      → Integra com workflows
src/pages/AIConfig.tsx              → Nova aba Workflows
```

---

## ✅ Checklist de Implementação

- [x] WorkflowEngine backend criada
- [x] API routes implementadas
- [x] WorkflowEditor frontend criado
- [x] Integração com bot completa
- [x] 3 workflows padrão criados
- [x] Inicialização automática no servidor
- [x] Sistema de priorização funcional
- [x] Teste de workflows funcional
- [x] Documentação completa

---

**Status:** ✅ 100% IMPLEMENTADO E FUNCIONAL  
**Data:** 22/12/2024  
**Versão:** 1.0.0 - Workflow Engine

---

🎉 **Pronto para uso! Recarregue a página e acesse a aba Workflows!** 🚀
