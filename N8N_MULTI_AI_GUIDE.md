# 🤖 Guia de Configuração Multi-AI Provider

## ✨ Suporte para Múltiplas IAs

Este workflow suporta **qualquer provedor de IA** via HTTP Request:
- ✅ OpenAI (GPT-3.5, GPT-4, GPT-4o)
- ✅ Anthropic (Claude 3 Opus, Sonnet, Haiku)
- ✅ Google (Gemini Pro, Ultra)
- ✅ Groq (Llama, Mixtral - ultra rápido)
- ✅ Together AI
- ✅ Qualquer API compatível

---

## 🔧 Configuração de Variáveis

No N8N, vá em **Settings → Variables** e configure:

### **Variáveis Obrigatórias:**

```env
# Sistema
ZORAHAPP_API_URL=https://zorahapp.com.br

# AI Provider - escolha uma das configurações abaixo
```

---

## 📋 Configurações por Provedor

### **1. OpenAI (GPT-4o, GPT-4, GPT-3.5)**

```env
AI_PROVIDER=openai
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_API_KEY=sk-proj-seu-token-aqui
AI_MODEL=gpt-4o
AI_API_HEADER_NAME=Authorization
AI_API_HEADER_VALUE=Bearer {{AI_API_KEY}}
```

**Modelos disponíveis:**
- `gpt-4o` - Mais recente e rápido
- `gpt-4-turbo` - Equilibrado
- `gpt-3.5-turbo` - Mais barato

---

### **2. Anthropic (Claude)**

```env
AI_PROVIDER=anthropic
AI_API_URL=https://api.anthropic.com/v1/messages
AI_API_KEY=sk-ant-seu-token-aqui
AI_MODEL=claude-3-5-sonnet-20241022
AI_API_HEADER_NAME=x-api-key
AI_API_HEADER_VALUE={{AI_API_KEY}}
```

**Modelos disponíveis:**
- `claude-3-5-sonnet-20241022` - Melhor qualidade
- `claude-3-opus-20240229` - Mais inteligente
- `claude-3-haiku-20240307` - Mais rápido e barato

**Nota:** Claude requer header adicional `anthropic-version: 2023-06-01`

---

### **3. Google (Gemini)**

```env
AI_PROVIDER=google
AI_API_URL=https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent
AI_API_KEY=seu-google-api-key
AI_MODEL=gemini-pro
AI_API_HEADER_NAME=Authorization
AI_API_HEADER_VALUE=Bearer {{AI_API_KEY}}
```

**Modelos disponíveis:**
- `gemini-1.5-pro` - Contexto de 2M tokens
- `gemini-pro` - Gratuito até 60 req/min
- `gemini-ultra` - Mais avançado

---

### **4. Groq (Ultra Rápido!)**

```env
AI_PROVIDER=groq
AI_API_URL=https://api.groq.com/openai/v1/chat/completions
AI_API_KEY=gsk_seu-token-aqui
AI_MODEL=mixtral-8x7b-32768
AI_API_HEADER_NAME=Authorization
AI_API_HEADER_VALUE=Bearer {{AI_API_KEY}}
```

**Modelos disponíveis:**
- `mixtral-8x7b-32768` - Muito rápido, contexto 32k
- `llama2-70b-4096` - Poderoso
- `gemma-7b-it` - Leve e rápido

**Vantagem:** **300+ tokens/segundo** (10x mais rápido que OpenAI)

---

### **5. Together AI**

```env
AI_PROVIDER=together
AI_API_URL=https://api.together.xyz/v1/chat/completions
AI_API_KEY=seu-token-together
AI_MODEL=mistralai/Mixtral-8x7B-Instruct-v0.1
AI_API_HEADER_NAME=Authorization
AI_API_HEADER_VALUE=Bearer {{AI_API_KEY}}
```

**Modelos disponíveis:**
- `mistralai/Mixtral-8x7B-Instruct-v0.1`
- `meta-llama/Llama-3-70b-chat-hf`
- `NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO`

---

### **6. OpenRouter (Acesso a TODAS as IAs)**

```env
AI_PROVIDER=openrouter
AI_API_URL=https://openrouter.ai/api/v1/chat/completions
AI_API_KEY=sk-or-v1-seu-token
AI_MODEL=anthropic/claude-3.5-sonnet
AI_API_HEADER_NAME=Authorization
AI_API_HEADER_VALUE=Bearer {{AI_API_KEY}}
```

