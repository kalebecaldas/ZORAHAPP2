# 🚀 Guia Rápido de Importação - N8N Workflow Unificado

## ✅ Arquivo Único Pronto para Usar

**Arquivo**: `n8n/COMPLETE_UNIFIED_WORKFLOW.json`

---

## 📦 O que Está Incluído

### **33 Nós Completos:**
```
┌─────────────────────────────────────────────────────────┐
│                    FLUXO UNIFICADO                     │
└─────────────────────────────────────────────────────────┘

1. 📨 Webhook Receiver (entrada)
   ↓
2. 🔍 Extrair Dados
   ↓
3. 📚 Carregar Contexto (API) + 🏥 Dados Clínica (API)
   ↓
4. 🔗 Mesclar Contexto
   ↓
5. 🧠 GPT: Classificar Intenção
   ↓
   ├─→ ℹ️ INFORMAÇÃO? → ⚡ Fallback → 💬 GPT Info
   ├─→ 📅 AGENDAR? → 👤 Check Patient → 📝 Coletar Dados → 🩺 Agendar
   ├─→ ❌ CANCELAR? → 📝 GPT Cancelar → ❌ Cancelar API
   └─→ ⚠️ RECLAMAÇÃO? → 📝 Resumo → 🔄 Transferir Fila
   ↓
6. 📦 Formatar Resposta
   ↓
7. 🔙 Enviar ao Sistema
   ↓
8. ✅ Webhook Response (saída)
```

### **Todas as Edges Mapeadas:**
- ✅ 33 conexões principais
- ✅ Branches condicionais (true/false)
- ✅ Execuções paralelas
- ✅ Merge points
- ✅ Type e index especificados

---

## 🎯 Como Importar (3 minutos)

### **Passo 1: Acesse o N8N**
```
https://n8n.zorahapp.com.br
ou
http://localhost:5678 (se local)
```

### **Passo 2: Importar Workflow**
1. Clique em **"Workflows"** no menu
2. Clique no botão **"Import from File"**
3. Selecione: `n8n/COMPLETE_UNIFIED_WORKFLOW.json`
4. Clique em **"Import"**

### **Passo 3: Configurar Variáveis**
Vá em **Settings → Environment Variables** e adicione:

```env
ZORAHAPP_API_URL=https://zorahapp.com.br
ZORAHAPP_API_TOKEN=seu-jwt-token-aqui
```

### **Passo 4: Configurar Credenciais**
1. **OpenAI API:**
   - Type: `OpenAI`
   - API Key: `sk-proj-...`
   - Name: `OpenAI API`
   - ID deve ser: `1`

2. **ZorahApp API:**
   - Type: `HTTP Header Auth`
   - Header Name: `Authorization`
   - Header Value: `Bearer {{$env.ZORAHAPP_API_TOKEN}}`

### **Passo 5: Ativar Workflow**
1. Abra o workflow importado
2. Clique no botão **"Active"** (toggle no canto superior direito)
3. ✅ Pronto! O workflow está rodando!

---

## 🧪 Testar o Workflow

### **Teste via cURL:**
```bash
curl -X POST https://n8n.zorahapp.com.br/webhook/zorahbot \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Olá, quero agendar uma consulta",
    "phone": "5592999999999",
    "conversationId": "test-123",
    "patient": {
      "id": "patient-456",
      "name": "João Silva",
      "insuranceCompany": "Bradesco",
      "registrationComplete": true
    },
    "context": {
      "history": [],
      "currentIntent": null
    }
  }'
```

### **Teste via Postman:**
1. **Method**: POST
2. **URL**: `https://n8n.zorahapp.com.br/webhook/zorahbot`
3. **Body** (raw JSON):
```json
{
  "message": "quero saber os valores de RPG",
  "phone": "5592999999999",
  "conversationId": "test-001",
  "patient": {},
  "context": {}
}
```

### **Teste via N8N Interface:**
1. Abra o workflow
2. Clique em "Execute Workflow"
3. Adicione dados de teste no webhook
4. Veja a execução em tempo real! 🎬

---

## 📊 Visualizar Execuções

