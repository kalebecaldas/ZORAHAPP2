# 🤖 Como Funciona a Inteligência do Bot

## 📋 Visão Geral

A inteligência do bot está **100% configurável via banco de dados**, mas há um prompt base **hardcoded** que é construído dinamicamente. Toda a fluidez vem da combinação de:

1. **Prompt base** (hardcoded em `aiConfigurationService.ts`)
2. **Configuração do banco** (tabela `AIConfiguration`)
3. **Contexto dinâmico** (histórico, paciente, agendamentos)
4. **Exemplos de conversas** (few-shot learning do banco)
5. **Regras de transferência** (do banco)

---

## 🔍 Arquitetura da IA

### Fluxo de Processamento

```
Mensagem do Paciente
    ↓
conversationalAI.generateResponse()
    ↓
1. Busca contexto (conversationContextService)
   - Histórico de mensagens
   - Dados do paciente
   - Agendamentos anteriores
   - Memórias de longo prazo
    ↓
2. Busca dados da clínica (prismaClinicDataService)
   - Procedimentos disponíveis
   - Convênios aceitos
   - Preços e pacotes
    ↓
3. Constrói prompt dinâmico (aiConfigurationService.buildDynamicPrompt)
   - Prompt base do banco
   - Contexto do paciente
   - Dados da clínica
   - Exemplos de conversas
   - Regras de negócio
    ↓
4. Chama GPT-4o (OpenAI API)
   - Model: gpt-4o
   - Temperature: 0.7
   - Max tokens: 1000
   - Response format: JSON
    ↓
5. Retorna resposta estruturada
   - message: texto da resposta
   - intent: intenção detectada
   - sentiment: sentimento
   - action: ação a tomar
   - entities: dados extraídos
```

---

## 📁 Arquivos Principais

### 1. `api/services/conversationalAI.ts`
- **Função**: Serviço principal de IA conversacional
- **Responsabilidade**: Gerar respostas usando GPT-4o
- **Dependências**: 
  - `conversationContextService` (contexto)
  - `prismaClinicDataService` (dados da clínica)
  - `aiConfigurationService` (prompt dinâmico)

### 2. `api/services/aiConfigurationService.ts`
- **Função**: Constrói o prompt dinâmico
- **Código Hardcoded**: ⚠️ **AQUI ESTÁ O PROMPT PRINCIPAL!**
- **Localização**: Linhas 102-489
- **O que faz**:
  - Busca configuração ativa do banco (`AIConfiguration`)
  - Adiciona contexto do paciente
  - Adiciona dados da clínica
  - Adiciona exemplos (few-shot learning)
  - Adiciona regras de transferência
  - Formata tudo em um prompt gigante

### 3. `api/services/conversationContext.ts`
- **Função**: Constrói contexto enriquecido
- **O que inclui**:
  - Dados do paciente
  - Histórico de conversas
  - Agendamentos (passados e futuros)
  - Memórias de longo prazo
  - Preferências aprendidas

### 4. `api/services/intelligentRouter.ts`
- **Função**: Decide o que fazer com a resposta da IA
- **Ações**:
  - `continue`: Continua conversando
  - `collect_data`: Coleta dados do cadastro
  - `transfer_human`: Transfere para atendente

---

## 🎯 Onde Está o Código Hardcoded

### Prompt Principal (Hardcoded)

**Arquivo**: `api/services/aiConfigurationService.ts`  
**Método**: `buildDynamicPrompt()`  
**Linhas**: 102-489

Este prompt contém:

1. **Personalidade da Maria** (linhas 104-157)
   - Quem ela é
   - Tom de voz
   - Estilo de comunicação
   - O que NUNCA fazer
   - Exemplos de bom/ruim

2. **Contexto do Paciente** (linhas 158-176)
   - Informações do paciente
   - Status do cadastro
   - Histórico
   - Agendamentos
   - Preferências

3. **Conversa Atual** (linhas 167-175)
   - Todas as mensagens trocadas
   - Aviso para não repetir perguntas

4. **Conhecimento da Clínica** (linhas 178-179)
   - Procedimentos
   - Convênios
   - Preços
   - Pacotes

5. **Regras de Transferência** (linhas 181-182)
   - Quando transferir
   - Para qual fila

6. **Formato de Resposta** (linhas 184-212)
   - Estrutura JSON obrigatória
   - Actions permitidas
   - Entities esperadas

