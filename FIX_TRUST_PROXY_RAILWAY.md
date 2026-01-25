# Fix: ValidationError express-rate-limit no Railway

## ❌ Erro Original

```
ValidationError: The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false (default). 
This could indicate a misconfiguration which would prevent express-rate-limit from accurately identifying users.
```

## 🔍 Causa do Problema

O Railway (e outros serviços de hospedagem como Heroku, Render, etc.) usam um **proxy reverso** para rotear o tráfego. Isso significa que:

1. O Railway adiciona o header `X-Forwarded-For` às requisições
2. Este header contém o IP real do cliente
3. O `express-rate-limit` precisa deste IP para limitar requisições por usuário
4. Mas por padrão, o Express **não confia** em headers de proxy por segurança

## ✅ Solução Implementada

### Arquivo: `api/app.ts`

Adicionado logo após criar a instância do Express:

```typescript
const app: express.Application = express()

/**
 * ✅ IMPORTANTE: Trust proxy para Railway, Heroku, etc.
 * Necessário para express-rate-limit funcionar corretamente com X-Forwarded-For
 * Ver: https://expressjs.com/en/guide/behind-proxies.html
 */
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1) // Trust first proxy (Railway, Heroku, etc.)
}
```

## 📖 Explicação Técnica

### O que faz `app.set('trust proxy', 1)`?

- Instrui o Express a confiar no **primeiro proxy** na cadeia
- Permite que o Express leia corretamente o header `X-Forwarded-For`
- Necessário para `express-rate-limit` identificar usuários corretamente
- Melhora a segurança ao permitir rate limiting baseado no IP real do cliente

### Por que apenas em produção?

```typescript
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}
```

- **Em desenvolvimento**: não há proxy, então não é necessário
- **Em produção**: Railway/Heroku sempre usam proxy

### Valores possíveis para `trust proxy`

- `false` (padrão): Não confiar em proxies
- `true`: Confiar em todos os proxies (não recomendado)
- `1`: Confiar no primeiro proxy (Railway, Heroku)
- `2`: Confiar nos primeiros 2 proxies
- `'loopback'`: Confiar apenas em conexões loopback

## 🎯 Impacto

### Antes
- ❌ ValidationError no Railway
- ❌ Rate limiting não funcionava corretamente
- ❌ Logs mostravam erro constante

### Depois
- ✅ Sem erros de validação
- ✅ Rate limiting funciona com IP real do cliente
- ✅ Logs limpos

## 📚 Referências

- [Express Behind Proxies](https://expressjs.com/en/guide/behind-proxies.html)
- [express-rate-limit Error](https://express-rate-limit.github.io/ERR_ERL_UNEXPECTED_X_FORWARDED_FOR/)

## ⚠️ Nota Importante

Esta configuração é **essencial** para qualquer aplicação Express hospedada em:
- Railway
- Heroku
- Render
- Vercel
- Netlify
- AWS (atrás de ELB/ALB)
- Qualquer serviço que use proxy reverso

---

**Data:** 25/01/2026  
**Status:** ✅ Corrigido e testado no Railway
