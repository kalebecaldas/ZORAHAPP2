# ⚠️ IMPORTANTE: Verificar Conexão "Format Coleta Registration"

## 🐛 Problema Identificado

Na imagem fornecida, o node **"Format Coleta Registration"** aparece **SEM conexão (edge)** para o **"Merge Registration Flows"**.

## ✅ Solução

A conexão **JÁ EXISTE** no arquivo JSON, mas pode não aparecer visualmente após a importação no N8N.

---

## 🔧 Como Corrigir no N8N

### Opção 1: Reconectar Manualmente (Recomendado)

1. **Abra o workflow** no N8N
2. **Localize o node** "Format Coleta Registration"
3. **Arraste uma conexão** da **bolinha de saída** dele
4. **Conecte** no node "Merge Registration Flows"
5. **Configure o Merge** para aceitar 3 inputs:
   - Input 1: Registration Router [continue]
   - Input 2: Format Agil Registration
   - Input 3: Format Coleta Registration ← **Este aqui!**

### Opção 2: Verificar se Já Está Conectado

Às vezes o N8N não mostra a conexão visualmente, mas ela existe.

**Para verificar:**
1. Clique no node **"Merge Registration Flows"**
2. Olhe em **"Input Connections"** (Conexões de Entrada)
3. Deve ter **3 conexões**:
   - `Registration Router` (index 0)
   - `Format Agil Registration` (index 1)
   - `Format Coleta Registration` (index 2) ← **Deve estar aqui!**

Se estiver listado, a conexão existe e está funcionando!

---

## 📊 Conexão Correta

```
Criar Paciente Coletado
  ↓
Format Coleta Registration
  ↓
Merge Registration Flows (Input 3)
  ↓
Intent Router
```

---

## 🧪 Teste para Validar

Execute um teste com **paciente novo**:

```json
{
  "conversationId": "test-novo-123",
  "phone": "5592987654321",
  "message": "Oi, quero agendar"
}
```

**Fluxo esperado:**
1. ✅ Identificador de Paciente (Agil) → Não encontra
2. ✅ Verificador Zorah → Não encontra
3. ✅ Patient Status Checker → action = "COLLECT_DATA"
4. ✅ Registration Router → Rota para "Coletor Rápido Agent"
5. ✅ Bot pede dados: "Preciso de alguns dados rápidos..."
6. ✅ Paciente envia dados
7. ✅ Parse Coleta Response
8. ✅ Criar Paciente Coletado
9. ✅ **Format Coleta Registration** ← Este deve executar!
10. ✅ **Merge Registration Flows** ← E este também!
11. ✅ Intent Router
12. ✅ Resposta final

**Se o teste passar por todos esses nodes, a conexão está funcionando!**

---

## 🔍 Debug

### Ver Execuções

1. No N8N, vá em **"Executions"** (Execuções)
2. Clique na execução de teste
3. Veja se o node **"Format Coleta Registration"** foi executado
4. Veja se o node **"Merge Registration Flows"** recebeu o input

### Ver Logs

No node "Format Coleta Registration", adicione um console.log:

```javascript
console.log('✅ Format Coleta Registration executado:', {
  name: data.name,
  phone: data.phone
});
```

---

## ✅ Checklist de Verificação

- [ ] Workflow importado no N8N
- [ ] Node "Format Coleta Registration" existe
- [ ] Node "Merge Registration Flows" existe
- [ ] Conexão visual entre eles (ou listada no Merge)
- [ ] Merge configurado com mode: "combine"
- [ ] Merge configurado com combinationMode: "mergeByPosition"
- [ ] Teste com paciente novo executado
- [ ] Format Coleta Registration foi executado no teste
- [ ] Merge Registration Flows recebeu 3 inputs

---

## 🛠️ Se Ainda Não Funcionar

### Recriar o Node Merge

1. **Delete** o node "Merge Registration Flows"
2. **Adicione** um novo node "Merge"
3. **Configure**:
   - Mode: **Combine**
   - Combination Mode: **Merge By Position**
4. **Conecte as 3 entradas**:
   - Registration Router [continue] → Input 1
   - Format Agil Registration → Input 2
   - Format Coleta Registration → Input 3
5. **Conecte a saída** do Merge para "Intent Router"

---

## 📝 Configuração Esperada no JSON

A conexão está definida assim:

```json
"Format Coleta Registration": {
  "main": [
    [
      {
        "node": "Merge Registration Flows",
        "type": "main",
        "index": 2
      }
    ]
  ]
}
```

E o Merge deve receber:

```json
"Merge Registration Flows": {
  "main": [
    [
      {
        "node": "Intent Router",
        "type": "main",
        "index": 0
      }
    ]
  ]
}
```

---

## 🎯 Resultado Final

Após corrigir, o workflow deve ter **3 fluxos** que convergem no Merge:

```
Registration Router
  ├─→ [continue] ────────────────────┐
  ├─→ [create_from_agil]             │
  │     ↓                              │
  │   Criar Paciente do Agil         │
  │     ↓                              │
  │   Format Agil Registration ──────┤
  └─→ [collect_data]                 │
        ↓                              │
      Coletor Rápido Agent           ├─→ Merge → Intent Router
        ↓                              │
      Parse Coleta Response          │
        ↓                              │
      Criar Paciente Coletado        │
        ↓                              │
      Format Coleta Registration ────┘
```

---

**Data**: 25/01/2026  
**Status**: ⚠️ Verificação necessária após importação  
**Prioridade**: Alta - Essencial para fluxo de cadastro manual funcionar
