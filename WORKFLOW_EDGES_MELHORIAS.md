# 🔗 Melhorias na Visualização de Edges do Workflow

## 🎯 Problema Identificado

O frontend não estava renderizando as conexões entre nodes corretamente, fazendo com que nodes aparecessem isolados mesmo estando conectados no banco de dados.

## ✅ Soluções Implementadas

### 1. **Logs de Debug Detalhados**
   
Adicionei logs completos no processo de conversão de edges:

```typescript
// src/utils/workflowUtils.ts - edgesToReactFlow()
console.log('🔗 edgesToReactFlow - Convertendo edges do backend')
console.log('   Nodes disponíveis:', nodes.map(n => n.id))
console.log('   Backend edges recebidas:', backendEdges?.length || 0)
```

**Como usar:**
- Abra o DevTools do navegador (F12)
- Vá na aba Console
- Recarregue o editor do workflow
- Veja os logs detalhados mostrando:
  - Quantas edges foram recebidas do backend
  - Quantas foram convertidas
  - Quais edges foram ignoradas (se houver)
  - Conexões inválidas (source/target não existe)

### 2. **Validação de Edges Inválidas**

```typescript
// Verificar se source e target existem
const sourceExists = nodeMap.has(edge.source)
const targetExists = nodeMap.has(edge.target)

if (!sourceExists || !targetExists) {
  console.warn(`⚠️ Edge inválida: ${edge.source} -> ${edge.target}`)
  return null
}
```

**Benefício:** Remove edges que apontam para nodes que não existem, evitando erros silenciosos.

### 3. **Melhorias Visuais nos Handles**

**Antes:**
- Handles pequenos (3x3px)
- Cor cinza discreta
- Difícil de ver e clicar

**Depois:**
- ✅ **Handles maiores** (4x4px)
- ✅ **Cores distintas:**
  - 🔵 **Input (topo):** Azul (`!bg-blue-500`)
  - 🟢 **Output (base):** Verde (`!bg-green-500`)
- ✅ **Efeitos visuais:**
  - Sombra (`shadow-md`)
  - Hover com escala (`hover:!scale-125`)
  - Borda branca para contraste
- ✅ **Tooltip melhorado:**
  - Fundo escuro (`bg-gray-900`)
  - Padding maior
  - Sombra para destaque

```tsx
// src/components/workflow/CustomNode.tsx
<Handle
    type="target"
    className="!w-4 !h-4 !bg-blue-500 !border-2 !border-white hover:!border-blue-600 hover:!bg-blue-600 !shadow-md transition-all hover:!scale-125"
/>
```

### 4. **Melhorias nas Edges (Linhas de Conexão)**

**Antes:**
- Linhas finas (2px)
- Cor cinza claro (`#b1b1b7`)
- Sem seta visível

**Depois:**
- ✅ **Linhas mais grossas** (3px)
- ✅ **Cor mais escura** (`#64748b` - gray-600)
- ✅ **Setas grandes e visíveis:**
  - Tipo: `arrowclosed`
  - Tamanho: 20x20px
  - Cor coordenada com a linha

```tsx
// src/components/WorkflowEditorBeta.tsx
defaultEdgeOptions={{ 
    type: 'smoothstep',
    style: { 
        strokeWidth: 3, 
        stroke: '#64748b'
    },
    markerEnd: {
        type: 'arrowclosed',
        color: '#64748b',
        width: 20,
        height: 20
    }
}}
```

### 5. **Linha de Conexão Ativa (ao arrastar)**

Quando você arrasta para criar uma nova conexão:
- ✅ Linha azul vibrante (`#3b82f6`)
- ✅ Espessura de 3px
- ✅ Feedback visual claro

### 6. **Ports do GPT_RESPONSE Melhorados**

**Antes:** 5 portas (1-5)

**Depois:** 6 portas com labels descritivos:
```typescript
{ id: '1', label: 'Valores', type: 'output' },
{ id: '2', label: 'Convênios', type: 'output' },
{ id: '3', label: 'Localização', type: 'output' },
{ id: '4', label: 'Explicação', type: 'output' },
{ id: '5', label: 'Agendar', type: 'output' },
{ id: '6', label: 'Humano', type: 'output' }
```

### 7. **Distribuição Uniforme dos Handles**

Para nodes com múltiplos outputs (ex: CONDITION, GPT_RESPONSE):

