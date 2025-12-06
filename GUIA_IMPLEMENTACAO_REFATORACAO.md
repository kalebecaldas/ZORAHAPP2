# 🎯 GUIA DE IMPLEMENTAÇÃO - REFATORAÇÃO COMPLETA

## ✅ **JÁ CRIADO:**

### **Hooks:**
1. ✅ `src/hooks/conversations/useConversations.ts`
2. ✅ `src/hooks/conversations/useMessages.ts`
3. ✅ `src/hooks/conversations/useAudioRecorder.ts`

### **Componentes:**
4. ✅ `src/components/conversations/ConversationHeader.tsx`

---

## 📋 **PRÓXIMOS PASSOS - FAÇA VOCÊ MESMO:**

### **PASSO 1: Testar o que já foi criado**

1. Abra `ConversationsNew.tsx`
2. Importe o hook:
```tsx
import { useConversations } from '../hooks/conversations/useConversations';
```

3. Use no componente:
```tsx
const {
    conversations,
    loading,
    fetchConversations,
    handleAssume
} = useConversations();
```

4. Substitua os estados antigos pelos do hook
5. Teste se funciona!

---

### **PASSO 2: Criar componentes restantes**

Você precisa criar mais **4 componentes**. Vou dar a estrutura básica:

#### **A) QueueTabs.tsx** (~100 linhas)

```tsx
import React from 'react';
import { Bot, Users, UserCheck, Clock, Archive } from 'lucide-react';

type QueueType = 'BOT_QUEUE' | 'PRINCIPAL' | 'EM_ATENDIMENTO' | 'MINHAS_CONVERSAS' | 'ENCERRADOS';

interface QueueTabsProps {
    activeQueue: QueueType;
    onQueueChange: (queue: QueueType) => void;
    counts: Record<QueueType, number>;
}

export const QueueTabs: React.FC<QueueTabsProps> = ({ activeQueue, onQueueChange, counts }) => {
    const queues = [
        { key: 'BOT_QUEUE', label: 'Bot', icon: Bot, color: 'blue' },
        { key: 'PRINCIPAL', label: 'Fila', icon: Clock, color: 'yellow' },
        { key: 'EM_ATENDIMENTO', label: 'Atendimento', icon: Users, color: 'green' },
        { key: 'MINHAS_CONVERSAS', label: 'Minhas', icon: UserCheck, color: 'purple' },
        { key: 'ENCERRADOS', label: 'Encerrados', icon: Archive, color: 'gray' }
    ];

    return (
        <div className="flex gap-2 p-3 border-b border-gray-200 bg-white">
            {queues.map(queue => {
                const Icon = queue.icon;
                const isActive = activeQueue === queue.key;
                const count = counts[queue.key as QueueType] || 0;

                return (
                    <button
                        key={queue.key}
                        onClick={() => onQueueChange(queue.key as QueueType)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                            isActive
                                ? `bg-${queue.color}-100 text-${queue.color}-700 border border-${queue.color}-300`
                                : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <Icon className="h-4 w-4" />
                        {isActive && <span className="text-sm font-medium">{queue.label}</span>}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            isActive ? 'bg-white/60' : 'bg-gray-200'
                        }`}>
                            {count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};
```

#### **B) ConversationList.tsx** (~200 linhas)

```tsx
import React from 'react';
import { User } from 'lucide-react';
import { Conversation } from '../../hooks/conversations/useConversations';

