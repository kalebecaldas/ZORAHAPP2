export type Message = {
  id: string
  phone_number: string
  message_text: string
  direction: 'received' | 'sent'
  from: 'user' | 'agent' | 'bot'
  timestamp: string
}

export type Conversation = {
  id: string
  phone: string
  status: 'bot_queue' | 'principal' | 'em_atendimento' | 'fechada'
  assigned_to: string | null
  assigned_to_name: string | null
  last_message: string
  last_timestamp: string
  patient?: { name?: string; cpf?: string; convenio?: string }
  messages: Message[]
}

const conversations = new Map<string, Conversation>()

export function upsertConversation(phone: string, updater: (c: Conversation) => void) {
  const existing = conversations.get(phone) || {
    id: phone,
    phone,
    status: 'bot_queue',
    assigned_to: null,
    assigned_to_name: null,
    last_message: '',
    last_timestamp: new Date().toISOString(),
    messages: [],
  }
  updater(existing)
  conversations.set(phone, existing)
  return existing
}

export function listConversations() {
  return Array.from(conversations.values())
}

export function getConversation(phone: string) {
  return conversations.get(phone) || null
}

export function clearConversation(phone: string) {
  conversations.delete(phone)
}