### **Dashboard N8N:**
1. Clique em **"Executions"**
2. Veja todas as execuções:
   - ✅ Sucesso (verde)
   - ❌ Erro (vermelho)
   - ⏱️ Tempo de execução
   - 📊 Dados processados

### **Debug:**
1. Clique em uma execução
2. Veja **cada nó** executado
3. Veja **dados de entrada/saída** de cada nó
4. Identifique **onde falhou** (se houver erro)

---

## 🔧 Integração com o Sistema

### **Criar endpoint no sistema para receber respostas:**

**Arquivo**: `api/routes/webhook-n8n.ts`

```typescript
import { Router } from 'express'
import prisma from '../prisma/client.js'
import { whatsAppService } from '../services/whatsapp.js'

const router = Router()

router.post('/n8n-response', async (req, res) => {
  try {
    const { conversationId, message, intent, action, entities } = req.body
    
    // 1. Buscar conversa
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    })
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' })
    }
    
    // 2. Enviar mensagem ao WhatsApp
    await whatsAppService.sendMessage(conversation.phone, message)
    
    // 3. Salvar mensagem no histórico
    await prisma.message.create({
      data: {
        conversationId,
        from: 'bot',
        content: message,
        metadata: { intent, entities, source: 'n8n' }
      }
    })
    
    // 4. Atualizar contexto
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        currentIntent: intent,
        workflowContext: entities,
        lastTimestamp: new Date()
      }
    })
    
    // 5. Ações especiais
    if (action === 'transfer_human') {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { queue: 'PRINCIPAL', status: 'WAITING' }
      })
    }
    
    res.json({ success: true })
    
  } catch (error: any) {
    console.error('❌ Erro:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
```

### **Atualizar app.ts:**
```typescript
import webhookN8NRoutes from './routes/webhook-n8n.js'

app.use('/webhook', webhookN8NRoutes)
```

### **Criar serviço de envio para N8N:**

**Arquivo**: `api/services/n8nBotService.ts`

```typescript
import axios from 'axios'

export class N8NBotService {
  private n8nUrl = process.env.N8N_WEBHOOK_URL || 'https://n8n.zorahapp.com.br/webhook/zorahbot'
  
  async processMessage(data: {
    message: string
    phone: string
    conversationId: string
    patient?: any
    context?: any
  }) {
    try {
      const response = await axios.post(this.n8nUrl, data, {
        timeout: 30000
      })
      
      return response.data
      
    } catch (error) {
      console.error('❌ Erro N8N:', error)
      
      // Fallback para sistema antigo
      const { intelligentBotService } = await import('./intelligentBot.js')
      return intelligentBotService.processMessage(
        data.message,
        data.phone,
        data.conversationId,
        data.context
      )
    }
  }
}

export const n8nBotService = new N8NBotService()
```

---

## 🎯 Resumo

### ✅ O que Você Tem Agora:

1. **Arquivo Único**: `COMPLETE_UNIFIED_WORKFLOW.json`
   - 33 nós integrados
   - Todas as conexões mapeadas
   - Pronto para importar

2. **Documentação Completa**:
   - `N8N_MIGRATION_GUIDE.md` - Guia detalhado
   - `N8N_EXECUTIVE_SUMMARY.md` - Resumo executivo
   - `N8N_QUICK_START.md` - Este guia rápido

3. **Código de Integração**:
   - Exemplos de `n8nBotService.ts`
   - Exemplos de `webhook-n8n.ts`
   - Instruções de integração

---

## ⚡ Próximo Passo ÚNICO:

**Importe o arquivo no N8N:**
```
n8n/COMPLETE_UNIFIED_WORKFLOW.json
```

**Configure:**
- OpenAI API Key
- ZorahApp API Token

**Ative o workflow!** ✅

---

**Tempo estimado**: 5 minutos para importar e configurar  
**Complexidade**: Baixa  
**Status**: ✅ Pronto para uso imediato

---

**Criado em**: 29/12/2025  
**Versão**: 1.0  
**Arquivo**: 1010 linhas, 33 nós, 33 conexões
