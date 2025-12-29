# 📡 API de Webhooks - Documentação Completa

Sistema de webhooks para notificar parceiros externos (Google Ads, CRMs, etc) sobre eventos importantes em tempo real.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Como Funciona](#como-funciona)
3. [Eventos Disponíveis](#eventos-disponíveis)
4. [Autenticação](#autenticação)
5. [Criando um Webhook](#criando-um-webhook)
6. [Recebendo Notificações](#recebendo-notificações)
7. [API Endpoints](#api-endpoints)
8. [Monitoramento e Logs](#monitoramento-e-logs)
9. [Exemplos de Código](#exemplos-de-código)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O sistema de webhooks permite que sistemas externos (parceiros) recebam notificações automáticas quando eventos importantes acontecem no ZorahApp.

### **Casos de Uso:**
- ✅ **Google Ads**: Rastrear conversões de primeira mensagem
- ✅ **CRM**: Sincronizar novos leads automaticamente
- ✅ **Analytics**: Coletar dados de agendamentos
- ✅ **Sistemas de Pagamento**: Notificar sobre novos pacientes

---

## ⚙️ Como Funciona

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  Paciente   │  Msg 1  │  ZorahApp    │ Webhook │  Parceiro   │
│  WhatsApp   │────────>│  Sistema     │────────>│  (Google    │
│             │         │              │  POST   │   Ads, CRM) │
└─────────────┘         └──────────────┘         └─────────────┘
                              │
                              │ Salva log
                              ▼
                        ┌──────────────┐
                        │  Banco de    │
                        │  Dados (Log) │
                        └──────────────┘
```

### **Fluxo:**
1. **Evento ocorre** (ex: primeira mensagem de um paciente)
2. **ZorahApp dispara webhook** para todos os parceiros cadastrados
3. **Parceiro recebe POST** com dados do evento
4. **Sistema registra log** (sucesso ou falha)
5. **Retry automático** em caso de erro (até 3x)

---

## 📨 Eventos Disponíveis

| Evento | Descrição | Quando dispara |
|--------|-----------|----------------|
| `first_message` | Primeira mensagem de um paciente | Nova conversa criada (primeira interação) |
| `appointment_created` | Agendamento criado | Paciente agenda consulta *(em breve)* |
| `conversation_closed` | Conversa encerrada | Atendimento finalizado *(em breve)* |
| `patient_registered` | Paciente cadastrado | Cadastro completo realizado *(em breve)* |

> **Nota:** Atualmente apenas `first_message` está implementado. Mais eventos serão adicionados em breve.

---

## 🔐 Autenticação

Cada webhook possui um **token único** que deve ser validado pelo parceiro.

### **Token Format:**
```
whk_a1b2c3d4e5f6789012345678901234567890abcdef...
```

### **Header de Autenticação:**
```http
X-Webhook-Token: whk_a1b2c3d4e5f6789012345678901234567890abcdef...
```

### **Como Validar (Lado do Parceiro):**

```javascript
// Node.js/Express exemplo
app.post('/webhook', (req, res) => {
  const token = req.headers['x-webhook-token']
  const expectedToken = process.env.ZORAHAPP_WEBHOOK_TOKEN
  
  if (token !== expectedToken) {
    return res.status(401).json({ error: 'Token inválido' })
  }
  
  // Processar webhook...
  console.log('Evento recebido:', req.body)
  res.json({ received: true })
})
```

---

## 🚀 Criando um Webhook

### **Passo 1: Obter Token de Autenticação da API**

Faça login no sistema e obtenha seu JWT token:

```bash
POST https://seu-dominio.com/api/auth/login
Content-Type: application/json

{
  "email": "seu-email@clinica.com",
  "password": "sua-senha"
}
```

**Resposta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "...", "name": "..." }
}
```

### **Passo 2: Criar o Webhook**

```bash
POST https://seu-dominio.com/api/webhooks
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "Google Ads Partner",
  "description": "Webhook para rastreamento de conversões",
  "url": "https://seu-parceiro.com/api/webhook/zorahapp",
  "events": ["first_message"],
  "metadata": {
    "campaign_id": "12345",
    "tracking_id": "abc123"
  }
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "clx123abc",
    "name": "Google Ads Partner",
    "url": "https://seu-parceiro.com/api/webhook/zorahapp",
    "token": "whk_a1b2c3d4e5f6...",
    "events": ["first_message"],
    "isActive": true,
    "createdAt": "2025-01-22T10:00:00.000Z"
  },
  "message": "🎉 Webhook criado! Guarde o token com segurança."
}
```

⚠️ **IMPORTANTE:** Guarde o **token** com segurança! Ele não pode ser recuperado depois.

---

## 📥 Recebendo Notificações

Quando um evento ocorre, seu servidor receberá um **POST** com este formato:

### **Headers:**
```http
POST /seu-endpoint
Content-Type: application/json
X-Webhook-Token: whk_a1b2c3d4e5f6...
X-Event-Type: first_message
X-Webhook-ID: clx123abc
User-Agent: ZorahApp-Webhook/1.0
```

### **Body (Evento: first_message):**
```json
{
  "event": "first_message",
  "timestamp": "2025-01-22T14:30:00.000Z",
  "data": {
    "conversationId": "clx456def",
    "phone": "5592999999999",
    "message": "Boa tarde! Gostaria de agendar fisioterapia",
    "timestamp": "2025-01-22T14:30:00.000Z",
    "patientId": "clx789ghi",
    "patientName": "João Silva",
    "source": "whatsapp",
    "metadata": {
      "isNewConversation": true,
      "hasPatient": true
    }
  }
}
```

### **Sua Resposta Esperada:**

```json
{
  "received": true,
  "status": "processed"
}
```

**Status Code:** `200 OK` (ou qualquer 2xx)

> **Importante:** Responda em até **10 segundos** para evitar timeout.

---

## 📚 API Endpoints

### **Base URL:**
```
https://seu-dominio.com/api/webhooks
```

Todas as rotas requerem **autenticação JWT** via header `Authorization: Bearer <token>`.

---

### **1. Listar Webhooks**

```http
GET /api/webhooks
Authorization: Bearer <jwt-token>
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx123",
      "name": "Google Ads",
      "url": "https://...",
      "events": ["first_message"],
      "isActive": true,
      "lastTriggeredAt": "2025-01-22T14:00:00.000Z",
      "_count": { "logs": 156 }
    }
  ],
  "total": 1
}
```

---

### **2. Buscar Webhook por ID**

```http
GET /api/webhooks/:id
Authorization: Bearer <jwt-token>
```

---

### **3. Atualizar Webhook**

```http
PATCH /api/webhooks/:id
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "Novo Nome",
  "url": "https://nova-url.com/webhook",
  "isActive": true
}
```

---

### **4. Desativar Webhook**

```http
POST /api/webhooks/:id/deactivate
Authorization: Bearer <jwt-token>
```

**Soft delete:** Webhook é mantido no banco mas não dispara mais.

---

### **5. Remover Webhook**

```http
DELETE /api/webhooks/:id
Authorization: Bearer <jwt-token>
```

**Hard delete:** Remove permanentemente (incluindo logs).

---

### **6. Ver Logs do Webhook**

```http
GET /api/webhooks/:id/logs?limit=50&offset=0&onlyErrors=false
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `limit`: Número de logs (padrão: 50)
- `offset`: Paginação (padrão: 0)
- `onlyErrors`: Mostrar apenas falhas (padrão: false)

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "log123",
      "eventType": "first_message",
      "statusCode": 200,
      "responseTime": 245,
      "success": true,
      "createdAt": "2025-01-22T14:30:00.000Z",
      "payload": { "phone": "5592...", "message": "..." }
    }
  ],
  "pagination": {
    "total": 156,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### **7. Ver Estatísticas**

```http
GET /api/webhooks/:id/stats?days=7
Authorization: Bearer <jwt-token>
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "totalRequests": 156,
    "successful": 152,
    "failed": 4,
    "successRate": "97.44%",
    "avgResponseTime": "234ms",
    "period": "Últimos 7 dias"
  }
}
```

---

### **8. Testar Webhook**

```http
POST /api/webhooks/:id/test
Authorization: Bearer <jwt-token>
```

Envia um payload de teste para verificar se o webhook está funcionando.

---

### **9. Reenviar Webhook**

```http
POST /api/webhooks/logs/:logId/resend
Authorization: Bearer <jwt-token>
```

Reenvia um webhook que falhou anteriormente (útil para retry manual).

---

## 📊 Monitoramento e Logs

### **O que é registrado:**
- ✅ **Timestamp** de envio
- ✅ **Status Code** da resposta (200, 500, etc)
- ✅ **Tempo de resposta** (ms)
- ✅ **Payload completo** enviado
- ✅ **Erro** (se houver)
- ✅ **Sucesso/Falha**

### **Retry Automático:**
- **3 tentativas** em caso de erro 5xx ou timeout
- Intervalo: **1s, 2s, 3s** entre tentativas
- Após 3 falhas, registra erro definitivo

### **Timeout:**
- **10 segundos** por requisição
- Depois disso, considera timeout e faz retry

---

## 💻 Exemplos de Código

### **Node.js/Express - Receber Webhook**

```javascript
const express = require('express')
const app = express()

app.use(express.json())

// Endpoint para receber webhooks do ZorahApp
app.post('/webhook/zorahapp', (req, res) => {
  // 1. Validar token
  const token = req.headers['x-webhook-token']
  const expectedToken = process.env.ZORAHAPP_WEBHOOK_TOKEN
  
  if (token !== expectedToken) {
    return res.status(401).json({ error: 'Token inválido' })
  }
  
  // 2. Processar evento
  const { event, timestamp, data } = req.body
  
  console.log(`📥 Webhook recebido: ${event}`)
  console.log(`   Telefone: ${data.phone}`)
  console.log(`   Mensagem: ${data.message}`)
  console.log(`   Paciente: ${data.patientName || 'Anônimo'}`)
  
  // 3. Salvar no banco, enviar para Google Ads, etc
  if (event === 'first_message') {
    // Exemplo: Enviar conversão para Google Ads
    sendToGoogleAds({
      phone: data.phone,
      timestamp: data.timestamp,
      campaignId: 'abc123'
    })
  }
  
  // 4. Responder rapidamente
  res.status(200).json({ 
    received: true,
    status: 'processed',
    timestamp: new Date().toISOString()
  })
})

function sendToGoogleAds(data) {
  // Sua lógica de conversão
  console.log('📊 Enviando conversão para Google Ads:', data)
}

app.listen(3000, () => {
  console.log('🚀 Servidor webhook rodando na porta 3000')
})
```

---

### **Python/Flask - Receber Webhook**

```python
from flask import Flask, request, jsonify
import os
from datetime import datetime

app = Flask(__name__)

EXPECTED_TOKEN = os.getenv('ZORAHAPP_WEBHOOK_TOKEN')

@app.route('/webhook/zorahapp', methods=['POST'])
def webhook():
    # 1. Validar token
    token = request.headers.get('X-Webhook-Token')
    if token != EXPECTED_TOKEN:
        return jsonify({'error': 'Token inválido'}), 401
    
    # 2. Processar evento
    data = request.json
    event = data.get('event')
    event_data = data.get('data', {})
    
    print(f"📥 Webhook recebido: {event}")
    print(f"   Telefone: {event_data.get('phone')}")
    print(f"   Mensagem: {event_data.get('message')}")
    
    # 3. Processar (exemplo: salvar no banco)
    if event == 'first_message':
        save_lead(event_data)
    
    # 4. Responder
    return jsonify({
        'received': True,
        'status': 'processed',
        'timestamp': datetime.now().isoformat()
    }), 200

def save_lead(data):
    # Sua lógica aqui
    print(f"💾 Salvando lead: {data.get('phone')}")

if __name__ == '__main__':
    app.run(port=3000)
```

---

### **PHP - Receber Webhook**

```php
<?php
// webhook.php

// 1. Validar token
$expectedToken = getenv('ZORAHAPP_WEBHOOK_TOKEN');
$receivedToken = $_SERVER['HTTP_X_WEBHOOK_TOKEN'] ?? '';

if ($receivedToken !== $expectedToken) {
    http_response_code(401);
    echo json_encode(['error' => 'Token inválido']);
    exit;
}

// 2. Ler payload
$payload = json_decode(file_get_contents('php://input'), true);
$event = $payload['event'];
$data = $payload['data'];

// 3. Processar
error_log("📥 Webhook recebido: $event");
error_log("   Telefone: " . $data['phone']);
error_log("   Mensagem: " . $data['message']);

if ($event === 'first_message') {
    // Processar primeira mensagem
    saveLeadToDatabase($data);
}

// 4. Responder
http_response_code(200);
echo json_encode([
    'received' => true,
    'status' => 'processed',
    'timestamp' => date('c')
]);

function saveLeadToDatabase($data) {
    // Sua lógica aqui
    error_log("💾 Salvando lead: " . $data['phone']);
}
?>
```

---

## 🐛 Troubleshooting

### **Problema: Webhook não está disparando**

**Soluções:**
1. Verificar se webhook está **ativo**:
   ```bash
   GET /api/webhooks/:id
   # Verificar: "isActive": true
   ```

2. Verificar **logs**:
   ```bash
   GET /api/webhooks/:id/logs?onlyErrors=true
   ```

3. Testar manualmente:
   ```bash
   POST /api/webhooks/:id/test
   ```

---

### **Problema: Webhook retorna erro 401**

**Causa:** Token inválido no lado do parceiro.

**Solução:**
1. Verificar se o parceiro está validando o header correto: `X-Webhook-Token`
2. Verificar se o token está correto (copiar/colar novamente)
3. Criar novo webhook se token foi perdido

---

### **Problema: Timeout (erro após 10s)**

**Causa:** Parceiro demora muito para responder.

**Soluções:**
1. **Processar em background:** Receber webhook, salvar em fila, responder rapidamente
2. **Otimizar código:** Não fazer operações pesadas antes de responder
3. **Aumentar recursos:** Se servidor do parceiro está lento

**Exemplo (Node.js com fila):**
```javascript
app.post('/webhook', async (req, res) => {
  // 1. Responder imediatamente
  res.json({ received: true })
  
  // 2. Processar em background
  setImmediate(async () => {
    const { event, data } = req.body
    await processWebhook(event, data)
  })
})
```

---

### **Problema: Muitas falhas consecutivas**

**Ação:** Sistema automaticamente desativa webhook após muitas falhas consecutivas *(em breve)*.

**Solução:**
1. Verificar logs de erro
2. Corrigir problema no endpoint
3. Reativar webhook:
   ```bash
   PATCH /api/webhooks/:id
   { "isActive": true }
   ```

---

## 🔒 Segurança

### **Recomendações:**

1. **HTTPS obrigatório:** Use apenas URLs `https://`
2. **Validar token:** Sempre verificar `X-Webhook-Token`
3. **Validar IP** *(opcional)*: Aceitar apenas requisições do servidor ZorahApp
4. **Rate limiting:** Proteger seu endpoint contra abuso
5. **Logs:** Registrar todas as requisições recebidas

### **Exemplo de validação de IP (Node.js):**
```javascript
const ALLOWED_IPS = ['123.456.789.0', '987.654.321.0']

app.post('/webhook', (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress
  
  if (!ALLOWED_IPS.includes(clientIP)) {
    return res.status(403).json({ error: 'IP não autorizado' })
  }
  
  // Processar webhook...
})
```

---

## 📞 Suporte

Dúvidas ou problemas?

- **Email:** suporte@zorahapp.com
- **Documentação:** https://docs.zorahapp.com
- **Status:** https://status.zorahapp.com

---

## 🆕 Changelog

### **v1.0 - 2025-01-22**
- ✅ Sistema de webhooks implementado
- ✅ Evento `first_message`
- ✅ Autenticação por token
- ✅ Retry automático (3x)
- ✅ Logs detalhados
- ✅ API completa de gerenciamento

### **Em breve:**
- 🔜 Eventos: `appointment_created`, `conversation_closed`, `patient_registered`
- 🔜 Webhooks assíncronos com filas
- 🔜 Webhooks com assinatura HMAC
- 🔜 Dashboard visual de monitoramento

---

**Documentação atualizada em:** 22/01/2025  
**Versão da API:** 1.0
