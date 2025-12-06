# SOLUÇÃO RÁPIDA - Remover "novamente"

## Problema:
Bot está dizendo "Oi novamente!" mesmo para números novos

## Solução 1: Modificar Prompt Base

Vá até o **banco de dados** (Prisma Studio) → Tabela `AIConfiguration` → Campo `systemPrompt`

Procure por algo como:
```
"Se é primeira vez, diga 'Olá!'. Se já conversou antes, diga 'Oi novamente!'"
```

E **remova** essa instrução, deixando apenas:
```
"Sempre cumprimente de forma amigável com 'Olá! 😊'"
```

## Solução 2: Forçar cumprimento padrão no código

Adicionar override no `conversationalAI.ts`:

```typescript
// Após gerar resposta
if (response.message.toLowerCase().includes('novamente') && 
    context.history.totalConversations === 0) {
    response.message = response.message.replace(/novamente/gi, '')
    response.message = response.message.replace(/Oi!/gi, 'Olá!')
}
```

## Solução 3: Desativar personalização (mais simples)

No prompt, adicionar:
```
NUNCA use "novamente" ou "de volta".
SEMPRE use cumprimento genérico: "Olá! 😊 Como posso ajudar?"
```

**Qual solução prefere?**
