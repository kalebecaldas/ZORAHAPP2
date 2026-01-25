# Fix: Lazy Loader Durante Pesquisa

## Problema Identificado

**Sintoma:** Ao digitar na barra de pesquisa, a tabela ficava "piscando" (desaparecendo e aparecendo).

**Causa:** Durante o debounce de 500ms, não havia feedback visual. A tabela simplesmente mudava de repente quando a busca completava, causando um efeito visual ruim.

---

## Solução Implementada

### Estado de Loading Específico para Busca

**Novo estado:** `isSearching`

**Comportamento:**
1. **Usuário começa a digitar** → `isSearching = true` imediatamente
2. **Skeleton loader aparece** → Feedback visual instantâneo
3. **Debounce de 500ms** → Aguarda usuário terminar de digitar
4. **Busca executa** → Faz requisição à API
5. **Busca completa** → `isSearching = false` → Mostra resultados
6. **Usuário limpa pesquisa** → `isSearching = false` imediatamente

---

## Código Implementado

### Novo Estado

```typescript
const [isSearching, setIsSearching] = useState(false);
```

### Lógica de Loading Durante Busca

```typescript
useEffect(() => {
  // Se pesquisa foi limpa, desativar loading imediatamente
  if (!searchTerm.trim()) {
    setIsSearching(false);
    return;
  }

  // Ativar loading imediatamente quando há mudança na pesquisa
  setIsSearching(true);

  const timer = setTimeout(() => {
    if (currentPage === 1) {
      fetchPatients(1, searchTerm).finally(() => {
        setIsSearching(false);
      });
    } else {
      setCurrentPage(1);
    }
  }, 500);

  return () => {
    clearTimeout(timer);
  };
}, [searchTerm]);
```

### Renderização Condicional

```typescript
{loading || isSearching ? (
  <PatientTableSkeleton rows={15} />
) : filteredPatients.length === 0 ? (
  // Mensagem de "sem resultados"
) : (
  // Tabela com dados
)}
```

---

## Fluxo Visual

### Antes (Com Problema)

```
1. Usuário digita "maria"
   ↓
2. [500ms de espera - SEM FEEDBACK]
   ↓
3. Tabela muda de repente → PISCA ❌
```

### Depois (Corrigido)

```
1. Usuário digita "maria"
   ↓
2. Skeleton loader aparece IMEDIATAMENTE ✅
   ↓
3. [500ms de debounce - COM FEEDBACK VISUAL]
   ↓
4. Busca executa
   ↓
5. Skeleton desaparece suavemente
   ↓
6. Resultados aparecem → SEM PISCAR ✅
```

---

## Estados da Interface

### Estado 1: Carregamento Inicial

```
┌─────────────────────────────────────┐
│ [Skeleton Loader]                  │
│ loading = true                     │
│ isSearching = false                │
└─────────────────────────────────────┘
```

### Estado 2: Usuário Digitando

```
┌─────────────────────────────────────┐
│ [Skeleton Loader]                  │
│ loading = false                     │
│ isSearching = true ✅               │
│ (Feedback imediato)                 │
└─────────────────────────────────────┘
```

### Estado 3: Busca Completa

```
┌─────────────────────────────────────┐
│ [Tabela com Resultados]             │
│ loading = false                     │
│ isSearching = false                 │
└─────────────────────────────────────┘
```

### Estado 4: Pesquisa Limpa

```
┌─────────────────────────────────────┐
│ [Tabela Normal]                     │
│ loading = false                     │
│ isSearching = false ✅               │
│ (Desativa imediatamente)            │
└─────────────────────────────────────┘
```

---

## Benefícios

### UX Melhorada

✅ **Feedback Visual Imediato**
- Usuário vê que algo está acontecendo
- Não há "lag" aparente

✅ **Transição Suave**
- Skeleton → Resultados (sem piscar)
- Experiência mais polida

