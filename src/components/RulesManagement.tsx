import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { api } from '../lib/utils'
import { 
    Settings, 
    Package, 
    Building2, 
    FileText, 
    Save, 
    Eye, 
    Loader2,
    AlertCircle,
    CheckCircle2
} from 'lucide-react'

interface ProcedureRule {
    id: string
    procedureCode: string
    procedureName?: string
    procedureDescription?: string
    requiresEvaluation: boolean
    evaluationPrice: number | null
    evaluationInPackage: boolean
    evaluationIncludesFirstSession: boolean
    minimumPackageSessions: number | null
    highlightPackages: boolean
    showEvaluationFirst: boolean
    customMessage: string | null
    specialConditions: any
    isActive: boolean
}

interface InsuranceRule {
    id: string
    insuranceCode: string
    insuranceName?: string
    insuranceDisplayName?: string
    insuranceDiscount?: boolean
    insuranceIsParticular?: boolean
    showCoveredProcedures: boolean
    mentionOtherBenefits: boolean
    customGreeting: string | null
    hideValues: boolean
    canShowDiscount: boolean
    specialProcedures: any
    isActive: boolean
}

interface ResponseTemplate {
    id: string
    intent: string
    context: string | null
    targetType: string | null
    targetId: string | null
    template: string
    conditions: any
    priority: number
    rules: any
    isActive: boolean
    description: string | null
}

