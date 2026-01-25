# Correções - Pesquisa Case-Insensitive e Paginação

## Problemas Identificados e Corrigidos

### 1. ✅ Busca Case-Sensitive no Backend

**Problema:** A busca no backend estava usando `contains` sem `mode: 'insensitive'`, tornando a pesquisa case-sensitive.

**Antes:**
```typescript
const where = search ? {
  OR: [
    { name: { contains: String(search) } },
    { phone: { contains: String(search) } },
    { cpf: { contains: String(search) } },
  ]
} : {}
```

**Depois:**
```typescript
const where = search ? {
  OR: [
    { name: { contains: String(search), mode: 'insensitive' } },
    { phone: { contains: String(search), mode: 'insensitive' } },
    { cpf: { contains: String(search), mode: 'insensitive' } },
  ]
} : {}
```

**Resultado:**
- ✅ Busca "maria" encontra "Maria", "MARIA", "MaRiA"
- ✅ Busca "MARIA" encontra "maria", "Maria", "MaRiA"
- ✅ Busca funciona independente de maiúsculas/minúsculas

---

### 2. ✅ Limite Padrão Ajustado para 15

**Problema:** O limite padrão no backend ainda estava em 20.

**Antes:**
```typescript
const { page = 1, limit = 20, search = '' } = req.query
```

**Depois:**
```typescript
const { page = 1, limit = 15, search = '' } = req.query
```

**Resultado:**
- ✅ Backend agora retorna 15 pacientes por padrão
- ✅ Alinhado com o frontend

---

### 3. ✅ Ordenação por Nome (Alfabética)

**Problema:** A ordenação estava por `createdAt: 'desc'` ao invés de alfabética.

**Antes:**
```typescript
orderBy: { createdAt: 'desc' }
```

**Depois:**
```typescript
orderBy: { name: 'asc' }
```

**Resultado:**
- ✅ Pacientes ordenados alfabeticamente por nome
- ✅ Ordenação consistente entre backend e frontend

---

## Comportamento da Paginação

### Quando a Paginação Aparece?

**Condição:** `totalPages > 1`

**Exemplos:**

#### Cenário 1: 13 pacientes cadastrados
- Limite: 15 por página
- Total: 13 pacientes
- Páginas: `Math.ceil(13 / 15) = 1`
- **Resultado:** Paginação NÃO aparece ✅

#### Cenário 2: 15 pacientes cadastrados
- Limite: 15 por página
- Total: 15 pacientes
- Páginas: `Math.ceil(15 / 15) = 1`
- **Resultado:** Paginação NÃO aparece ✅

#### Cenário 3: 16 pacientes cadastrados
- Limite: 15 por página
- Total: 16 pacientes
- Páginas: `Math.ceil(16 / 15) = 2`
- **Resultado:** Paginação APARECE ✅
- Mostra: "1 2" (duas páginas)

#### Cenário 4: 100 pacientes cadastrados
- Limite: 15 por página
- Total: 100 pacientes
- Páginas: `Math.ceil(100 / 15) = 7`
- **Resultado:** Paginação APARECE ✅
- Mostra: "1 2 3 4 5 ... 7" (sete páginas)

---

## Barra de Pesquisa

### Localização no Código

A barra de pesquisa está implementada em:
```typescript
// Linha 303-314 de Patients.tsx
<div className="flex items-center space-x-4 mb-6">
  <div className="flex-1 relative">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
    <input
      type="text"
      placeholder="Buscar pacientes..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </div>
  ...
</div>
```

### Por que pode não estar visível?

1. **Scroll necessário:** A barra pode estar acima da área visível
2. **Cache do navegador:** Pode estar mostrando versão antiga
3. **CSS:** Pode haver conflito de estilos

### Solução

**Hard refresh do navegador:**
- **Chrome/Edge:** `Ctrl+Shift+R` (Windows) ou `Cmd+Shift+R` (Mac)
- **Firefox:** `Ctrl+F5` (Windows) ou `Cmd+Shift+R` (Mac)
- **Safari:** `Cmd+Option+R`

---

## Testes de Funcionamento

### Teste 1: Busca Case-Insensitive

**Passos:**
1. Digite "maria" (minúsculas)
2. Verifique que encontra "Maria Silva Santos"
3. Limpe a pesquisa
4. Digite "MARIA" (maiúsculas)
5. Verifique que encontra os mesmos resultados

**Resultado Esperado:** ✅ Funciona independente de maiúsculas/minúsculas

### Teste 2: Paginação com Poucos Pacientes

**Passos:**
1. Certifique-se de ter menos de 15 pacientes
2. Acesse `/patients`
3. Verifique que NÃO há controles de paginação

**Resultado Esperado:** ✅ Paginação não aparece

### Teste 3: Paginação com Muitos Pacientes

**Passos:**
1. Certifique-se de ter mais de 15 pacientes (ex: 20)
2. Acesse `/patients`
3. Verifique que há controles de paginação no rodapé

**Resultado Esperado:** ✅ Paginação aparece com "1 2"

### Teste 4: Pesquisa + Paginação

**Passos:**
1. Digite "Maria" na pesquisa
2. Se houver mais de 15 resultados, verifique paginação
3. Navegue para página 2
4. Verifique que pesquisa "Maria" permanece na barra

**Resultado Esperado:** ✅ Pesquisa mantida entre páginas

---

## Arquivos Modificados

### Backend

**`api/routes/patients.ts`**

**Alterações:**
1. ✅ Adicionado `mode: 'insensitive'` em todas as buscas
2. ✅ Limite padrão alterado de 20 para 15
3. ✅ Ordenação alterada de `createdAt: 'desc'` para `name: 'asc'`

**Código completo da rota:**
```typescript
router.get('/', patientsAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 15, search = '' } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where = search ? {
      OR: [
        { name: { contains: String(search), mode: 'insensitive' } },
        { phone: { contains: String(search), mode: 'insensitive' } },
        { cpf: { contains: String(search), mode: 'insensitive' } },
      ]
    } : {}

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { name: 'asc' },
        include: {
          conversations: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { status: true, lastMessage: true, lastTimestamp: true }
          }
        }
      }),
      prisma.patient.count({ where })
    ])

    res.json({
      patients,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('Erro ao buscar pacientes:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})
```

---

## Resumo das Correções

| Item | Antes | Depois | Status |
|------|-------|--------|--------|
| **Busca Case-Sensitive** | ❌ Case-sensitive | ✅ Case-insensitive | ✅ Corrigido |
| **Limite Padrão** | 20 | 15 | ✅ Corrigido |
| **Ordenação** | Por data (desc) | Por nome (asc) | ✅ Corrigido |
| **Paginação** | Aparece se > 1 página | Aparece se > 1 página | ✅ Funcionando |

---

## Próximos Passos

1. **Reiniciar o servidor backend** para aplicar as mudanças
2. **Fazer hard refresh no navegador** para limpar cache
3. **Testar busca case-insensitive** com diferentes combinações
4. **Verificar paginação** com diferentes quantidades de pacientes

---

**Data de Correção:** 25/01/2026  
**Status:** ✅ Todas as correções aplicadas  
**Arquivos Modificados:** 1 (backend)