**Acessa:**
- GPT-4o, Claude, Gemini, Llama, Mistral, etc.
- **Paga apenas o que usa**
- Único token para tudo!

---

## 💰 Comparação de Custos

| Provedor | Modelo | Custo (1M tokens) | Velocidade | Qualidade |
|----------|--------|-------------------|------------|-----------|
| **OpenAI** | gpt-4o | $5.00 | Rápida | Excelente |
| **OpenAI** | gpt-3.5-turbo | $0.50 | Muito rápida | Boa |
| **Anthropic** | claude-3.5-sonnet | $3.00 | Rápida | Excelente |
| **Anthropic** | claude-haiku | $0.25 | Muito rápida | Boa |
| **Google** | gemini-pro | **GRÁTIS** | Rápida | Boa |
| **Groq** | mixtral-8x7b | **GRÁTIS** | Ultra rápida | Boa |
| **Together** | mixtral | $0.60 | Rápida | Boa |

---

## 🚀 Como Funciona

### **1. AI Classifier** (nó 6):
Chama a IA via HTTP Request com:
```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "system",
      "content": "Você é Zorah..."
    },
    {
      "role": "user",
      "content": "mensagem + instrução JSON"
    }
  ]
}
```

### **2. Parse AI Response** (nó 7):
Detecta automaticamente o formato da resposta:
- OpenAI: `choices[0].message.content`
- Claude: `content[0].text`
- Gemini: `candidates[0].content.parts[0].text`
- Fallback: Se falhar, usa classificação JavaScript

### **3. AI Collect Data** (nó 15):
Coleta dados do paciente conversacionalmente

### **4. AI Scheduling** (nó 16):
Guia o agendamento passo a passo

---

## 🎯 Recomendações por Uso

### **Para Produção (Qualidade):**
```env
AI_PROVIDER=openai
AI_MODEL=gpt-4o
```
- Melhor qualidade
- Rápido
- Custo moderado ($5/1M tokens)

### **Para Economia (Grátis):**
```env
AI_PROVIDER=groq
AI_MODEL=mixtral-8x7b-32768
```
- **Gratuito**
- Ultra rápido (300 tokens/s)
- Qualidade boa

### **Para Contexto Grande:**
```env
AI_PROVIDER=google
AI_MODEL=gemini-1.5-pro
```
- **2 milhões de tokens** de contexto
- Gratuito até 60 req/min
- Ótimo para histórico longo

### **Para Máxima Inteligência:**
```env
AI_PROVIDER=anthropic
AI_MODEL=claude-3-opus-20240229
```
- Mais inteligente
- Melhor em tarefas complexas
- $15/1M tokens

---

## 🧪 Como Testar

### **1. Configure as variáveis**
Escolha um provedor acima e configure

### **2. Importe o workflow**
```
n8n/WORKFLOW_MULTI_AI.json
```

### **3. Teste com cURL:**
```bash
curl -X POST https://seu-n8n.com/webhook/zorahbot \
  -H "Content-Type: application/json" \
  -d '{
    "message": "quero agendar fisioterapia",
    "phone": "5592999999999",
    "conversationId": "test-123"
  }'
```

---

## 🔄 Trocar de IA

Para trocar de IA, basta **mudar as variáveis**:

```bash
# Antes: OpenAI
AI_PROVIDER=openai
AI_API_URL=https://api.openai.com/v1/chat/completions

# Depois: Claude
AI_PROVIDER=anthropic
AI_API_URL=https://api.anthropic.com/v1/messages
```

**Não precisa editar o workflow!** ✨

---

## ⚡ Fallback Automático

Se a IA falhar, o workflow usa **classificação JavaScript** automaticamente:
- Detecta palavras-chave (agendar, valor, convênio)
- Responde com mensagens pré-definidas
- Sistema continua funcionando

---

## 📊 Monitoramento

O workflow retorna qual IA foi usada:
```json
{
  "message": "resposta",
  "aiProvider": "openai|anthropic|google|groq|fallback"
}
```

---

**Arquivo**: `n8n/WORKFLOW_MULTI_AI.json`  
**Criado em**: 29/12/2025  
**Versão**: 4.0.0
