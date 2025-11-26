# 🤖 Configuração de Modelos GPT (Dual-Model System)

## 🎯 Sistema Implementado

O sistema agora usa **dois modelos diferentes** conforme a necessidade:

### 1. **Classificação de Intenção** (Rápido e Barato)
- **Modelo**: `gpt-4o-mini` (padrão)
- **Uso**: Classificar a intenção do usuário (valores, convênios, agendar, etc.)
- **Por que**: É rápido, barato e excelente para tarefas simples de classificação
- **Arquivo**: `src/services/workflow/executors/gptExecutor.ts`

### 2. **Respostas Complexas** (Poderoso e Contextualizado)
- **Modelo**: `gpt-4o` ou `gpt-4-turbo` (configurável)
- **Uso**: Gerar respostas ricas e contextualizadas
- **Por que**: Melhor para gerar respostas longas e bem estruturadas
- **Arquivo**: `src/services/workflow/executors/gptResponseExecutor.ts`

## 📊 Comparação de Modelos

| Modelo | Velocidade | Custo | Melhor Para | Tokens |
|--------|------------|-------|-------------|--------|
| **gpt-4o-mini** | ⚡⚡⚡ Muito rápido | 💰 Muito barato | Classificação, tarefas simples | 128k |
| **gpt-4o** | ⚡⚡ Rápido | 💰💰 Barato | Respostas ricas, contextualizadas | 128k |
| **gpt-4-turbo** | ⚡ Médio | 💰💰💰 Mais caro | Respostas muito complexas | 128k |
| **o1-preview** | 🐌 Lento | 💰💰💰💰 Muito caro | Raciocínio complexo | 128k |

### Custos (aproximados por 1M tokens):

| Modelo | Input | Output |
|--------|-------|--------|
| gpt-4o-mini | $0.15 | $0.60 |
| gpt-4o | $2.50 | $10.00 |
| gpt-4-turbo | $10.00 | $30.00 |
| o1-preview | $15.00 | $60.00 |

**Exemplo de economia:**
- 1000 classificações com gpt-4o-mini: ~$0.20
- 1000 classificações com gpt-4o: ~$2.50
- **Economia: 90%+**

## ⚙️ Configuração (.env)

```bash
# Modelo para classificação (rápido e barato)
OPENAI_CLASSIFICATION_MODEL="gpt-4o-mini"

# Modelo para respostas complexas (poderoso)
OPENAI_RESPONSE_MODEL="gpt-4o"

# Modelo padrão (fallback)
OPENAI_MODEL="gpt-4o"
```

## 🎯 Opções de Configuração

### Opção 1: Econômico (Recomendado)
```bash
OPENAI_CLASSIFICATION_MODEL="gpt-4o-mini"  # Classificação
OPENAI_RESPONSE_MODEL="gpt-4o"            # Respostas
```
**Resultado:** Rápido e barato, qualidade excelente

### Opção 2: Máxima Qualidade
```bash
OPENAI_CLASSIFICATION_MODEL="gpt-4o"       # Classificação
OPENAI_RESPONSE_MODEL="gpt-4-turbo"       # Respostas
```
**Resultado:** Melhor qualidade possível, mais caro

### Opção 3: Super Econômico
```bash
OPENAI_CLASSIFICATION_MODEL="gpt-4o-mini"  # Classificação
OPENAI_RESPONSE_MODEL="gpt-4o-mini"       # Respostas
```
**Resultado:** Muito barato, qualidade ainda boa

### Opção 4: Raciocínio Complexo (Casos Especiais)
```bash
OPENAI_CLASSIFICATION_MODEL="gpt-4o-mini"  # Classificação
OPENAI_RESPONSE_MODEL="o1-preview"        # Respostas
```
**Resultado:** Raciocínio avançado, muito caro, não recomendado para conversação

## 🔧 Como Funciona

### Fluxo de Classificação (gpt-4o-mini):

```
USER: "tenho encaminhamento pra fisioterapia"
       ↓
[GPT-4o-mini] Classifica: intent_port="5" (AGENDAR)
              Brief: "Ótimo! Você tem encaminhamento..."
       ↓
Bot usa o brief ou melhora com dados reais
```

**Tempo**: ~500ms
**Custo**: ~$0.0002

### Fluxo de Resposta Complexa (gpt-4o):

```
USER: "me explique o que é RPG e como funciona"
       ↓
[GPT-4o] Gera resposta rica e detalhada com contexto
       ↓
Bot retorna resposta completa e bem formatada
```

**Tempo**: ~1000ms
**Custo**: ~$0.002

## 📝 Arquivos Modificados

1. `.env` - Adicionadas variáveis de configuração
2. `src/services/workflow/executors/gptExecutor.ts` - Usa OPENAI_CLASSIFICATION_MODEL
3. `src/services/workflow/executors/gptResponseExecutor.ts` - Usa OPENAI_RESPONSE_MODEL

## 🚀 Para Testar Diferentes Modelos

### Teste 1: Padrão (Econômico)
```bash
# .env
OPENAI_CLASSIFICATION_MODEL="gpt-4o-mini"
OPENAI_RESPONSE_MODEL="gpt-4o"
```

### Teste 2: Máxima Qualidade
```bash
# .env
OPENAI_CLASSIFICATION_MODEL="gpt-4o"
OPENAI_RESPONSE_MODEL="gpt-4-turbo"
```

Reinicie o servidor e teste!

## 💡 Recomendações

### Para Produção (Recomendado):
```bash
OPENAI_CLASSIFICATION_MODEL="gpt-4o-mini"  # Economia
OPENAI_RESPONSE_MODEL="gpt-4o"            # Qualidade
```

### Para Desenvolvimento/Testes:
```bash
OPENAI_CLASSIFICATION_MODEL="gpt-4o-mini"
OPENAI_RESPONSE_MODEL="gpt-4o-mini"  # Mais barato para testes
```

### Para Casos Especiais (Respostas Muito Complexas):
```bash
OPENAI_CLASSIFICATION_MODEL="gpt-4o-mini"
OPENAI_RESPONSE_MODEL="gpt-4-turbo"  # Melhor para respostas muito elaboradas
```

## ⚡ Performance e Custos

### Estimativa para 1000 conversas/dia:

**Configuração Econômica (Recomendado):**
- Classificações: 1000 × $0.0002 = $0.20/dia
- Respostas: 200 × $0.002 = $0.40/dia
- **Total: ~$0.60/dia = $18/mês**

**Configuração Máxima Qualidade:**
- Classificações: 1000 × $0.002 = $2.00/dia
- Respostas: 200 × $0.02 = $4.00/dia
- **Total: ~$6/dia = $180/mês**

## ✅ Benefícios

- ✅ **90% de economia** na classificação de intenção
- ✅ **Mesma qualidade** nas respostas ricas
- ✅ **Mais rápido** (gpt-4o-mini responde em ~500ms)
- ✅ **Flexível** - configure conforme necessidade
- ✅ **Escalável** - economize conforme volume cresce

---

**Status:** Implementado e configurável via .env! 🚀

**Modelo Padrão Ativo:**
- Classificação: gpt-4o-mini
- Respostas: gpt-4o