```typescript
left: `${(index / (outputs.length - 1)) * 100}%`
```

Isso distribui os handles uniformemente ao longo da base do card, facilitando a visualização de múltiplas conexões.

### 8. **Sincronização Automática de Edges**

```typescript
useEffect(() => {
    const convertedNodes = nodesToReactFlow(workflow.nodes)
    const convertedEdges = edgesToReactFlow(workflow.nodes, workflow.edges)
    setNodes(convertedNodes)
    setEdges(convertedEdges)
}, [workflow, setNodes, setEdges])
```

Sempre que o workflow é carregado ou atualizado, as edges são sincronizadas automaticamente.

---

## 🧪 Como Testar

### 1. Abrir o Editor
```
http://localhost:4002/workflows/editor/cmid7w6gf0000xgtvf4j0n0qe
```

### 2. Verificar no Console (F12)

Você deve ver logs como:
```
🔗 edgesToReactFlow - Convertendo edges do backend
   Nodes disponíveis: (58) ['start', 'clinic_selection', ...]
   Backend edges recebidas: 80
   ✅ Edge criada: start[main] → clinic_selection
   ✅ Edge criada: clinic_selection[true] → unidade_vieiralves
   ...
✅ Total de edges convertidas: 80
```

### 3. Inspecionar Visualmente

- ✅ Todas as linhas devem estar visíveis
- ✅ Setas nas pontas das linhas
- ✅ Handles azuis (topo) e verdes (base) bem visíveis
- ✅ Hover nos handles mostra tooltip com label
- ✅ Hover nos handles aumenta o tamanho (scale)

### 4. Testar Criação de Nova Conexão

1. Arraste do handle verde (saída) de um node
2. Solte no handle azul (entrada) de outro node
3. Veja a linha azul durante o arraste
4. Veja a linha cinza após soltar

### 5. Verificar Nodes Específicos

**GPT Classifier:**
- Deve ter 6 handles de saída na base
- Hover mostra: Valores, Convênios, Localização, Explicação, Agendar, Humano

**Nodes CONDITION:**
- Múltiplos handles de saída
- Distribuídos uniformemente

---

## 🐛 Se Ainda Houver Nodes Isolados

### Verificar no Console:
```
⚠️ Edge inválida: node_x -> node_y
```

Isso indica que a edge aponta para um node que não existe.

### Possíveis Causas:

1. **Edge aponta para node deletado**
   - Solução: Remover a edge do banco de dados

2. **IDs de nodes não batem**
   - Solução: Verificar se `edge.source` e `edge.target` correspondem a `node.id` reais

3. **Handles com IDs errados**
   - Solução: Verificar se `edge.sourceHandle` corresponde a um port existente no node

### Debug Manual:

```javascript
// No console do DevTools, após carregar o editor:
console.log('Nodes:', nodes.map(n => n.id))
console.log('Edges:', edges.map(e => `${e.source} -> ${e.target}`))
```

---

## 📊 Estatísticas Esperadas

Para o workflow `cmid7w6gf0000xgtvf4j0n0qe`:

- ✅ **58 nodes** carregados
- ✅ **80 edges** renderizadas
- ✅ **0 edges inválidas** (sem warnings no console)
- ✅ **100% dos nodes** conectados (exceto START sem entrada e END sem saída)

---

## 🎨 Referência Visual de Cores

### Handles
- 🔵 **Input (Entrada):** `#3b82f6` (blue-500)
- 🟢 **Output (Saída):** `#10b981` (green-500)

### Edges
- **Normal:** `#64748b` (gray-600) - 3px
- **Hover:** Mesma cor com destaque
- **Criando:** `#3b82f6` (blue-500) - 3px

### Setas
- **Tamanho:** 20x20px
- **Estilo:** `arrowclosed`
- **Cor:** Coordenada com a linha

---

## 🚀 Próximos Passos

1. ✅ Verificar console para confirmar 80 edges carregadas
2. ✅ Testar criação manual de conexões
3. ✅ Salvar e recarregar para confirmar persistência
4. ✅ Testar em diferentes tamanhos de tela (zoom in/out)
5. ✅ Verificar no minimapa se todas as conexões aparecem

---

**Última atualização:** 24/11/2025
**Workflow ID:** `cmid7w6gf0000xgtvf4j0n0qe`
**Status:** 🔧 Melhorias aplicadas - Aguardando teste do usuário

