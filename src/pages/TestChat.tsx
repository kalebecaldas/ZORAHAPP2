import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/utils'
import { toast } from 'sonner'
import { Play, RefreshCw, Zap, Phone, MessageSquare, User, Settings } from 'lucide-react'
import { useSocket } from '../hooks/useSocket'

interface Message {
  id: string
  messageText: string
  direction: 'RECEIVED' | 'SENT'
  from: 'USER' | 'AGENT' | 'BOT'
  timestamp: string
}

export function TestChat() {
  const [phone, setPhone] = useState('5592999999999')
  const [text, setText] = useState('Olá!')
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingConv, setLoadingConv] = useState(false)
  const [sending, setSending] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [testRunning, setTestRunning] = useState(false)
  const [testLog, setTestLog] = useState<string[]>([])

  const loadConversation = async () => {
    if (!phone) return
    setLoadingConv(true)
    try {
      const res = await api.get(`/api/conversations/${phone}?limit=200`)
      setMessages(res.data.messages || [])
    } catch (e) {
      setMessages([])
    } finally {
      setLoadingConv(false)
    }
  }

  const getConversation = async (): Promise<Message[]> => {
    try {
      const res = await api.get(`/api/conversations/${phone}?limit=200`)
      const msgs: Message[] = res.data?.messages || []
      setMessages(msgs)
      return msgs
    } catch {
      return []
    }
  }

  const { socket, isConnected, joinConversation } = useSocket()
  useEffect(() => {
    if (!socket || !isConnected || !phone) return
    joinConversation(phone)
    const onNew = (payload: any) => {
      try {
        const convPhone = payload?.conversation?.phone
        if (convPhone === phone) {
          getConversation()
        }
      } catch { }
    }
    const onUpdated = (payload: any) => {
      try {
        const convPhone = payload?.phone
        if (convPhone === phone) {
          getConversation()
        }
      } catch { }
    }
    socket.on('new_message', onNew)
    socket.on('conversation_updated', onUpdated)
    return () => {
      socket.off('new_message', onNew)
      socket.off('conversation_updated', onUpdated)
    }
  }, [socket, isConnected, phone])

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
    const messageText = text
    setText('') // Clear immediately

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
                    text: { body: messageText },
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

    // Send without waiting
    api.post('/webhook', payload).then(() => {
      loadConversation()
    })
  }


  const randomPhone = () => {
    // E.164 sem +, Brasil (55), DDD 92, celular 9 + 8 dígitos
    const digits = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('')
    setPhone(`55929${digits}`)
  }

  const sendWebhookText = async (body: string) => {
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
                    text: { body },
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
    await loadConversation()

  }

  const lastBotMessage = useMemo(() => {
    const bot = [...messages].reverse().find(m => m.from === 'BOT' && m.direction === 'SENT')
    return bot?.messageText || ''
  }, [messages])

  const waitForBot = async (pred: (msg: string) => boolean, timeoutMs = 8000, intervalMs = 700) => {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      const msgs = await getConversation()
      const bot = [...msgs].reverse().find(m => m.from === 'BOT' && m.direction === 'SENT')
      const msg = bot?.messageText || ''
      if (msg && pred(msg)) return msg
      await new Promise(r => setTimeout(r, intervalMs))
    }
    throw new Error('Tempo esgotado aguardando resposta do bot')
  }

  const runFullTest = async () => {
    if (!phone) { toast.error('Informe o telefone'); return }
    setTestRunning(true)
    setTestLog([])
    const log = (s: string) => setTestLog(prev => [...prev, `${new Date().toLocaleTimeString()} — ${s}`])
    try {
      log('Selecionando unidade Vieiralves')
      await sendWebhookText('Vieiralves')
      await waitForBot(m => m.includes('Você escolheu a Unidade'))

      log('Perguntando valor da acupuntura')
      await sendWebhookText('Qual o valor da acupuntura?')
      await waitForBot(m => m.includes('💰 Valores') && /Acupuntura/i.test(m))

      log('Perguntando valor da fisioterapia')
      await sendWebhookText('Qual o valor da fisioterapia?')
      await waitForBot(m => m.includes('💰 Valores') && /Fisioterapia/i.test(m))

      log('Perguntando valor do RPG')
      await sendWebhookText('Qual o valor do RPG?')
      await waitForBot(m => m.includes('💰 Valores') && /RPG/i.test(m))

      log('Perguntando localização')
      await sendWebhookText('Qual a localização?')
      await waitForBot(m => m.includes('📍'))

      log('Iniciando agendamento')
      await sendWebhookText('Quero agendar')

      let done = false
      const maxSteps = 20
      for (let i = 0; i < maxSteps && !done; i++) {
        await loadConversation()
        const msg = lastBotMessage
        if (!msg) { await new Promise(r => setTimeout(r, 700)); continue }
        if (/📱 Deseja usar este número do WhatsApp/.test(msg)) { log('Confirmando telefone do WhatsApp'); await sendWebhookText('sim'); continue }
        if (/✍️ Informe seu nome completo/.test(msg)) { log('Informando nome'); await sendWebhookText('Fulano Teste'); continue }
        if (/💳 Qual é seu convênio/.test(msg)) { log('Informando convênio'); await sendWebhookText('Bradesco'); continue }
        if (/📆 Qual é sua data de nascimento/.test(msg)) { log('Informando nascimento'); await sendWebhookText('19/11/1990'); continue }
        if (/📝 Qual procedimento você deseja/.test(msg)) { log('Informando procedimento'); await sendWebhookText('Acupuntura'); continue }
        if (/📅 Qual data preferida/.test(msg)) { log('Informando data preferida'); await sendWebhookText('2025-12-01'); continue }
        if (/🕐 Qual turno prefere/.test(msg)) { log('Informando turno'); await sendWebhookText('manhã'); continue }
        if (/✅ Intenção registrada/.test(msg) || /📝 Intenção de Agendamento/.test(msg)) { log('Intenção registrada / transferido'); done = true; break }
        await new Promise(r => setTimeout(r, 700))
      }
      if (!done) throw new Error('Fluxo de agendamento não concluiu dentro do limite')
      toast.success('Teste completo com sucesso')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao executar teste')
    } finally {
      setTestRunning(false)
    }
  }

  return (
    <div className="p-6 h-full overflow-auto bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-600" />
          <h1 className="text-xl font-semibold">Página de Testes do Bot</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={loadConversation} disabled={loadingConv} className="px-3 py-2 rounded-md bg-gray-700 text-white disabled:opacity-50 flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> {loadingConv ? 'Atualizando...' : 'Atualizar'}
          </button>
          <button onClick={runFullTest} disabled={testRunning} className="px-3 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50 flex items-center gap-2">
            <Play className="h-4 w-4" /> {testRunning ? 'Testando...' : 'Rodar Teste Completo'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="border rounded-lg h-[64vh] p-4 overflow-auto bg-white">
            {messages.length === 0 ? (
              <div className="text-gray-500">Nenhuma mensagem ainda.</div>
            ) : (
              <ul className="space-y-3">
                {messages.map((m) => (
                  <li key={m.id} className={`flex ${m.direction === 'RECEIVED' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm shadow ${m.direction === 'RECEIVED' ? 'bg-gray-100 text-gray-900' : (m.from === 'BOT' ? 'bg-indigo-600 text-white' : 'bg-blue-600 text-white')
                      }`}>
                      <div className="opacity-80 text-[11px] mb-1 flex items-center gap-1">
                        {m.direction === 'RECEIVED' ? <User className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                        {m.from}
                      </div>
                      <div className="whitespace-pre-line break-words leading-relaxed">{m.messageText}</div>
                      <div className="opacity-60 text-[10px] mt-2">{new Date(m.timestamp).toLocaleString()}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="lg:col-span-1">
          <div className="space-y-4 bg-white border rounded-lg p-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Telefone (E.164)</label>
              <div className="flex gap-2">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1 border rounded-md px-3 py-2" placeholder="55929XXXXXXXX" />
                <button onClick={randomPhone} className="px-3 py-2 rounded-md bg-gray-100 text-gray-700 border flex items-center gap-2"><Phone className="h-4 w-4" /> Aleatório</button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Mensagem</label>
              <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full border rounded-md px-3 py-2" rows={3} placeholder="Digite a mensagem" />
            </div>

            <div className="flex gap-2">
              <button onClick={sendAgentMessage} disabled={sending} className="px-3 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50 flex items-center gap-2">
                <Zap className="h-4 w-4" /> {sending ? 'Enviando...' : 'Enviar como Agente'}
              </button>
              <button onClick={simulatePatientMessage} className="px-3 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Enviar como Paciente
              </button>

            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Logs do Teste</div>
              <div className="border rounded-md p-2 h-40 overflow-auto text-xs bg-gray-50">
                {testLog.length === 0 ? <div className="text-gray-400">Sem logs ainda.</div> : (
                  <ul className="space-y-1">
                    {testLog.map((l, idx) => (<li key={idx}>{l}</li>))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TestChat
