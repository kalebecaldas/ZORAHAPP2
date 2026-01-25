import { Navigate } from 'react-router-dom'

/**
 * Configuração da IA: abas Custos & Economia e Regras & Templates foram removidas
 * (fluxo agora via n8n). Webhooks foram movidos para Configurações.
 * Redireciona para Configurações para manter links antigos funcionando.
 */
export default function AIConfigPage() {
  return <Navigate to="/settings" replace />
}
