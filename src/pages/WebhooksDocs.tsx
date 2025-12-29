import { useState } from 'react'
import { 
  Webhook, 
  Code, 
  Key, 
  Zap, 
  CheckCircle, 
  Copy,
  ExternalLink,
  MessageSquare,
  UserPlus,
  PhoneCall,
  XCircle,
  Send,
  Clock,
  ArrowRight
} from 'lucide-react'

export default function WebhooksDocs() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const events = [
    {
      name: 'first_message',
      icon: MessageSquare,
      color: 'blue',
      description: 'Primeira mensagem recebida de um novo contato',
      when: 'Quando uma nova conversa é iniciada'
    },
    {
      name: 'message_received',
      icon: MessageSquare,
      color: 'purple',
      description: 'Todas as mensagens recebidas na plataforma',
      when: 'Cada vez que o paciente envia uma mensagem'
    },
    {
      name: 'conversation_started',
      icon: PhoneCall,
      color: 'green',
      description: 'Quando uma conversa é criada por qualquer canal',
      when: 'Nova conversa criada (WhatsApp, Instagram, Messenger)'
    },
    {
      name: 'agent_joined',
      icon: UserPlus,
      color: 'indigo',
      description: 'Quando um atendente assume a conversa',
      when: 'Atendente clica em "Assumir conversa"'
    },
    {
      name: 'conversation_closed',
      icon: XCircle,
      color: 'red',
      description: 'Quando uma conversa é finalizada',
      when: 'Atendente encerra o atendimento'
    },
    {
      name: 'patient_registered',
      icon: UserPlus,
      color: 'teal',
      description: 'Quando um novo paciente é cadastrado',
      when: 'Cadastro completo realizado pelo bot ou atendente'
    },
    {
      name: 'appointment_created',
      icon: Clock,
      color: 'orange',
      description: 'Quando um agendamento é criado',
      when: 'Paciente agenda uma consulta'
    },
    {
      name: 'bot_transferred',
      icon: ArrowRight,
      color: 'amber',
      description: 'Quando o bot transfere para atendente humano',
      when: 'Bot detecta necessidade de atendimento humano'
    },
    {
      name: 'message_sent',
      icon: Send,
      color: 'pink',
      description: 'Quando o atendente envia uma mensagem',
      when: 'Qualquer mensagem enviada por atendente'
    }
  ]

  const codeExamples = {
    nodejs: `const express = require('express')
const app = express()

app.use(express.json())

app.post('/webhook/zorahapp', (req, res) => {
  // Validar token
  const token = req.headers['x-webhook-token']
  if (token !== process.env.ZORAHAPP_WEBHOOK_TOKEN) {
    return res.status(401).json({ error: 'Token inválido' })
  }
  
  // Processar evento
  const { event, timestamp, data } = req.body
  
  console.log(\`📥 Evento: \${event}\`)
  console.log(\`📞 Telefone: \${data.phone}\`)
  console.log(\`💬 Mensagem: \${data.message}\`)
  
  // Sua lógica aqui
  switch(event) {
    case 'first_message':
      // Enviar para Google Ads
      sendToGoogleAds(data)
      break
    case 'appointment_created':
      // Atualizar CRM
      updateCRM(data)
      break
  }
  
  // Responder rapidamente
  res.json({ received: true })
})

app.listen(3000)`,
    python: `from flask import Flask, request, jsonify
import os

app = Flask(__name__)

@app.route('/webhook/zorahapp', methods=['POST'])
def webhook():
    # Validar token
    token = request.headers.get('X-Webhook-Token')
    if token != os.getenv('ZORAHAPP_WEBHOOK_TOKEN'):
        return jsonify({'error': 'Token inválido'}), 401
    
    # Processar evento
    data = request.json
    event = data.get('event')
    event_data = data.get('data', {})
    
    print(f"📥 Evento: {event}")
    print(f"📞 Telefone: {event_data.get('phone')}")
    
    # Sua lógica aqui
    if event == 'first_message':
        send_to_google_ads(event_data)
    elif event == 'appointment_created':
        update_crm(event_data)
    
    # Responder rapidamente
    return jsonify({'received': True}), 200

if __name__ == '__main__':
    app.run(port=3000)`,
    php: `<?php
// webhook.php

// Validar token
$expectedToken = getenv('ZORAHAPP_WEBHOOK_TOKEN');
$receivedToken = $_SERVER['HTTP_X_WEBHOOK_TOKEN'] ?? '';

if ($receivedToken !== $expectedToken) {
    http_response_code(401);
    echo json_encode(['error' => 'Token inválido']);
    exit;
}

// Processar evento
$payload = json_decode(file_get_contents('php://input'), true);
$event = $payload['event'];
$data = $payload['data'];

error_log("📥 Evento: $event");
error_log("📞 Telefone: " . $data['phone']);

// Sua lógica aqui
switch($event) {
    case 'first_message':
        sendToGoogleAds($data);
        break;
    case 'appointment_created':
        updateCRM($data);
        break;
}

// Responder rapidamente
http_response_code(200);
echo json_encode(['received' => true]);
?>`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Webhook className="w-12 h-12" />
            </div>
            <div>
              <h1 className="text-5xl font-bold">Webhooks API</h1>
              <p className="text-blue-100 text-xl mt-2">
                Integre seu sistema com o ZorahApp em tempo real
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6 mt-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <Zap className="w-8 h-8 mb-3" />
              <h3 className="font-semibold text-lg mb-2">Tempo Real</h3>
              <p className="text-blue-100 text-sm">
                Receba notificações instantâneas quando eventos ocorrem
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <Key className="w-8 h-8 mb-3" />
              <h3 className="font-semibold text-lg mb-2">Seguro</h3>
              <p className="text-blue-100 text-sm">
                Autenticação por token único e criptografado
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <CheckCircle className="w-8 h-8 mb-3" />
              <h3 className="font-semibold text-lg mb-2">Confiável</h3>
              <p className="text-blue-100 text-sm">
                Retry automático (3x) em caso de falha
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Quick Start */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            Início Rápido
          </h2>
          
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    Criar Webhook na Plataforma
                  </h3>
                  <p className="text-gray-600 mb-3">
                    Acesse <strong>Configuração da IA → Webhooks</strong> e crie um novo webhook com a URL do seu sistema.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <code className="text-sm text-gray-800">
                      POST https://seu-sistema.com/webhook/zorahapp
                    </code>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    Copiar Token de Autenticação
                  </h3>
                  <p className="text-gray-600 mb-3">
                    Após criar, você receberá um token único. <strong>Guarde-o com segurança!</strong>
                  </p>
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <code className="text-sm text-amber-900 font-mono">
                      whk_a1b2c3d4e5f6789012345678901234567890abcdef...
                    </code>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    Implementar Endpoint
                  </h3>
                  <p className="text-gray-600 mb-3">
                    Crie um endpoint POST que valida o token e processa os eventos.
                  </p>
                  <p className="text-sm text-gray-500">
                    Veja exemplos de código abaixo ↓
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Events */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-purple-600" />
            </div>
            Eventos Disponíveis
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            {events.map((event) => {
              const Icon = event.icon
              return (
                <div
                  key={event.name}
                  className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 bg-${event.color}-100 rounded-lg`}>
                      <Icon className={`w-6 h-6 text-${event.color}-600`} />
                    </div>
                    <div className="flex-1">
                      <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-800">
                        {event.name}
                      </code>
                      <p className="text-gray-900 font-medium mt-2">
                        {event.description}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>Dispara:</strong> {event.when}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Code Examples */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Code className="w-6 h-6 text-green-600" />
            </div>
            Exemplos de Código
          </h2>

          <div className="space-y-6">
            {/* Node.js */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">🟢</span>
                  Node.js / Express
                </h3>
                <button
                  onClick={() => copyCode(codeExamples.nodejs, 'nodejs')}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {copiedCode === 'nodejs' ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
              <div className="p-6 bg-gray-900">
                <pre className="text-sm text-gray-100 overflow-x-auto">
                  <code>{codeExamples.nodejs}</code>
                </pre>
              </div>
            </div>

            {/* Python */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">🐍</span>
                  Python / Flask
                </h3>
                <button
                  onClick={() => copyCode(codeExamples.python, 'python')}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {copiedCode === 'python' ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
              <div className="p-6 bg-gray-900">
                <pre className="text-sm text-gray-100 overflow-x-auto">
                  <code>{codeExamples.python}</code>
                </pre>
              </div>
            </div>

            {/* PHP */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">🐘</span>
                  PHP
                </h3>
                <button
                  onClick={() => copyCode(codeExamples.php, 'php')}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {copiedCode === 'php' ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
              <div className="p-6 bg-gray-900">
                <pre className="text-sm text-gray-100 overflow-x-auto">
                  <code>{codeExamples.php}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Payload Example */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Formato do Payload
          </h2>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Headers</h3>
            </div>
            <div className="p-6 bg-gray-900">
              <pre className="text-sm text-gray-100">
{`X-Webhook-Token: whk_a1b2c3d4e5f6...
X-Event-Type: first_message
Content-Type: application/json`}
              </pre>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-4">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Body (JSON)</h3>
            </div>
            <div className="p-6 bg-gray-900">
              <pre className="text-sm text-gray-100">
{`{
  "event": "first_message",
  "timestamp": "2025-01-22T14:30:00.000Z",
  "data": {
    "conversationId": "clx456def",
    "phone": "5592999999999",
    "message": "Boa tarde! Gostaria de agendar",
    "patientId": "clx789ghi",
    "patientName": "João Silva",
    "source": "whatsapp",
    "metadata": {
      "isNewConversation": true,
      "hasPatient": true
    }
  }
}`}
              </pre>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section>
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Pronto para começar?</h2>
            <p className="text-xl text-blue-100 mb-8">
              Crie seu primeiro webhook e comece a receber eventos em tempo real
            </p>
            <a
              href="/ai-config"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Criar Webhook
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p>© 2025 ZorahApp. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  )
}
