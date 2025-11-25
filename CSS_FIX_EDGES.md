# 🔧 Correções CSS para Renderização de Edges

## 🎯 Problema Identificado

Algumas edges não estavam sendo renderizadas visualmente no ReactFlow, mesmo estando corretas no banco de dados e sendo convertidas corretamente.

## ✅ Correções Aplicadas

### 1. **CSS Global (`src/index.css`)**

Adicionados estilos específicos para garantir que edges sejam sempre visíveis:

```css
/* Fix para garantir que edges do ReactFlow sejam renderizadas */
.react-flow__edge {
  pointer-events: visibleStroke !important;
  visibility: visible !important;
  opacity: 1 !important;
  display: block !important;
}

.react-flow__edge-path {
  stroke-width: 3 !important;
  stroke: #64748b !important;
  fill: none !important;
  pointer-events: stroke !important;
}

/* Garantir que handles sejam visíveis e clicáveis */
.react-flow__handle {
  width: 12px !important;
  height: 12px !important;
  border: 2px solid white !important;
  background: #10b981 !important;
  border-radius: 50% !important;
  visibility: visible !important;
  opacity: 1 !important;
  z-index: 10 !important;
}

/* Garantir que o viewport não corte as edges */
.react-flow__viewport {
  overflow: visible !important;
}

.react-flow__renderer {
  overflow: visible !important;
}

/* Z-index correto: edges abaixo dos nodes */
.react-flow__edges {
  z-index: 0 !important;
}

.react-flow__edge {
  z-index: 0 !important;
}

.react-flow__node {
  z-index: 1 !important;
}
```

**Por que isso é importante:**
- ✅ `!important` garante que nenhum CSS legado sobrescreva
- ✅ `visibility: visible` força renderização mesmo se algum CSS tentar esconder
- ✅ `opacity: 1` garante que não estejam transparentes
- ✅ `z-index` correto garante que edges não fiquem atrás de outros elementos

### 2. **Componente WorkflowEditorBeta**

**Mudanças:**

1. **Container com `overflow-visible`:**
   ```tsx
   <div className="flex-1 h-full relative overflow-visible" style={{ zIndex: 0 }}>
   ```

2. **Logs detalhados de cada edge:**
   ```tsx
   convertedEdges.forEach((edge, idx) => {
       console.log(`   Edge ${idx + 1}: ${edge.source}[${edge.sourceHandle}] → ${edge.target}`)
   })
   ```

3. **Forçar fitView após inicialização:**
   ```tsx
   onInit={(instance) => {
       setReactFlowInstance(instance)
       setTimeout(() => {
           instance.fitView({ padding: 0.2, duration: 0 })
       }, 100)
   }}
   ```

4. **Propriedades adicionais do ReactFlow:**
   ```tsx
   elevateEdgesOnSelect={true}
   elevateNodesOnSelect={false}
   fitViewOptions={{ padding: 0.2 }}
   ```

5. **Edge options com pointerEvents:**
   ```tsx
   defaultEdgeOptions={{ 
       style: { 
           strokeWidth: 3, 
           stroke: '#64748b',
           pointerEvents: 'visibleStroke'  // ← Novo
       }
   }}
   ```

### 3. **useEffect Melhorado**

Agora inclui `reactFlowInstance` nas dependências e força fitView após atualização:

```tsx
useEffect(() => {
    // ... conversão de nodes e edges ...
    
    setTimeout(() => {
        if (reactFlowInstance) {
            reactFlowInstance.fitView({ padding: 0.2, duration: 0 })
        }
    }, 100)
}, [workflow, setNodes, setEdges, reactFlowInstance])
```

---

## 🧪 Como Testar

### 1. **Hard Refresh do Navegador**

Para garantir que o CSS seja recarregado:

- **Chrome/Edge:** `Ctrl+Shift+R` (Windows) ou `Cmd+Shift+R` (Mac)
- **Firefox:** `Ctrl+F5` (Windows) ou `Cmd+Shift+R` (Mac)
- **Safari:** `Cmd+Option+R`

### 2. **Verificar no Console**

Abra o DevTools (F12) e veja os logs:

```
🔄 WorkflowEditorBeta - Sincronizando workflow
   Workflow ID: cmid7w6gf0000xgtvf4j0n0qe
   Backend nodes: 58
   Backend edges: 80
   ReactFlow nodes: 58
   ReactFlow edges: 80
   Edge 1: collect_proc_2[main] → ask_proc_3
   Edge 2: ask_proc_3[main] → condition_proc_3
   Edge 3: condition_proc_3[true] → collect_proc_3
   Edge 4: condition_proc_3[false] → show_dates
   ...
✅ Edges aplicadas no estado: 80
```

### 3. **Inspecionar no DevTools**

1. Abra o DevTools (F12)
2. Vá na aba **Elements**
3. Procure por `.react-flow__edge`
4. Verifique se:
   - ✅ `visibility: visible`
   - ✅ `opacity: 1`
   - ✅ `display: block`
   - ✅ `stroke-width: 3px`
   - ✅ `stroke: rgb(100, 116, 139)` (#64748b)

### 4. **Verificar Handles**

Procure por `.react-flow__handle` e verifique:
- ✅ `width: 12px`
- ✅ `height: 12px`
- ✅ `visibility: visible`
- ✅ `opacity: 1`
- ✅ `z-index: 10`

### 5. **Testar Interação**

- ✅ Passe o mouse sobre uma edge → deve destacar
- ✅ Clique em um handle → deve permitir arrastar
- ✅ Arraste para criar nova conexão → linha azul deve aparecer

---

## 🔍 Debug Adicional

Se ainda houver problemas, adicione este código temporário no console do navegador:

```javascript
// Verificar todas as edges renderizadas
const edges = document.querySelectorAll('.react-flow__edge');
console.log(`Total de edges no DOM: ${edges.length}`);

edges.forEach((edge, idx) => {
  const path = edge.querySelector('.react-flow__edge-path');
  const computed = window.getComputedStyle(path);
  console.log(`Edge ${idx + 1}:`, {
    visible: computed.visibility === 'visible',
    opacity: computed.opacity,
    display: computed.display,
    strokeWidth: computed.strokeWidth,
    stroke: computed.stroke
  });
});

// Verificar handles
const handles = document.querySelectorAll('.react-flow__handle');
console.log(`Total de handles no DOM: ${handles.length}`);
```

---

## 📊 Resultado Esperado

Após essas correções:

- ✅ **80 edges** devem estar visíveis
- ✅ **Todas as linhas** devem aparecer (cinza, 3px)
- ✅ **Setas** devem estar visíveis nas pontas
- ✅ **Handles** devem estar visíveis (azul no topo, verde na base)
- ✅ **Nenhum node isolado**

---

## 🚨 Se Ainda Não Funcionar

1. **Limpar cache do navegador:**
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files

2. **Verificar se há conflitos de CSS:**
   - No DevTools, vá em Elements
   - Selecione uma edge que não aparece
   - Veja se há CSS com `display: none` ou `visibility: hidden` sendo aplicado

3. **Verificar versão do ReactFlow:**
   ```bash
   npm list @xyflow/react
   ```
   Deve ser versão 11.x ou superior

4. **Verificar se o container tem altura:**
   - O container do ReactFlow precisa ter altura definida
   - Verifique se `.flex-1.h-full` está funcionando

---

**Última atualização:** 24/11/2025
**Status:** ✅ CSS aplicado - Aguardando teste do usuário