export default function RulesManagement() {
    const [activeTab, setActiveTab] = useState<'procedures' | 'insurances' | 'templates'>('procedures')
    const [loading, setLoading] = useState(false)
    
    // Estados para cada tipo de regra
    const [procedureRules, setProcedureRules] = useState<ProcedureRule[]>([])
    const [insuranceRules, setInsuranceRules] = useState<InsuranceRule[]>([])
    const [templates, setTemplates] = useState<ResponseTemplate[]>([])
    
    // Estados para edição
    const [editingProcedure, setEditingProcedure] = useState<ProcedureRule | null>(null)
    const [editingInsurance, setEditingInsurance] = useState<InsuranceRule | null>(null)
    const [editingTemplate, setEditingTemplate] = useState<ResponseTemplate | null>(null)
    
    // Preview
    const [preview, setPreview] = useState<string | null>(null)
    const [loadingPreview, setLoadingPreview] = useState(false)

    useEffect(() => {
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/66ca0116-31ec-44b0-a99a-003bb5ba1c50',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RulesManagement.tsx:useEffect',message:'useEffect triggered',data:{activeTab},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        loadData()
    }, [activeTab])

    const loadData = async () => {
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/66ca0116-31ec-44b0-a99a-003bb5ba1c50',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RulesManagement.tsx:loadData',message:'loadData called',data:{activeTab,loading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        setLoading(true)
        try {
            if (activeTab === 'procedures') {
                // #region agent log
                fetch('http://127.0.0.1:7246/ingest/66ca0116-31ec-44b0-a99a-003bb5ba1c50',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RulesManagement.tsx:loadData',message:'Before API call procedures',data:{activeTab},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                const response = await api.get('/api/rules/procedures')
                // #region agent log
                fetch('http://127.0.0.1:7246/ingest/66ca0116-31ec-44b0-a99a-003bb5ba1c50',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RulesManagement.tsx:loadData',message:'After API call procedures',data:{status:response.status,dataLength:response.data?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                setProcedureRules(response.data)
            } else if (activeTab === 'insurances') {
                // #region agent log
                fetch('http://127.0.0.1:7246/ingest/66ca0116-31ec-44b0-a99a-003bb5ba1c50',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RulesManagement.tsx:loadData',message:'Before API call insurances',data:{activeTab},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                const response = await api.get('/api/rules/insurances')
                // #region agent log
                fetch('http://127.0.0.1:7246/ingest/66ca0116-31ec-44b0-a99a-003bb5ba1c50',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RulesManagement.tsx:loadData',message:'After API call insurances',data:{status:response.status,dataLength:response.data?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                setInsuranceRules(response.data)
            } else {
                // #region agent log
                fetch('http://127.0.0.1:7246/ingest/66ca0116-31ec-44b0-a99a-003bb5ba1c50',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RulesManagement.tsx:loadData',message:'Before API call templates',data:{activeTab},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                const response = await api.get('/api/rules/templates')
                // #region agent log
                fetch('http://127.0.0.1:7246/ingest/66ca0116-31ec-44b0-a99a-003bb5ba1c50',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RulesManagement.tsx:loadData',message:'After API call templates',data:{status:response.status,dataLength:response.data?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                setTemplates(response.data)
            }
        } catch (error: any) {
            // #region agent log
            fetch('http://127.0.0.1:7246/ingest/66ca0116-31ec-44b0-a99a-003bb5ba1c50',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RulesManagement.tsx:loadData',message:'API call error',data:{activeTab,errorStatus:error?.response?.status,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            console.error('Erro ao carregar dados:', error)
            toast.error('Erro ao carregar dados')
        } finally {
            setLoading(false)
        }
    }

    const saveProcedureRule = async (rule: ProcedureRule) => {
        try {
            await api.put(`/api/rules/procedures/${rule.procedureCode}`, {
                requiresEvaluation: rule.requiresEvaluation,
                evaluationPrice: rule.evaluationPrice,
                evaluationIncludesFirstSession: rule.evaluationIncludesFirstSession,
                evaluationInPackage: rule.evaluationInPackage,
                minimumPackageSessions: rule.minimumPackageSessions,
                highlightPackages: rule.highlightPackages,
                showEvaluationFirst: rule.showEvaluationFirst,
                customMessage: rule.customMessage,
                specialConditions: rule.specialConditions,
                isActive: rule.isActive
            })
            toast.success('Regra atualizada com sucesso!')
            setEditingProcedure(null)
            loadData()
        } catch (error) {
            console.error('Erro ao salvar regra:', error)
            toast.error('Erro ao salvar regra')
        }
    }

    const saveInsuranceRule = async (rule: InsuranceRule) => {
        try {
            await api.put(`/api/rules/insurances/${rule.insuranceCode}`, {
                showCoveredProcedures: rule.showCoveredProcedures,
                mentionOtherBenefits: rule.mentionOtherBenefits,
                customGreeting: rule.customGreeting,
                hideValues: rule.hideValues,
                canShowDiscount: rule.canShowDiscount,
                specialProcedures: rule.specialProcedures,
                isActive: rule.isActive
            })
            toast.success('Regra atualizada com sucesso!')
            setEditingInsurance(null)
            loadData()
        } catch (error) {
            console.error('Erro ao salvar regra:', error)
            toast.error('Erro ao salvar regra')
        }
    }

    const saveTemplate = async (template: ResponseTemplate) => {
        try {
            if (template.id.startsWith('new-')) {
                // Criar novo template
                await api.post('/api/rules/templates', template)
                toast.success('Template criado com sucesso!')
            } else {
                // Atualizar template existente
                await api.put(`/api/rules/templates/${template.id}`, template)
                toast.success('Template atualizado com sucesso!')
            }
            setEditingTemplate(null)
            loadData()
        } catch (error) {
            console.error('Erro ao salvar template:', error)
            toast.error('Erro ao salvar template')
        }
    }

    const deleteTemplate = async (id: string) => {
        if (!confirm('Deseja realmente deletar este template?')) return
        
        try {
            await api.delete(`/api/rules/templates/${id}`)
            toast.success('Template deletado com sucesso!')
            loadData()
        } catch (error) {
            console.error('Erro ao deletar template:', error)
            toast.error('Erro ao deletar template')
        }
    }

    const generatePreview = async (type: 'procedure' | 'insurance', data: any) => {
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/66ca0116-31ec-44b0-a99a-003bb5ba1c50',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RulesManagement.tsx:generatePreview',message:'generatePreview called',data:{type,loadingPreview},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        setLoadingPreview(true)
        try {
            if (type === 'procedure') {
                // #region agent log
                fetch('http://127.0.0.1:7246/ingest/66ca0116-31ec-44b0-a99a-003bb5ba1c50',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RulesManagement.tsx:generatePreview',message:'Before preview procedure API call',data:{type,procedureCode:data.procedureCode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
                // #endregion
                const response = await api.post('/api/rules/preview/procedure', {
                    procedureCode: data.procedureCode,
                    procedureData: {
                        name: data.procedureName || 'Procedimento',
                        price: 180,
                        packages: [{
                            name: 'Pacote 10 sessões',
                            price: 1600,
                            sessions: 10,
                            description: 'Economia de R$ 400'
                        }]
                    }
                })
                // #region agent log
                fetch('http://127.0.0.1:7246/ingest/66ca0116-31ec-44b0-a99a-003bb5ba1c50',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RulesManagement.tsx:generatePreview',message:'After preview procedure API call',data:{status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
                // #endregion
                setPreview(response.data.formattedInfo)
            } else {
                // #region agent log
                fetch('http://127.0.0.1:7246/ingest/66ca0116-31ec-44b0-a99a-003bb5ba1c50',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RulesManagement.tsx:generatePreview',message:'Before preview insurance API call',data:{type,insuranceCode:data.insuranceCode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
                // #endregion
                const response = await api.post('/api/rules/preview/insurance', {
                    insuranceCode: data.insuranceCode,
                    insuranceName: data.insuranceDisplayName || data.insuranceName || 'Convênio'
                })
                // #region agent log
                fetch('http://127.0.0.1:7246/ingest/66ca0116-31ec-44b0-a99a-003bb5ba1c50',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RulesManagement.tsx:generatePreview',message:'After preview insurance API call',data:{status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
                // #endregion
                setPreview(`${response.data.greeting}\n\nMostrar valores: ${response.data.shouldShowValues ? 'Sim' : 'Não'}\nPode mostrar desconto: ${response.data.canShowDiscount ? 'Sim' : 'Não'}`)
            }
        } catch (error: any) {
            // #region agent log
            fetch('http://127.0.0.1:7246/ingest/66ca0116-31ec-44b0-a99a-003bb5ba1c50',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RulesManagement.tsx:generatePreview',message:'Preview API call error',data:{type,errorStatus:error?.response?.status,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            console.error('Erro ao gerar preview:', error)
            toast.error('Erro ao gerar preview')
        } finally {
            setLoadingPreview(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Settings className="w-6 h-6 text-blue-500" />
                    Regras & Templates do Bot
                </h2>
                <p className="text-gray-600 mt-1">
                    Configure como o bot responde para cada procedimento, convênio e situação
                </p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex -mb-px space-x-8">
                    <button
                        onClick={() => setActiveTab('procedures')}
                        className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                            activeTab === 'procedures'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <Package className="w-4 h-4" />
                        Regras de Procedimentos
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                            {procedureRules.length}
                        </span>
                    </button>
                    
                    <button
                        onClick={() => setActiveTab('insurances')}
                        className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                            activeTab === 'insurances'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <Building2 className="w-4 h-4" />
                        Regras de Convênios
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                            {insuranceRules.length}
                        </span>
                    </button>
                    
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                            activeTab === 'templates'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <FileText className="w-4 h-4" />
                        Templates de Resposta
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                            {templates.length}
                        </span>
                    </button>
                </nav>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : (
                <>
                    {activeTab === 'procedures' && (
                        <ProceduresTab 
                            rules={procedureRules}
                            editing={editingProcedure}
                            onEdit={setEditingProcedure}
                            onSave={saveProcedureRule}
                            onPreview={(rule) => generatePreview('procedure', rule)}
                            preview={preview}
                            loadingPreview={loadingPreview}
                        />
                    )}
                    
                    {activeTab === 'insurances' && (
                        <InsurancesTab 
                            rules={insuranceRules}
                            editing={editingInsurance}
                            onEdit={setEditingInsurance}
                            onSave={saveInsuranceRule}
                            onPreview={(rule) => generatePreview('insurance', rule)}
                            preview={preview}
                            loadingPreview={loadingPreview}
                        />
                    )}
                    
                    {activeTab === 'templates' && (
                        <TemplatesTab 
                            templates={templates}
                            editing={editingTemplate}
                            onEdit={setEditingTemplate}
                            onSave={saveTemplate}
                            onDelete={deleteTemplate}
                        />
                    )}
                </>
            )}
        </div>
    )
}

// Componente da aba de Procedimentos
interface ProceduresTabProps {
    rules: ProcedureRule[]
    editing: ProcedureRule | null
    onEdit: (rule: ProcedureRule | null) => void
    onSave: (rule: ProcedureRule) => void
    onPreview: (rule: ProcedureRule) => void
    preview: string | null
    loadingPreview: boolean
}

function ProceduresTab({ rules, editing, onEdit, onSave, onPreview, preview, loadingPreview }: ProceduresTabProps) {
    if (editing) {
        return (
            <ProcedureEditor 
                rule={editing}
                onSave={onSave}
                onCancel={() => onEdit(null)}
                onPreview={onPreview}
                preview={preview}
                loadingPreview={loadingPreview}
            />
        )
    }

    return (
        <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                        <h3 className="font-medium text-blue-900">Sobre as Regras de Procedimentos</h3>
                        <p className="text-sm text-blue-700 mt-1">
                            Configure como cada procedimento será apresentado ao paciente: se requer avaliação, 
                            preços, mensagens customizadas e como os pacotes serão destacados.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-4">
                {rules.map(rule => (
                    <div
                        key={rule.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {rule.procedureName || rule.procedureCode}
                                    </h3>
                                    {rule.isActive ? (
                                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Ativa
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                            Inativa
                                        </span>
                                    )}
                                </div>
                                
                                <div className="mt-2 space-y-1 text-sm text-gray-600">
                                    {rule.requiresEvaluation && (
                                        <p>• Requer avaliação: R$ {rule.evaluationPrice}</p>
                                    )}
                                    {rule.customMessage && (
                                        <p className="italic">"{rule.customMessage}"</p>
                                    )}
                                </div>
                            </div>
                            
                            <button
                                onClick={() => onEdit(rule)}
                                className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                Editar
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// Editor de Procedimento
interface ProcedureEditorProps {
    rule: ProcedureRule
    onSave: (rule: ProcedureRule) => void
    onCancel: () => void
    onPreview: (rule: ProcedureRule) => void
    preview: string | null
    loadingPreview: boolean
}

function ProcedureEditor({ rule, onSave, onCancel, onPreview, preview, loadingPreview }: ProcedureEditorProps) {
    const [editedRule, setEditedRule] = useState(rule)

    return (
        <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                    Editando: {rule.procedureName || rule.procedureCode}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Coluna Esquerda */}
                    <div className="space-y-4">
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                <input
                                    type="checkbox"
                                    checked={editedRule.requiresEvaluation}
                                    onChange={(e) => setEditedRule({...editedRule, requiresEvaluation: e.target.checked})}
                                    className="rounded border-gray-300"
                                />
                                Requer Avaliação
                            </label>
                        </div>

                        {editedRule.requiresEvaluation && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Preço da Avaliação (R$)
                                    </label>
                                    <input
                                        type="number"
                                        value={editedRule.evaluationPrice || ''}
                                        onChange={(e) => setEditedRule({...editedRule, evaluationPrice: parseFloat(e.target.value)})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={editedRule.evaluationIncludesFirstSession}
                                            onChange={(e) => setEditedRule({...editedRule, evaluationIncludesFirstSession: e.target.checked})}
                                            className="rounded border-gray-300"
                                        />
                                        Avaliação já inclui a primeira sessão
                                    </label>
                                    <p className="text-xs text-gray-500 mt-1 ml-6">
                                        Se marcado, o paciente paga apenas a avaliação (não precisa pagar avaliação + sessão)
                                    </p>
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={editedRule.evaluationInPackage}
                                            onChange={(e) => setEditedRule({...editedRule, evaluationInPackage: e.target.checked})}
                                            className="rounded border-gray-300"
                                        />
                                        Avaliação incluída em pacotes
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Mínimo de sessões para incluir avaliação
                                    </label>
                                    <input
                                        type="number"
                                        value={editedRule.minimumPackageSessions || ''}
                                        onChange={(e) => setEditedRule({...editedRule, minimumPackageSessions: parseInt(e.target.value)})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                            </>
                        )}

                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={editedRule.highlightPackages}
                                    onChange={(e) => setEditedRule({...editedRule, highlightPackages: e.target.checked})}
                                    className="rounded border-gray-300"
                                />
                                Destacar pacotes
                            </label>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={editedRule.isActive}
                                    onChange={(e) => setEditedRule({...editedRule, isActive: e.target.checked})}
                                    className="rounded border-gray-300"
                                />
                                Regra ativa
                            </label>
                        </div>
                    </div>

                    {/* Coluna Direita */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Mensagem Customizada
                            </label>
                            <textarea
                                value={editedRule.customMessage || ''}
                                onChange={(e) => setEditedRule({...editedRule, customMessage: e.target.value})}
                                placeholder="Ex: A acupuntura é excelente para várias condições."
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                                <Eye className="w-4 h-4" />
                                Preview
                            </h4>
                            
                            <button
                                onClick={() => onPreview(editedRule)}
                                disabled={loadingPreview}
                                className="w-full mb-3 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loadingPreview ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Gerando...
                                    </>
                                ) : (
                                    <>
                                        <Eye className="w-4 h-4" />
                                        Gerar Preview
                                    </>
                                )}
                            </button>

                            {preview && (
                                <div className="bg-white border border-gray-200 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap">
                                    {preview}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Botões de ação */}
                <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onSave(editedRule)}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Salvar Regra
                    </button>
                </div>
            </div>
        </div>
    )
}

// Componentes para Insurances e Templates
interface InsurancesTabProps {
    rules: InsuranceRule[]
    editing: InsuranceRule | null
    onEdit: (rule: InsuranceRule | null) => void
    onSave: (rule: InsuranceRule) => void
    onPreview: (rule: InsuranceRule) => void
    preview: string | null
    loadingPreview: boolean
}

function InsurancesTab({ rules, editing, onEdit, onSave, onPreview, preview, loadingPreview }: InsurancesTabProps) {
    if (editing) {
        return (
            <InsuranceEditor 
                rule={editing}
                onSave={onSave}
                onCancel={() => onEdit(null)}
                onPreview={onPreview}
                preview={preview}
                loadingPreview={loadingPreview}
            />
        )
    }

    return (
        <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                        <h3 className="font-medium text-blue-900">Sobre as Regras de Convênios</h3>
                        <p className="text-sm text-blue-700 mt-1">
                            Configure como o bot se comporta com cada convênio: saudações customizadas, 
                            se deve mostrar valores, procedimentos cobertos, etc.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-4">
                {rules.map(rule => (
                    <div
                        key={rule.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {rule.insuranceDisplayName || rule.insuranceName || rule.insuranceCode}
                                    </h3>
                                    {rule.isActive ? (
                                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Ativa
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                            Inativa
                                        </span>
                                    )}
                                    {rule.insuranceIsParticular && (
                                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                                            Particular
                                        </span>
                                    )}
                                    {rule.insuranceDiscount && (
                                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                                            Desconto
                                        </span>
                                    )}
                                </div>
                                
                                <div className="mt-2 space-y-1 text-sm text-gray-600">
                                    {rule.customGreeting && (
                                        <p className="italic">"{rule.customGreeting}"</p>
                                    )}
                                    <p>• Mostrar valores: {rule.hideValues ? 'Não' : 'Sim'}</p>
                                </div>
                            </div>
                            
                            <button
                                onClick={() => onEdit(rule)}
                                className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                Editar
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// Editor de Convênio
interface InsuranceEditorProps {
    rule: InsuranceRule
    onSave: (rule: InsuranceRule) => void
    onCancel: () => void
    onPreview: (rule: InsuranceRule) => void
    preview: string | null
    loadingPreview: boolean
}

function InsuranceEditor({ rule, onSave, onCancel, onPreview, preview, loadingPreview }: InsuranceEditorProps) {
    const [editedRule, setEditedRule] = useState(rule)

    return (
        <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                    Editando: {rule.insuranceDisplayName || rule.insuranceName || rule.insuranceCode}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Coluna Esquerda */}
                    <div className="space-y-4">
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={editedRule.showCoveredProcedures}
                                    onChange={(e) => setEditedRule({...editedRule, showCoveredProcedures: e.target.checked})}
                                    className="rounded border-gray-300"
                                />
                                Mostrar procedimentos cobertos
                            </label>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={editedRule.mentionOtherBenefits}
                                    onChange={(e) => setEditedRule({...editedRule, mentionOtherBenefits: e.target.checked})}
                                    className="rounded border-gray-300"
                                />
                                Mencionar outros benefícios
                            </label>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={editedRule.hideValues}
                                    onChange={(e) => setEditedRule({...editedRule, hideValues: e.target.checked})}
                                    className="rounded border-gray-300"
                                />
                                Esconder valores
                            </label>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={editedRule.canShowDiscount}
                                    onChange={(e) => setEditedRule({...editedRule, canShowDiscount: e.target.checked})}
                                    className="rounded border-gray-300"
                                />
                                Pode mostrar desconto
                            </label>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={editedRule.isActive}
                                    onChange={(e) => setEditedRule({...editedRule, isActive: e.target.checked})}
                                    className="rounded border-gray-300"
                                />
                                Regra ativa
                            </label>
                        </div>
                    </div>

                    {/* Coluna Direita */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Saudação Customizada
                            </label>
                            <textarea
                                value={editedRule.customGreeting || ''}
                                onChange={(e) => setEditedRule({...editedRule, customGreeting: e.target.value})}
                                placeholder="Ex: Perfeito! Trabalhamos com {convenio}."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Use {'{convenio}'} para inserir o nome do convênio dinamicamente
                            </p>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                                <Eye className="w-4 h-4" />
                                Preview
                            </h4>
                            
                            <button
                                onClick={() => onPreview(editedRule)}
                                disabled={loadingPreview}
                                className="w-full mb-3 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loadingPreview ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Gerando...
                                    </>
                                ) : (
                                    <>
                                        <Eye className="w-4 h-4" />
                                        Gerar Preview
                                    </>
                                )}
                            </button>

                            {preview && (
                                <div className="bg-white border border-gray-200 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap">
                                    {preview}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Botões de ação */}
                <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onSave(editedRule)}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Salvar Regra
                    </button>
                </div>
            </div>
        </div>
    )
}

// Tab de Templates
interface TemplatesTabProps {
    templates: ResponseTemplate[]
    editing: ResponseTemplate | null
    onEdit: (template: ResponseTemplate | null) => void
    onSave: (template: ResponseTemplate) => void
    onDelete: (id: string) => void
}

function TemplatesTab({ templates, editing, onEdit, onSave, onDelete }: TemplatesTabProps) {
    if (editing) {
        return (
            <TemplateEditor 
                template={editing}
                onSave={onSave}
                onCancel={() => onEdit(null)}
            />
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex-1">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                            <h3 className="font-medium text-blue-900">Sobre os Templates</h3>
                            <p className="text-sm text-blue-700 mt-1">
                                Templates definem como o bot responde para cada intenção. Use variáveis como {'{nome}'}, 
                                condicionais {'{if}'} e loops {'{foreach}'} para respostas dinâmicas.
                            </p>
                        </div>
                    </div>
                </div>
                
                <button
                    onClick={() => onEdit({
                        id: `new-${Date.now()}`,
                        intent: '',
                        context: 'geral',
                        targetType: 'general',
                        targetId: null,
                        template: '',
                        conditions: null,
                        priority: 5,
                        rules: null,
                        isActive: true,
                        description: ''
                    })}
                    className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                    + Novo Template
                </button>
            </div>

            <div className="grid gap-4">
                {templates.map(template => (
                    <div
                        key={template.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {template.intent}
                                    </h3>
                                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                        {template.context || 'geral'}
                                    </span>
                                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                        Prioridade: {template.priority}
                                    </span>
                                    {template.isActive ? (
                                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Ativo
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                            Inativo
                                        </span>
                                    )}
                                </div>
                                
                                <div className="mt-2 space-y-1 text-sm text-gray-600">
                                    {template.description && (
                                        <p>{template.description}</p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-2 line-clamp-2 font-mono bg-gray-50 p-2 rounded">
                                        {template.template}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onEdit(template)}
                                    className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => onDelete(template.id)}
                                    className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    Deletar
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// Editor de Template
interface TemplateEditorProps {
    template: ResponseTemplate
    onSave: (template: ResponseTemplate) => void
    onCancel: () => void
}

function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
    const [editedTemplate, setEditedTemplate] = useState(template)

    return (
        <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                    {template.id.startsWith('new-') ? 'Novo Template' : `Editando: ${template.intent}`}
                </h3>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Intenção *
                            </label>
                            <input
                                type="text"
                                value={editedTemplate.intent}
                                onChange={(e) => setEditedTemplate({...editedTemplate, intent: e.target.value.toUpperCase()})}
                                placeholder="Ex: INFORMACAO, AGENDAR, VALOR_PARTICULAR"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Contexto
                            </label>
                            <select
                                value={editedTemplate.context || 'geral'}
                                onChange={(e) => setEditedTemplate({...editedTemplate, context: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            >
                                <option value="geral">Geral</option>
                                <option value="procedimento">Procedimento</option>
                                <option value="convenio">Convênio</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tipo de Alvo
                            </label>
                            <select
                                value={editedTemplate.targetType || 'general'}
                                onChange={(e) => setEditedTemplate({...editedTemplate, targetType: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            >
                                <option value="general">Geral</option>
                                <option value="procedure">Procedimento</option>
                                <option value="insurance">Convênio</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Prioridade
                            </label>
                            <input
                                type="number"
                                value={editedTemplate.priority}
                                onChange={(e) => setEditedTemplate({...editedTemplate, priority: parseInt(e.target.value)})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Descrição
                        </label>
                        <input
                            type="text"
                            value={editedTemplate.description || ''}
                            onChange={(e) => setEditedTemplate({...editedTemplate, description: e.target.value})}
                            placeholder="Breve descrição do que este template faz"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Template * <span className="text-xs text-gray-500">(Suporta variáveis, condicionais e loops)</span>
                        </label>
                        <textarea
                            value={editedTemplate.template}
                            onChange={(e) => setEditedTemplate({...editedTemplate, template: e.target.value})}
                            placeholder="Ex: Olá {nome}! Para {procedimento}, temos ótimas opções..."
                            rows={8}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                        />
                        <div className="mt-2 text-xs text-gray-500 space-y-1">
                            <p>• Variáveis: {'{nome}'}, {'{procedimento}'}, {'{preco}'}</p>
                            <p>• Condicionais: {'{if hasPackages}'}...{'{endif}'}</p>
                            <p>• Loops: {'{foreach packages}'}...{'{endforeach}'}</p>
                        </div>
                    </div>

                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <input
                                type="checkbox"
                                checked={editedTemplate.isActive}
                                onChange={(e) => setEditedTemplate({...editedTemplate, isActive: e.target.checked})}
                                className="rounded border-gray-300"
                            />
                            Template ativo
                        </label>
                    </div>
                </div>

                {/* Botões de ação */}
                <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onSave(editedTemplate)}
                        disabled={!editedTemplate.intent || !editedTemplate.template}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-4 h-4" />
                        Salvar Template
                    </button>
                </div>
            </div>
        </div>
    )
}
