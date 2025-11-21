import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '../lib/utils'
import { WorkflowEditorBeta } from '../components/WorkflowEditorBeta'
import { BackendWorkflow, BackendNode } from '../utils/workflowUtils'

export const WorkflowsBeta: React.FC = () => {
    const navigate = useNavigate()
    const [workflow, setWorkflow] = useState<BackendWorkflow>({
        name: 'Workflow Beta',
        description: 'Editor Beta responsivo inspirado em n8n/Miro',
        nodes: [
            { id: 'start', type: 'START', content: { text: 'Bem-vindo' }, position: { x: 80, y: 60 }, connections: ['menu'] },
            { id: 'menu', type: 'MESSAGE', content: { text: '1 Valores | 2 Convênios | 3 Localização | 4 Agendar | 5 Humano' }, position: { x: 340, y: 60 }, connections: [{ targetId: 'select', port: 'main' }] },
            {
                id: 'select', type: 'CONDITION', content: { condition: '1|2|3|4|5' }, position: { x: 600, y: 60 }, connections: [
                    { targetId: 'list_procedures', port: '1' },
                    { targetId: 'list_insurances', port: '2' },
                    { targetId: 'location', port: '3' },
                    { targetId: 'collect', port: '4' },
                    { targetId: 'handoff', port: '5' }
                ]
            },
            { id: 'list_procedures', type: 'API_CALL', content: { endpoint: 'get_clinic_procedures', message: 'Buscando procedimentos...' }, position: { x: 860, y: 0 }, connections: [{ targetId: 'continue', port: 'main' }] },
            { id: 'list_insurances', type: 'API_CALL', content: { endpoint: 'get_clinic_insurances', message: 'Buscando convênios...' }, position: { x: 860, y: 120 }, connections: [{ targetId: 'continue', port: 'main' }] },
            { id: 'location', type: 'API_CALL', content: { endpoint: 'get_clinic_location', message: 'Buscando localização...' }, position: { x: 860, y: 240 }, connections: [{ targetId: 'continue', port: 'main' }] },
            {
                id: 'continue', type: 'CONDITION', content: { condition: 'continue|end' }, position: { x: 1120, y: 120 }, connections: [
                    { targetId: 'menu', port: 'continue' },
                    { targetId: 'end', port: 'end' }
                ]
            },
            { id: 'collect', type: 'COLLECT_INFO', content: { fields: ['name', 'cpf', 'birth_date', 'phone', 'email', 'address', 'insurance', 'insurance_number', 'preferences', 'procedure_type', 'preferred_date', 'preferred_shift'], message: 'Coletando informações...' }, position: { x: 860, y: 360 }, connections: [{ targetId: 'end', port: 'main' }] },
            { id: 'handoff', type: 'TRANSFER_HUMAN', content: { finalMessage: 'Transferindo para atendente' }, position: { x: 860, y: 480 }, connections: [{ targetId: 'end', port: 'main' }] },
            { id: 'end', type: 'END', content: { finalMessage: 'Obrigado!' }, position: { x: 1280, y: 360 }, connections: [] }
        ] as BackendNode[],
        isActive: false
    })

    const handleSave = async (wfData: BackendWorkflow) => {
        try {
            let newId = workflow.id || ''
            if (workflow.id) {
                await api.put(`/api/workflows/${workflow.id}`, {
                    name: wfData.name || workflow.name,
                    description: wfData.description || workflow.description,
                    type: 'SUPPORT',
                    config: { nodes: wfData.nodes, edges: (wfData.edges || []) },
                    isActive: wfData.isActive ?? false
                })
                newId = workflow.id as string
                toast.success('Workflow atualizado')
            } else {
                const resp = await api.post('/api/workflows', {
                    name: wfData.name || workflow.name,
                    description: wfData.description || workflow.description,
                    type: 'SUPPORT',
                    config: { nodes: wfData.nodes, edges: (wfData.edges || []) },
                    isActive: false
                })
                const created = resp.data
                setWorkflow(prev => ({ ...prev, id: created?.id }))
                newId = created?.id
                toast.success('Workflow criado')
            }

            // Set as default and delete others
            const list: { id: string; name: string }[] = await api.get('/api/workflows').then(r => (r.data?.workflows || []) as { id: string; name: string }[])
            if (newId) {
                await api.put('/api/workflows/default', { id: newId })
            }
            const deletables = list.filter(w => w.id !== newId)
            for (const w of deletables) {
                try {
                    await api.delete(`/api/workflows/${w.id}`)
                } catch {
                    // ignore
                }
            }
            toast.success(`Padrão atualizado e ${deletables.length} workflow(s) removido(s)`)
            navigate('/workflows-beta')
        } catch {
            toast.error('Falha ao salvar')
        }
    }

    return (
        <div className="flex-1 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
            <WorkflowEditorBeta
                workflow={workflow}
                onSave={handleSave}
                onCancel={() => { }}
            />
        </div>
    )
}
