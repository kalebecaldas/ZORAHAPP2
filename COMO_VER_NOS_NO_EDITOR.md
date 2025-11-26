# 🔍 Como Ver os Nós no Workflow Editor

## ✅ Os Nós Existem no Banco!

Verificação confirmou que os nós estão no workflow:
- ✅ `action_get_procedimentos_insurance` (posição: x: 1000, y: 2200)
- ✅ `msg_procedimentos_insurance` (posição: x: 1000, y: 2330)
- ✅ `transfer_to_queue` (posição: x: 1000, y: 2460)

## 🔍 Por que podem não aparecer no editor?

### 1. **Nós estão fora da viewport inicial**
Os nós estão em posições Y altas (2200+), podem estar fora da tela inicial.

**Solução:**
- Use o **MiniMap** (canto inferior direito) para ver onde estão os nós
- Clique no MiniMap para navegar até eles
- Use **zoom out** (botão "-" nos controles) para ver mais área
- Use **fitView** (botão central nos controles) para ajustar a visualização

### 2. **Workflow no Railway diferente do local**
O workflow no Railway pode não ter esses nós se não foi sincronizado.

**Solução:**
- Sincronize o workflow: `railway ssh` → `npm run sync:workflow:railway:upload`

### 3. **Problema de carregamento**
O editor pode não estar carregando todos os nós.

**Solução:**
- Recarregue a página (F5)
- Verifique o console do navegador para erros
- Tente salvar e recarregar o workflow

## 📋 Como Verificar:

### No Editor:
1. **Use o MiniMap** (canto inferior direito)
   - Veja se há nós na parte inferior do mapa
   - Clique para navegar até eles

2. **Use os Controles de Zoom**
   - Botão "-" para zoom out
   - Botão central (fitView) para ajustar visualização
   - Scroll do mouse para zoom

3. **Procure pelo nó `msg_cadastro_sucesso`**
   - Encontre o nó que mostra "Cadastro realizado com sucesso"
   - Veja se há uma conexão saindo dele
   - Siga a conexão para ver os próximos nós

### Via Console do Navegador:
1. Abra o DevTools (F12)
2. Vá em Console
3. Digite: `window.__REACT_FLOW_INSTANCE__` (se disponível)
4. Ou verifique os logs do ReactFlow

## 🎯 Fluxo Esperado no Editor:

Após o nó `msg_cadastro_sucesso`, você deve ver:

```
msg_cadastro_sucesso (MESSAGE)
  ↓
action_get_procedimentos_insurance (ACTION)
  ↓
msg_procedimentos_insurance (MESSAGE) - "Procedimentos disponíveis para..."
  ↓
transfer_to_queue (TRANSFER_HUMAN)
```

## ✅ Checklist:

- [ ] Verificar se o workflow no Railway tem os nós (sincronizar se necessário)
- [ ] Usar MiniMap para encontrar os nós
- [ ] Fazer zoom out para ver mais área
- [ ] Usar fitView para ajustar visualização
- [ ] Procurar pelo nó `msg_cadastro_sucesso` e seguir as conexões

---

**Dica**: Se os nós não aparecerem, pode ser que o workflow no Railway não tenha sido sincronizado. Execute `railway ssh` → `npm run sync:workflow:railway:upload` para sincronizar.

