import { describe, it, expect, beforeEach } from 'vitest'
import { useConversationStore } from './conversationStore'

describe('conversationStore', () => {
  beforeEach(() => {
    const initial = useConversationStore.getState()
    useConversationStore.setState({
      conversations: [],
      activeConversation: null,
      filters: initial.filters,
      sortBy: initial.sortBy,
      sortOrder: initial.sortOrder,
      isLoading: false,
      error: null,
      socket: null,
      isConnected: false,
    })
  })

  it('assignConversation moves to my-conversations and sets status assigned', () => {
    const { addConversation, assignConversation, getMyConversations } = useConversationStore.getState()
    const conv = {
      id: 'c1',
      patientName: 'Paciente',
      patientPhone: '559999999',
      status: 'principal' as const,
      priority: 'low' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastInteraction: new Date(),
      messageCount: 0,
      unreadCount: 0,
      isActive: true,
      queue: 'principal' as const,
      tags: [],
    }
    addConversation(conv)
    assignConversation('c1', { id: 'u1', name: 'User', role: 'AGENT' })
    const mine = getMyConversations('u1')
    expect(mine.length).toBe(1)
    expect(mine[0].status).toBe('assigned')
    expect(mine[0].queue).toBe('my-conversations')
  })

  it('getPrincipalQueue includes assigned conversations for visibility', () => {
    const { setConversations, getPrincipalQueue } = useConversationStore.getState()
    const now = new Date()
    setConversations([
      { id: 'p1', patientName: 'A', patientPhone: '1', status: 'principal', priority: 'low', createdAt: now, updatedAt: now, lastInteraction: now, messageCount: 0, unreadCount: 0, isActive: true, queue: 'principal', tags: [] },
      { id: 'a1', patientName: 'B', patientPhone: '2', status: 'assigned', priority: 'low', createdAt: now, updatedAt: now, lastInteraction: now, messageCount: 0, unreadCount: 0, isActive: true, queue: 'my-conversations', tags: [] },
    ])
    const principal = getPrincipalQueue()
    expect(principal.find(c => c.id === 'a1')).toBeTruthy()
  })

  it('getBotQueue includes assigned conversations for visibility', () => {
    const { setConversations, getBotQueue } = useConversationStore.getState()
    const now = new Date()
    setConversations([
      { id: 'b1', patientName: 'A', patientPhone: '1', status: 'bot', priority: 'low', createdAt: now, updatedAt: now, lastInteraction: now, messageCount: 0, unreadCount: 0, isActive: true, queue: 'bot', tags: [] },
      { id: 'a1', patientName: 'B', patientPhone: '2', status: 'assigned', priority: 'low', createdAt: now, updatedAt: now, lastInteraction: now, messageCount: 0, unreadCount: 0, isActive: true, queue: 'my-conversations', tags: [] },
    ])
    const bot = getBotQueue()
    expect(bot.find(c => c.id === 'a1')).toBeTruthy()
  })

  it('addAssignmentRequest appends to metadata history', () => {
    const { addConversation, addAssignmentRequest } = useConversationStore.getState()
    const conv = {
      id: 'c2',
      patientName: 'Paciente',
      patientPhone: '559999999',
      status: 'assigned' as const,
      priority: 'low' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastInteraction: new Date(),
      messageCount: 0,
      unreadCount: 0,
      isActive: true,
      queue: 'my-conversations' as const,
      tags: [],
    }
    addConversation(conv)
    addAssignmentRequest('c2', { userId: 'u2', userName: 'Outro', timestamp: new Date(), status: 'pending' })
    const updated = useConversationStore.getState().conversations.find(c => c.id === 'c2')
    expect(updated?.metadata?.assignmentRequests?.length).toBe(1)
  })
})