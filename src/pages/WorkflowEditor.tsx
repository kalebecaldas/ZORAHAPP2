import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '../lib/utils'
import { WorkflowEditorBeta } from '../components/WorkflowEditorBeta'
import { BackendWorkflow, BackendNode, ensureRequiredEdges } from '../utils/workflowUtils'

export const WorkflowEditor: React.FC = () => {
    const navigate = useNavigate()
    const { id } = useParams<{ id: string }>()
    const [workflow, setWorkflow] = useState<BackendWorkflow>({
        name: 'Novo Workflow',
        description: 'Editor de workflow dinâmico',
        nodes: [],
        isActive: false
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id && id !== 'new') {
            loadWorkflow(id)
        } else {
            // Create new workflow with default structure
            setWorkflow({
                name: 'Novo Workflow',
                description: 'Descreva seu workflow aqui',
                nodes: [
                    { 
                        id: 'start', 
                        type: 'START', 
                        content: { text: 'Bem-vindo!' }, 
                        position: { x: 100, y: 100 }, 
                        connections: [] 
                    }
                ] as BackendNode[],
                isActive: false
            })
            setLoading(false)
        }
    }, [id])

    const loadWorkflow = async (workflowId: string) => {
        try {
            setLoading(true)
            const response = await api.get(`/api/workflows/${workflowId}`)
            const loadedWorkflow = response.data
            
            if (!loadedWorkflow) {
                toast.error('Workflow não encontrado')
                navigate('/workflows')
                return
            }

            const config = typeof loadedWorkflow.config === 'string' 
                ? JSON.parse(loadedWorkflow.config) 
                : loadedWorkflow.config || {}
            
            // Convert backend format to editor format
            const nodes = (config.nodes || []).map((n: any) => ({
                id: n.id,
                type: n.type,
                content: n.data || n.content || {},
                position: n.position || { x: 0, y: 0 },
                connections: []
            }))
            
            // Convert edges from backend format to editor format
            const backendEdges = config.edges || []
            const convertedEdges = backendEdges.map((e: any) => ({
                id: e.id || `${e.source}_${e.target}`,
                source: e.source,
                target: e.target,
                data: {
                    port: e.data?.port || e.port || 'main',
                    condition: e.data?.condition || e.condition
                },
                type: e.type || 'smoothstep',
                animated: e.animated || false
            }))
            
            setWorkflow({
                id: loadedWorkflow.id,
                name: loadedWorkflow.name,
                description: loadedWorkflow.description || '',
                nodes: nodes as BackendNode[],
                edges: convertedEdges,
                isActive: loadedWorkflow.isActive
            })
        } catch (error) {
            console.error('Error loading workflow:', error)
            toast.error('Erro ao carregar workflow')
            navigate('/workflows')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (wfData: BackendWorkflow) => {
        try {
            wfData = ensureRequiredEdges(wfData)
            if (workflow.id && id !== 'new') {
                // Update existing workflow
                await api.put(`/api/workflows/${workflow.id}`, {
                    name: wfData.name || workflow.name,
                    description: wfData.description || workflow.description,
                    type: 'SUPPORT',
                    config: { nodes: wfData.nodes, edges: (wfData.edges || []) },
                    isActive: wfData.isActive ?? workflow.isActive
                })
                toast.success('Workflow atualizado com sucesso!')
            } else {
                // Create new workflow
                const response = await api.post('/api/workflows', {
                    name: wfData.name || workflow.name,
                    description: wfData.description || workflow.description,
                    type: 'SUPPORT',
                    config: { nodes: wfData.nodes, edges: (wfData.edges || []) },
                    isActive: false
                })
                const created = response.data
                toast.success('Workflow criado com sucesso!')
                // Redirect to edit the newly created workflow
                navigate(`/workflows/editor/${created.id}`, { replace: true })
                return
            }
            
            // Navigate back to workflows list
            navigate('/workflows')
        } catch (error) {
            console.error('Error saving workflow:', error)
            toast.error('Erro ao salvar workflow')
        }
    }

    const handleCancel = () => {
        navigate('/workflows')
    }

    if (loading) {
        return (
            <div className="flex-1 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600">Carregando workflow...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
            <WorkflowEditorBeta
                workflow={workflow}
                onSave={handleSave}
                onCancel={handleCancel}
            />
        </div>
    )
}