interface ConversationListProps {
    conversations: Conversation[];
    selectedId?: string;
    onSelect: (conversation: Conversation) => void;
    onAssume?: (conversation: Conversation) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
    conversations,
    selectedId,
    onSelect,
    onAssume
}) => {
    return (
        <div className="flex-1 overflow-y-auto">
            {conversations.map(conversation => {
                const isSelected = selectedId === conversation.id;
                const canAssume = (conversation.status === 'BOT_QUEUE' || conversation.status === 'PRINCIPAL') && !conversation.assignedToId;

                return (
                    <div
                        key={conversation.id}
                        onClick={() => onSelect(conversation)}
                        className={`mx-2 my-2 p-3 border rounded-lg cursor-pointer transition-all ${
                            isSelected
                                ? 'bg-blue-50 border-blue-300 shadow-md'
                                : 'bg-white border-gray-200 hover:bg-gray-50 hover:shadow-sm'
                        }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                    <User className="h-5 w-5 text-gray-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-gray-900 text-sm truncate">
                                        {conversation.patient?.name || conversation.phone}
                                    </h3>
                                    <p className="text-xs text-gray-500">{conversation.phone}</p>
                                    {conversation.lastMessage && (
                                        <p className="text-xs text-gray-600 truncate mt-1">
                                            {conversation.lastMessage}
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            {conversation.unreadCount && conversation.unreadCount > 0 && (
                                <span className="inline-flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-semibold rounded-full">
                                    {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                                </span>
                            )}
                        </div>

                        {canAssume && onAssume && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAssume(conversation);
                                }}
                                className="mt-2 w-full text-xs bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 transition-colors"
                            >
                                Assumir
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
```

#### **C) MessageArea.tsx** (~150 linhas)

```tsx
import React, { useEffect, useRef } from 'react';
import { Message } from '../../hooks/conversations/useMessages';
import { User, Bot } from 'lucide-react';

interface MessageAreaProps {
    messages: Message[];
}

export const MessageArea: React.FC<MessageAreaProps> = ({ messages }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((message) => {
                const isFromBot = message.direction === 'SENT';

                return (
                    <div
                        key={message.id}
                        className={`flex ${isFromBot ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`flex items-start gap-2 max-w-[70%] ${
                            isFromBot ? 'flex-row-reverse' : ''
                        }`}>
                            {/* Avatar */}
                            <div className={`p-2 rounded-full ${
                                message.sender === 'BOT' ? 'bg-blue-100' :
                                message.sender === 'PATIENT' ? 'bg-gray-100' : 'bg-green-100'
                            }`}>
                                {message.sender === 'BOT' ? (
                                    <Bot className="h-4 w-4 text-blue-600" />
                                ) : (
                                    <User className="h-4 w-4 text-gray-600" />
                                )}
                            </div>

                            {/* Message Bubble */}
                            <div className={`px-4 py-2 rounded-2xl shadow-sm ${
                                isFromBot
                                    ? 'bg-blue-600 text-white rounded-br-sm'
                                    : 'bg-white text-gray-900 rounded-bl-sm border border-gray-200'
                            }`}>
                                <p className="text-sm whitespace-pre-wrap break-words">
                                    {message.messageText}
                                </p>
                                <p className={`text-xs mt-1 ${
                                    isFromBot ? 'text-blue-100' : 'text-gray-500'
                                }`}>
                                    {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>
    );
};
```

#### **D) MessageInput.tsx** (~150 linhas)

```tsx
import React, { useState } from 'react';
import { Send, Paperclip, Mic } from 'lucide-react';

interface MessageInputProps {
    onSend: (text: string) => void;
    onStartRecording?: () => void;
    disabled?: boolean;
    placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
    onSend,
    onStartRecording,
    disabled = false,
    placeholder = 'Digite sua mensagem...'
}) => {
    const [message, setMessage] = useState('');

    const handleSend = () => {
        if (message.trim() && !disabled) {
            onSend(message);
            setMessage('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="bg-white border-t border-gray-200 p-4">
            <div className="flex items-center gap-2">
                <button
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    disabled={disabled}
                >
                    <Paperclip className="h-5 w-5 text-gray-600" />
                </button>

                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />

                {message.trim() ? (
                    <button
                        onClick={handleSend}
                        disabled={disabled}
                        className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                ) : (
                    <button
                        onClick={onStartRecording}
                        disabled={disabled}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Mic className="h-5 w-5 text-gray-600" />
                    </button>
                )}
            </div>
        </div>
    );
};
```

---

### **PASSO 3: Refatorar ConversationsNew.tsx**

Agora você pode simplificar MUITO a página principal:

```tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useConversations } from '../hooks/conversations/useConversations';
import { useMessages } from '../hooks/conversations/useMessages';
import { useAudioRecorder } from '../hooks/conversations/useAudioRecorder';
import { ConversationHeader } from '../components/conversations/ConversationHeader';
import { QueueTabs } from '../components/conversations/QueueTabs';
import { ConversationList } from '../components/conversations/ConversationList';
import { MessageArea } from '../components/conversations/MessageArea';
import { MessageInput } from '../components/conversations/MessageInput';

const ConversationsNew = () => {
    const { phone } = useParams();
    const [activeQueue, setActiveQueue] = useState('MINHAS_CONVERSAS');
    const [selectedConversation, setSelectedConversation] = useState(null);

    // Hooks
    const {
        conversations,
        loading,
        fetchConversations,
        handleAssume
    } = useConversations();

    const {
        messages,
        sendMessage,
        fetchMessages
    } = useMessages(selectedConversation?.id || '');

    const {
        isRecording,
        startRecording,
        stopRecording
    } = useAudioRecorder();

    useEffect(() => {
        fetchConversations();
    }, []);

    useEffect(() => {
        if (selectedConversation) {
            fetchMessages(selectedConversation.phone);
        }
    }, [selectedConversation]);

    return (
        <div className="flex h-screen">
            {/* Sidebar */}
            <div className="w-96 bg-white border-r flex flex-col">
                <QueueTabs
                    activeQueue={activeQueue}
                    onQueueChange={setActiveQueue}
                    counts={{/* ... */}}
                />
                <ConversationList
                    conversations={conversations}
                    selectedId={selectedConversation?.id}
                    onSelect={setSelectedConversation}
                    onAssume={handleAssume}
                />
            </div>

            {/* Main Chat */}
            {selectedConversation ? (
                <div className="flex-1 flex flex-col">
                    <ConversationHeader conversation={selectedConversation} />
                    <MessageArea messages={messages} />
                    <MessageInput
                        onSend={(text) => sendMessage(text, selectedConversation.phone)}
                        onStartRecording={startRecording}
                    />
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    <p>Selecione uma conversa</p>
                </div>
            )}
        </div>
    );
};

export default ConversationsNew;
```

---

## 🎯 **RESULTADO FINAL:**

### **Antes:**
- ❌ 1898 linhas em 1 arquivo
- ❌ Difícil de manter
- ❌ Difícil de testar

### **Depois:**
- ✅ ~300 linhas na página principal
- ✅ 3 hooks (395 linhas)
- ✅ 5 componentes (~800 linhas)
- ✅ Total: ~1500 linhas (mais organizado!)

---

## ✅ **CHECKLIST:**

- [x] Criar hooks
- [x] Criar ConversationHeader
- [ ] Criar QueueTabs
- [ ] Criar ConversationList
- [ ] Criar MessageArea
- [ ] Criar MessageInput
- [ ] Refatorar ConversationsNew.tsx
- [ ] Testar tudo
- [ ] Remover código antigo

---

**Implemente os componentes acima e teste!** 🚀
