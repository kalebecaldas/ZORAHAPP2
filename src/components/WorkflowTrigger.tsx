import React, { useState } from 'react'
import { Play, Settings, Workflow } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../lib/utils'

interface WorkflowTriggerProps {
  conversationId: string
  phone: string
  patientInfo?: {
    name: string
    phone: string
    isNewPatient?: boolean
  }
  onComplete?: () => void
  onCancel?: () => void
  className?: string
}

export const WorkflowTrigger: React.FC<WorkflowTriggerProps> = ({ 
  conversationId, 
  phone, 
  patientInfo,
  onComplete,
  onCancel,
  className = '' 
}) => {
  const [isLoading, setIsLoading] = useState(false)

  const handleTriggerWorkflow = async () => {
    setIsLoading(true)
    try {
      const response = await api.post('/api/workflows/trigger', {
        conversationId,
        phone,
        patientInfo,
        triggerType: 'MANUAL'
      })
      
      if (response.data.success) {
        toast.success('Workflow iniciado com sucesso!')
        onComplete?.()
      } else {
        toast.error('Erro ao iniciar workflow')
      }
    } catch (error) {
      console.error('Error triggering workflow:', error)
      toast.error('Erro ao iniciar workflow')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleTriggerWorkflow}
      disabled={isLoading}
      className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
        isLoading 
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
      } ${className}`}
    >
      {isLoading ? (
        <Settings className="h-4 w-4 animate-spin mr-1" />
      ) : (
        <Play className="h-4 w-4 mr-1" />
      )}
      Iniciar Workflow
    </button>
  )
}