7. **Detecção de Intenção** (linhas 214-225)
   - Como identificar intenções
   - Palavras-chave

8. **Exemplos Perfeitos** (linhas 227-278)
   - 5 exemplos de conversas ideais
   - Como imitar o estilo

9. **Regras Críticas de Contexto** (linhas 282-301)
   - Nunca repetir perguntas
   - Usar informações já coletadas
   - Manter fluxo linear

10. **Regra de Agendamento** (linhas 304-385)
    - Cadastro SEMPRE vem primeiro
    - Fluxo obrigatório
    - Entities obrigatórias

11. **Regras de Valores** (linhas 386-392)
    - Sempre perguntar unidade antes
    - Valores variam por unidade

12. **Regras de Convênios** (linhas 393-413)
    - Convênios normais vs com desconto
    - Nunca inventar valores

13. **Proatividade** (linhas 415-448)
    - Quando oferecer sugestões
    - Como ser sutil

14. **Auto-Correção** (linhas 450-472)
    - Como corrigir erros
    - Exemplos

15. **Instruções Finais** (linhas 474-489)
    - Formatação
    - Tom
    - Personalização

---

## 🗄️ Configuração no Banco de Dados

### Tabela: `AIConfiguration`

**Campos importantes**:
- `systemPrompt`: Prompt base (pode ser editado)
- `personality`: Personalidade
- `tone`: Tom de voz
- `useEmojis`: Usar emojis?
- `offerPackages`: Oferecer pacotes?
- `askInsurance`: Perguntar convênio?
- `temperature`: Temperatura do GPT (0.7)
- `maxTokens`: Tokens máximos (1000)
- `isActive`: Está ativa?

### Tabela: `AIExample`

**Few-Shot Learning**: Exemplos de conversas perfeitas
- `userMessage`: Mensagem do usuário
- `botResponse`: Resposta esperada
- `expectedIntent`: Intenção esperada
- `expectedAction`: Ação esperada
- `entities`: Entidades extraídas
- `category`: Categoria (AGENDAR, INFORMACAO, etc)
- `priority`: Prioridade (ordem de importância)

### Tabela: `TransferRule`

**Regras de Transferência**: Quando transferir para humano
- `keywords`: Palavras-chave que ativam
- `intents`: Intenções que ativam
- `targetQueue`: Fila de destino
- `transferMessage`: Mensagem de transferência
- `priority`: Prioridade da regra

---

## 🚀 Como Subir para o Railway

### Passo 1: Garantir que o Seed foi Executado

O seed cria a configuração inicial no banco. Execute no Railway:

```bash
npx tsx scripts/seed_ai_configuration.ts
```

**OU** adicione ao script de deploy:

```json
{
  "scripts": {
    "deploy:prod": "npx prisma db push && npx tsx scripts/seed_ai_configuration.ts && npx tsx scripts/import_workflow_definitivo.ts && npx tsx api/server.ts"
  }
}
```

### Passo 2: Verificar Configuração no Banco

No Railway Shell, execute:

```bash
npx tsx -e "
import prisma from './api/prisma/client.js';
(async () => {
  const config = await prisma.aIConfiguration.findFirst({ where: { isActive: true } });
  console.log('Config ativa:', config ? 'SIM ✅' : 'NÃO ❌');
  if (config) {
    console.log('ID:', config.id);
    console.log('Nome:', config.name);
    console.log('Exemplos:', await prisma.aIExample.count({ where: { configId: config.id } }));
    console.log('Regras:', await prisma.transferRule.count({ where: { configId: config.id } }));
  }
  await prisma.\$disconnect();
})()
"
```

### Passo 3: Variáveis de Ambiente no Railway

