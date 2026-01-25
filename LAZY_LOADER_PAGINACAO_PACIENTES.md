# Lazy Loader e Paginação - Página de Pacientes

## Alterações Implementadas

### 1. ✅ Paginação Ajustada para 15 Pacientes por Página

**Antes:** 20 pacientes por página  
**Agora:** 15 pacientes por página

**Mudanças:**
- `limit: '20'` → `limit: '15'` na API
- Cálculo de paginação atualizado: `((currentPage - 1) * 15) + 1`
- Mensagem de paginação mostra "Mostrando X a Y de Z pacientes"

---

### 2. ✅ Lazy Loader (Skeleton Loader)

**Componente Criado:** `PatientTableSkeleton.tsx`

**Características:**
- Animação de pulse (skeleton shimmer)
- 15 linhas de skeleton por padrão
- Estrutura idêntica à tabela real
- Placeholders animados para todos os campos

**Visual:**
```
┌─────────────────────────────────────┐
│ Nome │ Telefone │ Email │ ...       │
├─────────────────────────────────────┤
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ← Animação pulse
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ... (15 linhas)                     │
└─────────────────────────────────────┘
```

**Onde é usado:**
- Durante carregamento inicial
- Ao mudar de página
- Ao fazer pesquisa
- Ao aplicar filtros

---

### 3. ✅ Pesquisa Dinâmica com Paginação

**Comportamento:**

#### Cenário: Pesquisar "Maria" (100 resultados)

1. **Usuário digita "Maria" na barra de pesquisa**
   - Debounce de 500ms
   - Reseta para página 1 automaticamente
   - Faz requisição: `GET /api/patients?page=1&limit=15&search=Maria`

2. **Backend retorna:**
   - Primeiros 15 pacientes com nome "Maria"
   - `pagination.total = 100` (total de Marias)
   - `pagination.pages = 7` (100 ÷ 15 = 6.67 → 7 páginas)

3. **Frontend exibe:**
   - Skeleton loader durante carregamento
   - 15 pacientes na página 1
   - Paginação mostra "1 2 3 4 5 ... 7"
   - Mensagem: "Mostrando 1 a 15 de 100 pacientes (filtrado por: "Maria")"

4. **Usuário clica em "Próxima" ou página 2:**
   - Barra de pesquisa **mantém** "Maria"
   - Faz requisição: `GET /api/patients?page=2&limit=15&search=Maria`
   - Mostra pacientes 16-30
   - Mensagem: "Mostrando 16 a 30 de 100 pacientes (filtrado por: "Maria")"

5. **Usuário navega entre páginas:**
   - Pesquisa permanece ativa
   - Cada página carrega 15 novos resultados
   - Skeleton loader aparece durante transição

---

### 4. ✅ Lazy Loading em Modais

**ConversationHistoryModal:**
- Carregado com `Suspense` e `lazy`
- Mostra skeleton loader durante carregamento
- Melhora performance inicial da página

**Visual do Loading:**
```
┌─────────────────────────┐
│     ⏳                   │
│ Carregando histórico... │
└─────────────────────────┘
```

---

## Fluxo Completo de Funcionamento

### Fluxo 1: Carregamento Inicial

```
1. Usuário acessa /patients
   ↓
2. Loading = true
   ↓
3. Exibe PatientTableSkeleton (15 linhas)
   ↓
4. fetchPatients(1, '')
   ↓
5. API retorna 15 pacientes
   ↓
6. Loading = false
   ↓
7. Exibe tabela com dados
```

### Fluxo 2: Pesquisa com Múltiplas Páginas

```
1. Usuário digita "Maria"
   ↓
2. Debounce 500ms
   ↓
3. Reseta para página 1
   ↓
4. Loading = true
   ↓
5. Exibe PatientTableSkeleton
   ↓
6. fetchPatients(1, 'Maria')
   ↓
7. API retorna 15 Marias + pagination.total = 100
   ↓
8. Loading = false
   ↓
9. Exibe 15 pacientes + paginação (7 páginas)
   ↓
10. Usuário clica página 2
    ↓
11. Loading = true
    ↓
12. Exibe PatientTableSkeleton
    ↓
13. fetchPatients(2, 'Maria') ← Pesquisa mantida!
    ↓
14. API retorna Marias 16-30
    ↓
15. Loading = false
    ↓
16. Exibe pacientes 16-30
```

