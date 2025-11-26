# 🧪 Como Testar os Modelos GPT

## ✅ Teste Automatizado

Execute o script de teste:

```bash
npm run test:gpt-models
```

### O que o teste faz:

1. **Testa Modelo de Classificação** (gpt-4o-mini)
   - Testa 4 mensagens diferentes
   - Mostra tempo de resposta
   - Mostra tokens usados
   - Confirma que está usando gpt-4o-mini

2. **Testa Modelo de Resposta** (gpt-4o)
   - Testa respostas complexas
   - Mostra tempo de resposta
   - Mostra tokens usados
   - Confirma que está usando gpt-4o

3. **Compara Modelos**
   - Testa a mesma mensagem com ambos os modelos
   - Mostra diferença de tempo e qualidade

## 📊 Resultados Esperados

### ✅ Teste Bem-Sucedido:

```
📋 Configuração:
   Classificação: gpt-4o-mini
   Respostas: gpt-4o

✅ Modelo: gpt-4o-mini
⏱️  Tempo: ~1000-2000ms
💰 Tokens: ~80-100

✅ Modelo: gpt-4o
⏱️  Tempo: ~1500-5000ms
💰 Tokens: ~130-300
```

### ⚠️ Se Der Erro:

**Erro: "OPENAI_API_KEY não configurada"**
- Verifique se o `.env` tem a chave configurada

**Erro: "Model not found"**
- Verifique se os nomes dos modelos estão corretos
- Modelos válidos: `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`

## 🔍 Teste Manual (Durante Conversação)

### 1. Verificar Logs no Console

Quando uma mensagem chegar, você verá nos logs:

```
🤖 [GPT] Using model: gpt-4o-mini for intent classification
🤖 [GPT Response] Using model: gpt-4o for contextual response
```

### 2. Verificar Logs no Workflow

No workflow editor, os logs mostrarão:

```
🤖 [GPT] 📊 Modelo usado: gpt-4o-mini
🤖 [GPT Response] 📊 Modelo usado: gpt-4o
```

### 3. Testar Conversação Real

**Teste 1: Classificação (deve usar gpt-4o-mini)**
```
USER: "quero agendar"
```
**Logs esperados:**
- `🤖 [GPT] Using model: gpt-4o-mini`
- Tempo: ~1000-2000ms
- Resposta: Classificação JSON

**Teste 2: Resposta Complexa (deve usar gpt-4o)**
```
USER: "me explique o que é RPG"
```
**Logs esperados:**
- `🤖 [GPT Response] Using model: gpt-4o`
- Tempo: ~2000-5000ms
- Resposta: Texto rico e detalhado

## 📈 Comparação de Performance

### gpt-4o-mini (Classificação):
- ⏱️ Tempo: ~1000-2000ms
- 💰 Custo: ~$0.0002 por chamada
- ✅ Ideal para: Classificação rápida

### gpt-4o (Respostas):
- ⏱️ Tempo: ~2000-5000ms
- 💰 Custo: ~$0.002 por chamada
- ✅ Ideal para: Respostas ricas

## 🔧 Troubleshooting

### Problema: Ambos usando o mesmo modelo

**Sintoma:**
```
🤖 [GPT] Using model: gpt-4o
🤖 [GPT Response] Using model: gpt-4o
```

**Solução:**
1. Verifique o `.env`:
   ```bash
   OPENAI_CLASSIFICATION_MODEL="gpt-4o-mini"
   OPENAI_RESPONSE_MODEL="gpt-4o"
   ```

2. Reinicie o servidor:
   ```bash
   # Ctrl+C
   npm run up
   ```

### Problema: Modelo não encontrado

**Sintoma:**
```
Error: Model 'gpt-5-nano' not found
```

**Solução:**
- Use modelos válidos: `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`
- Verifique a documentação da OpenAI para modelos disponíveis

### Problema: Respostas muito lentas

**Sintoma:**
- Tempo > 10 segundos

**Solução:**
1. Verifique sua conexão com a internet
2. Tente usar `gpt-4o-mini` para ambos (mais rápido)
3. Verifique se há rate limiting na API

## 📝 Checklist de Teste

- [ ] Execute `npm run test:gpt-models`
- [ ] Verifique que ambos os modelos aparecem nos logs
- [ ] Teste uma conversa real
- [ ] Verifique logs no console durante conversação
- [ ] Confirme que classificação usa gpt-4o-mini
- [ ] Confirme que respostas usam gpt-4o

## 🎯 Teste Rápido (1 minuto)

```bash
# 1. Execute o teste
npm run test:gpt-models

# 2. Verifique os resultados
# Deve mostrar:
# ✅ Modelo: gpt-4o-mini (classificação)
# ✅ Modelo: gpt-4o (respostas)

# 3. Se tudo OK, está funcionando! ✅
```

## 💡 Dicas

1. **Monitore os custos**: Use `gpt-4o-mini` para classificação economiza 90%
2. **Ajuste conforme necessidade**: Se precisar de mais qualidade, use `gpt-4-turbo`
3. **Teste regularmente**: Execute o teste após mudanças no código
4. **Verifique logs**: Sempre confira os logs para confirmar qual modelo está sendo usado

---

**Status:** Script de teste criado e funcionando! ✅

