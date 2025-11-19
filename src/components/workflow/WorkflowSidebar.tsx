import React from 'react'
import {
    Play, MessageSquare, AlertCircle, Settings, Bot, ClipboardList,
    Users, Clock, CheckCircle, Link2, Webhook as WebhookIcon, Grid3X3
} from 'lucide-react'
import { NodeType } from '../../utils/workflowUtils'

const palette: { type: NodeType; label: string; description: string; icon: any; color: string }[] = [
    { type: 'START', label: 'Início', description: 'Entrada do fluxo', icon: Play, color: 'bg-green-600' },
    { type: 'MESSAGE', label: 'Mensagem', description: 'Envio de texto', icon: MessageSquare, color: 'bg-blue-600' },
    { type: 'CONDITION', label: 'Condição', description: 'Ramificação', icon: AlertCircle, color: 'bg-yellow-600' },
    { type: 'GPT_RESPONSE', label: 'IA', description: 'Resposta por IA', icon: Bot, color: 'bg-indigo-600' },
    { type: 'API_CALL', label: 'API', description: 'Consulta interna', icon: Link2, color: 'bg-orange-600' },
    { type: 'DATA_COLLECTION', label: 'Coleta', description: 'Um campo', icon: ClipboardList, color: 'bg-teal-600' },
    { type: 'COLLECT_INFO', label: 'Coleta múltipla', description: 'Vários campos', icon: ClipboardList, color: 'bg-teal-700' },
    { type: 'TRANSFER_HUMAN', label: 'Humano', description: 'Transferência', icon: Users, color: 'bg-red-600' },
    { type: 'DELAY', label: 'Delay', description: 'Aguardar', icon: Clock, color: 'bg-gray-600' },
    { type: 'END', label: 'Fim', description: 'Encerrar', icon: CheckCircle, color: 'bg-green-700' },
    { type: 'WEBHOOK', label: 'Webhook', description: 'Chamar URL', icon: WebhookIcon, color: 'bg-pink-600' },
    { type: 'ACTION', label: 'Ação', description: 'Executar ação', icon: Settings, color: 'bg-purple-600' }
]

const WorkflowSidebar = () => {
    const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
        event.dataTransfer.setData('application/reactflow', nodeType)
        event.dataTransfer.effectAllowed = 'move'
    }

    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
            <div className="p-4 border-b border-gray-100">
                <div className="flex items-center space-x-2 text-gray-700 font-semibold">
                    <Grid3X3 className="w-5 h-5" />
                    <span>Blocos</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {palette.map((item) => (
                    <div
                        key={item.type}
                        className="flex items-center p-3 bg-white border border-gray-200 rounded-lg cursor-grab hover:border-blue-400 hover:shadow-sm transition-all group"
                        onDragStart={(event) => onDragStart(event, item.type)}
                        draggable
                    >
                        <div className={`w-8 h-8 ${item.color} rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform`}>
                            <item.icon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-800">{item.label}</div>
                            <div className="text-xs text-gray-500">{item.description}</div>
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    )
}

export default WorkflowSidebar