### Fluxo 3: Pesquisa + Filtros Locais

```
1. Usuário pesquisa "Maria" → 100 resultados
   ↓
2. Backend retorna página 1 (15 Marias)
   ↓
3. Filtros locais aplicados:
   - Se filtro "Convênio: Bradesco" ativo
   - Filtra os 15 pacientes retornados
   - Pode resultar em menos de 15 exibidos
   ↓
4. Paginação ainda mostra total do backend (100)
   - Mas exibe apenas os que passaram no filtro local
```

---

## Componentes Criados/Modificados

### Novo Componente

**`src/components/PatientTableSkeleton.tsx`**
- Componente de skeleton loader
- Props: `rows` (padrão: 15)
- Animação pulse do Tailwind
- Estrutura idêntica à tabela real

### Arquivo Modificado

**`src/pages/Patients.tsx`**

**Alterações principais:**

1. **Imports:**
   ```typescript
   import { PatientTableSkeleton } from '../components/PatientTableSkeleton';
   import { Suspense, lazy } from 'react';
   ```

2. **Limite de paginação:**
   ```typescript
   limit: '15' // era '20'
   ```

3. **useEffect para pesquisa:**
   ```typescript
   useEffect(() => {
     const timer = setTimeout(() => {
       if (currentPage === 1) {
         fetchPatients(1, searchTerm);
       } else {
         setCurrentPage(1); // Reseta para página 1
       }
     }, 500);
     return () => clearTimeout(timer);
   }, [searchTerm]);
   ```

4. **useEffect para mudança de página:**
   ```typescript
   useEffect(() => {
     fetchPatients(currentPage, searchTerm); // Mantém pesquisa
   }, [currentPage]);
   ```

5. **Skeleton loader:**
   ```typescript
   {loading ? (
     <PatientTableSkeleton rows={15} />
   ) : ...}
   ```

6. **Mensagem de paginação:**
   ```typescript
   Mostrando {((currentPage - 1) * 15) + 1} a {Math.min(currentPage * 15, totalPatients)} de {totalPatients} pacientes
   {searchTerm && (
     <span>(filtrado por: "{searchTerm}")</span>
   )}
   ```

7. **Lazy loading do modal:**
   ```typescript
   <Suspense fallback={<LoadingModal />}>
     <ConversationHistoryModal ... />
   </Suspense>
   ```

---

## Exemplos de Uso

### Exemplo 1: Pesquisa Simples

**Ação:** Usuário digita "João"  
**Resultado:** 
- 45 pacientes encontrados
- 3 páginas (15 + 15 + 15)
- Paginação: "1 2 3"
- Mensagem: "Mostrando 1 a 15 de 45 pacientes (filtrado por: "João")"

**Navegação:**
- Clica "Próxima" → Página 2
- Pesquisa "João" permanece na barra
- Carrega pacientes 16-30
- Mensagem: "Mostrando 16 a 30 de 45 pacientes (filtrado por: "João")"

### Exemplo 2: Pesquisa Grande

**Ação:** Usuário digita "Maria"  
**Resultado:**
- 100 pacientes encontrados
- 7 páginas (15×6 + 10)
- Paginação: "1 2 3 4 5 ... 7"
- Mensagem: "Mostrando 1 a 15 de 100 pacientes (filtrado por: "Maria")"

**Navegação:**
- Clica página 7 → Última página
- Pesquisa mantida
- Carrega pacientes 91-100
- Mensagem: "Mostrando 91 a 100 de 100 pacientes (filtrado por: "Maria")"

### Exemplo 3: Pesquisa + Filtro Local

**Ação:** 
1. Pesquisa "Silva"
2. Aplica filtro "Convênio: Bradesco"

**Resultado:**
- Backend retorna 15 pacientes "Silva" (página 1)
- Filtro local filtra apenas os que têm Bradesco
- Pode mostrar menos de 15 na tela
- Paginação ainda mostra total do backend

