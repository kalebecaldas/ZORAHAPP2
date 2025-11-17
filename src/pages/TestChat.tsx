import React, { useEffect, useState } from 'react'
import { api } from '../lib/utils'

interface Message {
  id: string
  messageText: string
  direction: 'RECEIVED' | 'SENT'
  from: 'USER' | 'AGENT' | 'BOT'
  timestamp: string
}

export function TestChat() {
  const [phone, setPhone] = useState('5511999999999')
  const [text, setText] = useState('Olá!')
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingConv, setLoadingConv] = useState(false)
  const [sending, setSending] = useState(false)
  const [simulating, setSimulating] = useState(false)

  const loadConversation = async () => {
    if (!phone) return
    setLoadingConv(true)
    try {
      const res = await api.get(`/api/conversations/${phone}?limit=50`)
      setMessages(res.data.messages || [])
    } catch (e) {
      setMessages([])
    } finally {
      setLoadingConv(false)
    }
  }

  useEffect(() => {
    loadConversation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendAgentMessage = async () => {
    if (!phone || !text) return
    setSending(true)
    try {
      await api.post('/api/conversations/send', { phone, text, from: 'AGENT' })
      setText('')
      await loadConversation()
    } finally {
      setSending(false)
    }
  }

  const simulatePatientMessage = async () => {
    if (!phone || !text) return
    setSimulating(true)
    try {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'simulated',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: phone,
                    phone_number_id: 'simulated'
                  },
                  messages: [
                    {
                      from: phone,
                      id: 'wamid.simulated.' + Date.now(),
                      timestamp: String(Math.floor(Date.now() / 1000)),
                      text: { body: text },
                      type: 'text'
                    }
                  ]
                },
                field: 'messages'
              }
            ]
          }
        ]
      }
      await api.post('/webhook', payload)
      setText('')
      // pequena espera para IA responder
      setTimeout(loadConversation, 600)
    } finally {
      setSimulating(false)
    }
  }

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      <h1 className="text-2xl font-semibold">Teste de Chat e Bot</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Telefone (E.164)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full border rounded-md px-3 py-2"
              placeholder="5511999999999"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Mensagem</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="mt-1 w-full border rounded-md px-3 py-2"
              rows={3}
              placeholder="Digite a mensagem"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={sendAgentMessage}
              disabled={sending}
              className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50"
            >
              {sending ? 'Enviando...' : 'Enviar como Agente'}
            </button>
            <button
              onClick={simulatePatientMessage}
              disabled={simulating}
              className="px-4 py-2 rounded-md bg-emerald-600 text-white disabled:opacity-50"
            >
              {simulating ? 'Simulando...' : 'Simular Paciente (Webhook)'}
            </button>
          </div>

          <button
            onClick={loadConversation}
            disabled={loadingConv}
            className="px-4 py-2 rounded-md bg-gray-700 text-white disabled:opacity-50"
          >
            {loadingConv ? 'Atualizando...' : 'Atualizar Conversa'}
          </button>
        </div>

        <div className="md:col-span-2">
          <div className="border rounded-lg h-[60vh] p-4 overflow-auto bg-white">
            {messages.length === 0 ? (
              <div className="text-gray-500">Nenhuma mensagem ainda.</div>
            ) : (
              <ul className="space-y-2">
                {messages.map((m) => (
                  <li key={m.id} className={`flex ${m.direction === 'RECEIVED' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
                      m.direction === 'RECEIVED' ? 'bg-gray-100 text-gray-900' : 'bg-blue-600 text-white'
                    }`}>
                      <div className="opacity-80 text-[10px] mb-1">{m.from}</div>
                      <div className="whitespace-pre-line break-words">{m.messageText}</div>
                      <div className="opacity-60 text-[10px] mt-1">{new Date(m.timestamp).toLocaleString()}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TestChat
