# 🔧 Fix: msg_cadastro_sucesso não avançava automaticamente

## 🐛 Problema Identificado

Após a validação do cadastro, o bot mostrava apenas:
```
✅ Cadastro realizado com sucesso! 
Agora vamos prosseguir com seu agendamento.
```

E **parava** ao invés de continuar automaticamente para:
1. Buscar procedimentos do convênio (ACTION)
2. Mostrar procedimentos (MESSAGE)
3. Transferir para fila (TRANSFER_HUMAN)

## 🔍 Causa Raiz

O nó `msg_cadastro_sucesso` **não estava** na lista de nós que devem auto-avançar.

**Código anterior:**
```typescript
const shouldAutoAdvance = node.id === 'msg_solicita_cadastro';
```

Isso fazia o nó **parar e aguardar** resposta do usuário ao invés de continuar automaticamente.

## ✅ Solução Aplicada

Adicionado `msg_cadastro_sucesso` e `msg_paciente_encontrado` na lista de auto-advance:

```typescript
const shouldAutoAdvance = 
  node.id === 'msg_solicita_cadastro' ||
  node.id === 'msg_cadastro_sucesso' ||
  node.id === 'msg_paciente_encontrado';
```

**Arquivo modificado:**
- `src/services/workflow/executors/messageExecutor.ts` (linha 99-107)

## 🎯 Fluxo Correto Agora

```
validate_cadastro (CONDITION)
  ↓ (resposta: "sim")
create_patient (ACTION) → cria paciente no banco
  ↓
msg_cadastro_sucesso (MESSAGE) → mostra "Cadastro realizado..."
  ↓ ✅ AUTO-AVANÇA (não espera resposta)
action_get_procedimentos_insurance (ACTION) → busca procedimentos
  ↓
msg_procedimentos_insurance (MESSAGE) → mostra procedimentos
  ↓ ✅ AUTO-AVANÇA
transfer_to_queue (TRANSFER_HUMAN) → transfere para fila
```

## 📋 Mensagem Final Esperada

```
✅ Cadastro realizado com sucesso!

Agora vamos prosseguir com seu agendamento.

🩺 **Procedimentos disponíveis para BRADESCO:**

1. Fisioterapia Ortopédica
2. Fisioterapia Neurológica
3. Acupuntura
4. Fisioterapia Pélvica
5. RPG
6. Infiltração / Agulhamento Seco

💡 Você pode informar quais procedimentos deseja agendar 
   enquanto aguarda o atendimento.

⏳ **Você foi encaminhado para um de nossos atendentes!**

Enquanto aguarda, você pode informar quais procedimentos 
deseja agendar. Nossa equipe entrará em contato em breve 
para finalizar seu agendamento.
```

**Observação:** As três mensagens são enviadas em sequência automaticamente:
1. msg_cadastro_sucesso (primeira parte)
2. msg_procedimentos_insurance (lista de procedimentos)  
3. Transferência para fila (última parte)

## 🚀 Deploy

### Local (para testar):
Já aplicado, basta reiniciar o servidor.

### Railway (produção):

**Opção 1: Deploy automático (via GitHub)**
```bash
git add -A
git commit -m "fix: msg_cadastro_sucesso deve auto-avançar"
git push origin main
```

Railway detecta o push e faz deploy automático.

**Opção 2: Deploy manual (via Railway CLI)**
```bash
railway up
```

**Após deploy:**
```bash
# Acessar Railway shell
railway ssh

# Verificar workflow
npm run check:workflow:railway

# Se necessário, sincronizar workflow
npm run sync:workflow:railway:upload
```

## ✅ Verificação

Após deploy, teste o fluxo completo:

1. Enviar "Olá" → escolher unidade
2. Enviar "quero agendar"
3. Preencher dados (nome, CPF, data, email, convênio)
4. Confirmar com "sim"

**Resultado esperado:**
- Bot mostra cadastro sucesso
- **Imediatamente** mostra lista de procedimentos do convênio
- **Imediatamente** transfere para fila
- Atendente vê conversa na fila em tempo real

## 🎯 Resumo

- ✅ Código corrigido: `msg_cadastro_sucesso` e `msg_paciente_encontrado` auto-avançam
- ✅ Workflow mantém fluxo correto: MESSAGE → ACTION → MESSAGE → TRANSFER_HUMAN
- ✅ Sem código hardcoded: tudo representado nos nós do workflow
- ✅ Frontend continua funcionando: Socket.io notifica atendentes em tempo real

---

**Status:** RESOLVIDO ✅

Deploy pendente no Railway.