---

## Melhorias de Performance

### Antes
- ❌ Loading simples com spinner
- ❌ Sem feedback visual durante carregamento
- ❌ Modal carregado sempre

### Agora
- ✅ Skeleton loader realista
- ✅ Feedback visual imediato
- ✅ Modal lazy loaded
- ✅ Transições suaves

---

## Estados da Interface

### Estado: Carregando

```
┌─────────────────────────────────────┐
│ [Skeleton com animação pulse]      │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ... (15 linhas)                     │
└─────────────────────────────────────┘
```

### Estado: Sem Resultados

```
┌─────────────────────────────────────┐
│ Nenhum paciente encontrado para    │
│ "Maria"                             │
└─────────────────────────────────────┘
```

### Estado: Com Dados

```
┌─────────────────────────────────────┐
│ Tabela normal com 15 pacientes      │
│ + Paginação funcional               │
└─────────────────────────────────────┘
```

---

## Testes Recomendados

### Teste 1: Paginação Básica
1. Acesse `/patients`
2. Verifique que aparecem 15 pacientes
3. Clique "Próxima"
4. Verifique que aparecem os próximos 15
5. Mensagem deve mostrar "Mostrando 16 a 30..."

### Teste 2: Pesquisa com Múltiplas Páginas
1. Digite "Maria" na pesquisa
2. Aguarde carregar (skeleton aparece)
3. Verifique que aparecem 15 Marias
4. Verifique paginação (ex: "1 2 3 ... 7")
5. Clique página 2
6. Verifique que pesquisa "Maria" ainda está na barra
7. Verifique que aparecem Marias 16-30

### Teste 3: Skeleton Loader
1. Faça uma pesquisa
2. Observe skeleton loader durante carregamento
3. Verifique animação pulse
4. Verifique que estrutura é idêntica à tabela

### Teste 4: Navegação Entre Páginas
1. Pesquise "João"
2. Vá para página 2
3. Vá para página 3
4. Volte para página 1
5. Verifique que pesquisa permanece ativa em todas as páginas

### Teste 5: Limpar Pesquisa
1. Pesquise "Maria"
2. Apague o texto da pesquisa
3. Verifique que volta para todos os pacientes
4. Verifique que volta para página 1

---

## Detalhes Técnicos

### Debounce da Pesquisa

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    if (currentPage === 1) {
      fetchPatients(1, searchTerm);
    } else {
      setCurrentPage(1); // Reseta para página 1
    }
  }, 500); // 500ms de debounce

  return () => clearTimeout(timer);
}, [searchTerm]);
```

**Por quê 500ms?**
- Balance entre responsividade e performance
- Evita requisições excessivas
- Tempo suficiente para usuário terminar de digitar

### Persistência da Pesquisa

```typescript
useEffect(() => {
  fetchPatients(currentPage, searchTerm); // Sempre passa searchTerm
}, [currentPage]);
```

**Garantias:**
- Pesquisa mantida ao mudar página
- Pesquisa mantida ao navegar
- Pesquisa mantida ao recarregar (se implementado localStorage)

### Skeleton Loader

```typescript
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-32"></div>
</div>
```

**Classes Tailwind:**
- `animate-pulse` - Animação de pulse
- `bg-gray-200` - Cor de fundo do skeleton
- `rounded` - Bordas arredondadas
- Tamanhos variados para realismo

---

## Próximas Melhorias Possíveis

### Performance
- [ ] Cache de resultados pesquisados
- [ ] Infinite scroll ao invés de paginação
- [ ] Virtual scrolling para listas muito grandes

### UX
- [ ] Indicador de "Carregando mais resultados..."
- [ ] Transição suave entre páginas
- [ ] Preservar scroll position ao voltar

### Funcionalidades
- [ ] Salvar pesquisa no localStorage
- [ ] Histórico de pesquisas recentes
- [ ] Pesquisa avançada (múltiplos campos)

---

**Data de Implementação:** 25/01/2026  
**Status:** ✅ Completo e Funcional  
**Arquivos Criados:** 1  
**Arquivos Modificados:** 1
