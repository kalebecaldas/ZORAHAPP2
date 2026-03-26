# Animação de Encerramento de Conversa

**Arquivo principal:** `src/pages/ConversationsNew.tsx`  
**Data das mudanças:** Março 2026

---

## Visão Geral

Quando um agente encerra uma conversa, o painel de chat executa uma animação de **fade-out + slide down** (0,4 s) antes de exibir o estado vazio "Nenhuma conversa selecionada". Isso substitui o comportamento anterior, onde a conversa permanecia aberta com status "FECHADA" sem nenhuma transição visual.

---

## Como Funciona — Passo a Passo

```
Agente clica "Encerrar"
        ↓
handleClose() → POST /api/conversations/actions { action: 'close' }
        ↓
API responde com sucesso
        ↓
triggerCloseAnimation(conversationId, callback)
    ├── closingConvIdRef.current = 'conv-id'   ← marca IMEDIATAMENTE (síncrono)
    ├── setIsClosingConversation(true)          ← adiciona classe CSS à div
    └── setTimeout(420ms)
            ↓
        recentlyClosedIdsRef.add(id)            ← bloqueia re-seleção por 3s
        setSelectedConversation(null)
        setMessages([])
        setIsClosingConversation(false)
        closingConvIdRef.current = null
        navigate('/conversations', { replace: true })
        callback() → fetchConversations()
                ↓
        Exibe: "Nenhuma conversa selecionada"
```

---

## Componentes da Animação

### 1. CSS (inline no `<style>` do componente)

```css
@keyframes conversationClose {
  0%   { opacity: 1; transform: scale(1) translateY(0); }
  100% { opacity: 0; transform: scale(0.97) translateY(16px); }
}

.conversation-closing {
  animation: conversationClose 0.4s ease-out forwards;
  pointer-events: none;   /* desabilita cliques durante a saída */
}
```

A animação é um **fade-out** combinado com um leve **scale down** (3%) e **slide para baixo** (16px), dando sensação de "fechamento".

### 2. Aplicação da classe no JSX

```tsx
{selectedConversation ? (
  <div className={`flex-1 flex flex-col relative${isClosingConversation ? ' conversation-closing' : ''}`}>
    {/* conteúdo do chat */}
  </div>
) : (
  <div className="flex-1 flex items-center justify-center bg-gray-50">
    <h3>Nenhuma conversa selecionada</h3>
  </div>
)}
```

O elemento **permanece no DOM** durante os 0,4 s da animação (o `selectedConversation` ainda não é null). Somente após o `setTimeout(420ms)` o estado é limpo e o elemento é removido.

### 3. States e Refs usados

| Nome | Tipo | Propósito |
|------|------|-----------|
| `isClosingConversation` | `useState<boolean>` | Controla a classe CSS `.conversation-closing` |
| `closingConvIdRef` | `useRef<string \| null>` | ID da conversa sendo animada — **atualizado sincronamente**, sem esperar batch do React |
| `recentlyClosedIdsRef` | `useRef<Set<string>>` | IDs fechados há menos de 3s — bloqueia re-seleção residual via useEffect de URL |

---

## Por Que Usamos `useRef` e Não `useState`

Usar `useState` para a trava introduziria um **re-render extra** entre a chamada e a verificação. Como o evento de socket pode chegar em microsegundos, o estado poderia ainda não ter propagado, permitindo um segundo disparo.

`useRef` é **síncrono**: a linha `closingConvIdRef.current = id` executa imediatamente, antes de qualquer re-render, antes de qualquer evento de socket processar.

---

## Bugs Corrigidos Durante o Desenvolvimento

### Bug 1 — Duplo Disparo (local)

**Problema:** `handleClose` disparava `triggerCloseAnimation()` → API processava → socket `conversation:closed` disparava `triggerCloseAnimation()` uma segunda vez.

**Causa:** a animação iniciava, e o evento de socket chegava antes dos 420ms expirarem, chamando a função novamente com o ref já liberado.

**Solução:** `closingConvIdRef` é verificado no início de `triggerCloseAnimation`:
```tsx
if (closingConvIdRef.current !== null) return; // já animando → ignora
```

---

### Bug 2 — Conversa Reaparecia Brevemente (Railway/produção)

**Problema:** Após o usuário encerrar, o painel desaparecia e reaparecia por ~0,1 s mostrando a conversa já fechada, inclusive com a mensagem de sistema "Kalebe encerrou a conversa" duplicada.

**Causa-raiz:** Race condition entre 3 eventos simultâneos no Railway:

```
handleClose → triggerCloseAnimation → closingConvIdRef = 'id' (correto, animando)
     ↓
Socket conversation:closed chega
  → guard bloqueia 2ª animação ✓
  → MAS remove conversa da lista local (setConversations.filter)
        ↓
  conversations mudou → useEffect([phone, conversations, ...]) dispara
        ↓
  phone ainda na URL → conversa não na lista → fetch na API
        ↓
  API retorna conversa (agora fechada) → setSelectedConversation(closedConv)
        ↓
  PAINEL REAPARECE (bug visual)
        ↓
420ms depois → setSelectedConversation(null) + navigate → some de vez
```

**Solução em 3 camadas:**

#### Camada 1 — Socket não remove da lista enquanto animando

```tsx
// No handler do evento conversation:closed
setConversations(prev => {
  // ...
  if (closingConvIdRef.current === data.conversationId) {
    return prev; // não remove agora; fetchConversations() limpará após animação
  }
  return prev.filter(c => c.id !== data.conversationId);
});
```

#### Camada 2 — useEffect de URL bloqueado durante animação

```tsx
useEffect(() => {
  if (phone) {
    const conversationId = urlParams.get('conversationId');

    // Guard 1: não re-selecionar enquanto fechando
    if (conversationId && closingConvIdRef.current !== null) return;

    // Guard 2: não re-selecionar se fechado recentemente (< 3s)
    if (conversationId && recentlyClosedIdsRef.current.has(conversationId)) return;

    // ... lógica normal de seleção
  }
}, [phone, conversations, location.search]);
```

#### Camada 3 — `recentlyClosedIdsRef` cobre timing edge cases

```tsx
// Dentro do setTimeout(420ms) de triggerCloseAnimation:
const closedId = closingConvIdRef.current;
if (closedId) {
  recentlyClosedIdsRef.current.add(closedId);
  setTimeout(() => recentlyClosedIdsRef.current.delete(closedId), 3000);
}
```

Cobre o cenário onde o socket chega **depois** que `closingConvIdRef` foi zerado (ex: latência alta no Railway). O ID fica "bloqueado" por 3 segundos.

---

### Bug 3 — URL não era limpa (conversa reaparecia ao navegar de volta)

**Problema:** Após encerrar, ao clicar em outra conversa e voltar, a URL ainda tinha `?conversationId=` do encerramento, causando re-seleção da conversa fechada.

**Solução:** `navigate('/conversations', { replace: true })` dentro do `setTimeout` limpa a URL com `replace` (não cria entrada no histórico do browser).

---

## Fluxo para Encerramento via Socket (outro agente / expiração)

Quando a conversa é encerrada por **outro usuário** ou por **inatividade**:

```
Socket conversation:closed chega
        ↓
closingConvIdRef.current === null?  ← verifica se NÃO somos nós que iniciamos
        ↓ sim
selectedConversation.id === data.conversationId?
        ↓ sim
triggerCloseAnimation(data.conversationId)
        ↓
mesma animação de 0,4s → estado vazio
```

Se `closingConvIdRef.current !== null`, significa que o agente já clicou em encerrar e a animação está em curso — o evento de socket é ignorado.

---

## Mudanças em Outros Arquivos

### `src/components/Sidebar.tsx`
- Removido o texto **"WhatsApp + IA"** ao lado da logo
- Container do header simplificado: `py-4 px-4` em vez de `p-6`, sem `space-x-3` residual

### `src/pages/Login.tsx`
- Logo alterada para `/logo-zorah-completo.png` (logo completa)
- Removida dependência do `useSystemBranding` (que causava flash: favicon → logo real)
- Imagem começa com `opacity-0` e só aparece após `onLoad` (sem flash de troca)

### `src/services/systemBrandingService.ts`
- Valor inicial de `logoUrl` alterado de `/favicon.svg` para `/logo-zorah-icon.png`
- Elimina o flash de ícone pequeno ao carregar a página antes da API responder

### `public/logo-zorah-completo.png`
- Arquivo copiado de `LOGOS/logo zorah completo.png` para ser servido como asset estático

---

## Diagrama de Estados

```
                     ┌─────────────────┐
                     │  Conversa aberta │
                     │ selectedConv ≠ null│
                     └────────┬────────┘
                              │ clique em "Encerrar" / socket conversation:closed
                              ▼
                     ┌─────────────────────────────┐
                     │  ANIMANDO                   │
                     │  isClosingConversation=true  │
                     │  closingConvIdRef = 'id'     │
                     │  classe: conversation-closing│
                     │  (0.4s fade-out)             │
                     └────────────┬────────────────┘
                                  │ setTimeout 420ms
                                  ▼
                     ┌─────────────────────────────┐
                     │  VAZIO                      │
                     │  selectedConv = null         │
                     │  URL: /conversations         │
                     │  "Nenhuma conversa           │
                     │   selecionada"               │
                     └─────────────────────────────┘
```