✅ **Responsividade Percebida**
- Sistema parece mais rápido
- Usuário não fica esperando sem feedback

### Técnico

✅ **Estado Dedicado**
- `isSearching` separado de `loading`
- Controle mais fino do estado visual

✅ **Cleanup Adequado**
- Timer limpo corretamente
- Sem memory leaks

---

## Casos de Uso

### Caso 1: Busca Rápida

**Cenário:** Usuário digita "maria" rapidamente

**Fluxo:**
1. Digita "m" → Skeleton aparece
2. Digita "a" → Skeleton continua
3. Digita "r" → Skeleton continua
4. Digita "i" → Skeleton continua
5. Digita "a" → Skeleton continua
6. Para de digitar → Aguarda 500ms
7. Busca executa → Skeleton desaparece
8. Resultados aparecem

**Resultado:** ✅ Transição suave, sem piscar

### Caso 2: Busca e Limpeza

**Cenário:** Usuário digita "maria" e depois apaga tudo

**Fluxo:**
1. Digita "maria" → Skeleton aparece
2. Aguarda 500ms → Busca executa
3. Resultados aparecem
4. Apaga tudo → Skeleton desaparece IMEDIATAMENTE
5. Tabela normal aparece

**Resultado:** ✅ Resposta instantânea ao limpar

### Caso 3: Múltiplas Digitações Rápidas

**Cenário:** Usuário digita e apaga várias vezes rapidamente

**Fluxo:**
1. Digita "m" → Skeleton aparece
2. Apaga → Skeleton desaparece
3. Digita "jo" → Skeleton aparece
4. Apaga → Skeleton desaparece
5. Digita "pedro" → Skeleton aparece
6. Para → Busca executa

**Resultado:** ✅ Cada mudança tem feedback imediato

---

## Testes Recomendados

### Teste 1: Busca Básica

1. Acesse `/patients`
2. Digite "maria" na barra de pesquisa
3. **Verifique:** Skeleton aparece imediatamente
4. Aguarde busca completar
5. **Verifique:** Transição suave, sem piscar

### Teste 2: Busca Rápida

1. Digite rapidamente "joao" (sem pausar)
2. **Verifique:** Skeleton aparece e permanece durante digitação
3. Pare de digitar
4. **Verifique:** Busca executa após 500ms

### Teste 3: Limpar Pesquisa

1. Digite "maria"
2. Aguarde resultados aparecerem
3. Apague tudo da barra de pesquisa
4. **Verifique:** Skeleton desaparece imediatamente
5. **Verifique:** Tabela normal aparece sem delay

### Teste 4: Múltiplas Mudanças

1. Digite "m"
2. Apague
3. Digite "j"
4. Apague
5. Digite "p"
6. **Verifique:** Cada mudança tem feedback visual adequado

---

## Comparação Antes/Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Feedback ao digitar** | ❌ Nenhum | ✅ Skeleton imediato |
| **Efeito visual** | ❌ Pisca | ✅ Transição suave |
| **Responsividade** | ❌ Parece lento | ✅ Parece rápido |
| **UX** | ❌ Confuso | ✅ Clara e intuitiva |

---

## Arquivos Modificados

### `src/pages/Patients.tsx`

**Alterações:**
1. ✅ Adicionado estado `isSearching`
2. ✅ Lógica de ativação/desativação durante busca
3. ✅ Renderização condicional com `loading || isSearching`
4. ✅ Paginação oculta durante busca

**Linhas modificadas:** ~20 linhas

---

## Próximas Melhorias Possíveis

### Performance
- [ ] Otimizar re-renders durante digitação
- [ ] Memoização do skeleton loader

### UX
- [ ] Indicador de "Buscando..." no skeleton
- [ ] Animação de fade entre estados
- [ ] Contador de resultados durante busca

---

**Data de Correção:** 25/01/2026  
**Status:** ✅ Problema Resolvido  
**Impacto:** UX significativamente melhorada