Garantir que estas variáveis estão configuradas:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
OPENAI_TIMEOUT=20000
```

### Passo 4: Testar a IA

Envie uma mensagem de teste e verifique os logs:

```bash
# No Railway, verifique os logs:
# Deve aparecer:
# - "🤖 Gerando resposta conversacional"
# - "🔍 CONTEXTO COMPLETO"
# - "✅ Resposta gerada"
```

---

## 🔧 Como Melhorar a Fluidez

### 1. Ajustar o Prompt Base

**Arquivo**: `api/services/aiConfigurationService.ts`  
**Método**: `buildDynamicPrompt()`

**O que ajustar**:
- Personalidade (linhas 104-157)
- Exemplos perfeitos (linhas 227-278)
- Regras críticas (linhas 282-385)

### 2. Adicionar Exemplos no Banco

```typescript
// Via script ou interface
await prisma.aIExample.create({
  data: {
    configId: configId,
    name: 'Exemplo de Conversa Fluida',
    category: 'AGENDAR',
    userMessage: 'quero agendar fisioterapia',
    expectedIntent: 'AGENDAR',
    expectedAction: 'collect_data',
    botResponse: 'Perfeito! Vou te ajudar...',
    entities: { procedimento: 'Fisioterapia' },
    confidence: 0.95,
    priority: 1
  }
})
```

### 3. Ajustar Regras de Transferência

```typescript
await prisma.transferRule.create({
  data: {
    configId: configId,
    name: 'Nova Regra',
    keywords: ['palavra1', 'palavra2'],
    intents: ['AGENDAR'],
    targetQueue: 'AGUARDANDO',
    priority: 5
  }
})
```

### 4. Editar Configuração Ativa

```typescript
await prisma.aIConfiguration.update({
  where: { id: configId },
  data: {
    systemPrompt: 'Novo prompt...',
    temperature: 0.8, // Mais criativo
    maxTokens: 1500   // Respostas mais longas
  }
})
```

---

## 📊 Monitoramento

### Logs Importantes

1. **Geração de Resposta**:
   ```
   🤖 Gerando resposta conversacional para: "..."
   🔍 CONTEXTO COMPLETO: {...}
   ✅ Resposta gerada: {...}
   ```

2. **Contexto**:
   ```
   ✅ Contexto construído para {phone}:
      • Paciente: {name}
      • Conversas anteriores: {count}
      • Agendamentos: {count}
   ```

3. **Prompt**:
   ```
   📜 Histórico de {count} mensagens incluído
   📝 MENSAGEM ATUAL DO USUÁRIO: "..."
   ```

### Métricas para Acompanhar

- **Confiança média**: `confidence` nas respostas
- **Taxa de transferência**: Quantas vezes transfere vs continua
- **Intenções detectadas**: Distribuição de intents
- **Tempo de resposta**: Latência do GPT

---

## ⚠️ Pontos de Atenção

### 1. Custo da API OpenAI

- **Modelo**: gpt-4o (mais caro, mas melhor)
- **Tokens**: ~1000 por mensagem
- **Custo estimado**: ~$0.01-0.03 por conversa completa
- **Monitorar**: Usar dashboard da OpenAI

### 2. Latência

- **Timeout**: 20 segundos (configurável)
- **Tempo médio**: 2-5 segundos
- **Otimizações**: Cache de contexto, paralelização

### 3. Contexto Limitado

- **Histórico**: Últimas 20 mensagens
- **Tokens máximos**: 1000 na resposta
- **Solução**: Resumir histórico antigo

### 4. Prompt Muito Longo

- **Tamanho atual**: ~15.000 caracteres
- **Limite GPT-4o**: 128k tokens
- **Risco**: Custo alto, latência maior

---

## 🎯 Checklist para Deploy no Railway

- [ ] Seed executado (`seed_ai_configuration.ts`)
- [ ] Configuração ativa no banco
- [ ] Exemplos criados (pelo menos 5)
- [ ] Regras de transferência criadas
- [ ] Variáveis de ambiente configuradas
- [ ] `OPENAI_API_KEY` válida
- [ ] Teste de mensagem funcionando
- [ ] Logs mostrando contexto sendo construído
- [ ] Respostas sendo geradas corretamente
- [ ] Transferências funcionando

---

## 📝 Resumo

**A fluidez vem de**:
1. ✅ Prompt bem estruturado (hardcoded em `aiConfigurationService.ts`)
2. ✅ Contexto rico (histórico, paciente, agendamentos)
3. ✅ Exemplos de conversas (few-shot learning)
4. ✅ Regras claras de negócio
5. ✅ GPT-4o (modelo mais inteligente)

**Para subir no Railway**:
1. Execute o seed
2. Verifique configuração ativa
3. Configure variáveis de ambiente
4. Teste e monitore

**Para melhorar**:
1. Ajuste o prompt base
2. Adicione mais exemplos
3. Refine regras de transferência
4. Monitore métricas
