import { WorkflowNode, WorkflowExecutionContext, ConnectionMap, NodeExecutionResult } from '../core/types';
import { 
  getProcedureInfoForGPT, 
  getInsuranceInfoForGPT, 
  getLocationInfoForGPT,
  formatClinicDataForGPT 
} from '../utils/clinicDataFormatter';

/**
 * Executes an API_CALL node
 * API_CALL nodes fetch data from APIs and format responses
 */
export async function executeApiCallNode(
  node: WorkflowNode,
  context: WorkflowExecutionContext,
  connections: ConnectionMap
): Promise<NodeExecutionResult> {
  const endpoint = node.content.endpoint || '';
  const message = node.content.message || '';
  
  console.log(`🔧 API_CALL node ${node.id} - Calling endpoint: "${endpoint}"`);
  
  let response = '';
  let nextNodeId: string | undefined;
  
  try {
    switch (endpoint) {
      case 'get_clinic_procedures':
        response = await getClinicProcedures(context);
        break;
      
      case 'get_clinic_insurances':
        response = await getClinicInsurances(context);
        break;
      
      case 'get_clinic_location':
        response = await getClinicLocation(context);
        break;
      
      default:
        console.log(`🔧 API_CALL - Unknown endpoint: "${endpoint}"`);
        response = message || 'Informação disponível em breve.';
    }
    
    // Get next node
    const nodeConnections = connections.get(node.id) || [];
    nextNodeId = nodeConnections[0]?.targetId;
    
    console.log(`🔧 API_CALL - Response generated, next node: ${nextNodeId}`);
    
  } catch (error: any) {
    console.error(`🔧 API_CALL node ${node.id} - Error:`, error);
    response = 'Desculpe, não consegui obter essa informação no momento.';
  }
  
  return {
    nextNodeId,
    response,
    shouldStop: true, // Stop after API call to show result
    shouldSaveNextNode: true // Save next node for continuation
  };
}

/**
 * Gets clinic procedures with prices
 */
async function getClinicProcedures(context: WorkflowExecutionContext): Promise<string> {
  try {
    // ALWAYS use clinicData.ts as PRIMARY and ONLY source
    let clinicCode = context.userData.selectedClinic || context.userData.clinicCode || 'vieiralves';
    
    // Normalize clinic code
    if (clinicCode === 'vieiralves' || clinicCode === 'vieira-alves') {
      clinicCode = 'vieiralves';
    } else if (clinicCode === 'sao-jose' || clinicCode === 'são josé' || clinicCode === 'sao_jose') {
      clinicCode = 'sao_jose';
    }
    
    console.log(`🔧 getClinicProcedures - Using clinicData.ts (PRIMARY SOURCE) - Clinic code: ${clinicCode}`);
    
    // ALWAYS check clinicData.ts FIRST as the primary source
    console.log(`🔧 getClinicProcedures - Using clinicData.ts as PRIMARY source`);
    
    // Check if user asked about a specific procedure
    // Use lastPriceQuery if available (from GPT), otherwise use current message
    const userMessage = (context.userData.lastPriceQuery || context.message || '').toLowerCase();
    console.log(`🔧 getClinicProcedures - User message: "${userMessage}"`);
    
    // Map procedure keywords to clinicData.ts IDs (matching the new structure)
    const procedureKeywords: Record<string, string[]> = {
      'acupuntura': ['acupuntura', 'agulha', 'agulhas'],
      'fisioterapia_ortopedica': ['fisioterapia ortopedica', 'fisioterapia ortopédica', 'fisio ortopedica', 'fisio ortopédica', 'ortopedica', 'ortopédica'],
      'rpg': ['rpg', 'reeducacao postural', 'reeducação postural', 'reeducação'],
      'pilates': ['pilates'],
      'quiropraxia': ['quiropraxia', 'quiropraxista'],
      'infiltracao': ['infiltração', 'infiltracao', 'agulhamento seco', 'agulhamento', 'ponto gatilho'],
      'ondas_choque': ['ondas de choque', 'terapia por ondas de choque', 'choque'],
      'tens': ['tens', 'estimulação elétrica', 'estimulacao eletrica'],
      'fisioterapia_pelvica': ['fisioterapia pelvica', 'fisioterapia pélvica', 'pelvica', 'pélvica'],
      'fisioterapia_neurologica': ['fisioterapia neurologica', 'fisioterapia neurológica', 'neurologica', 'neurológica'],
      'fisioterapia_respiratoria': ['fisioterapia respiratoria', 'fisioterapia respiratória', 'respiratoria', 'respiratória']
    };
    
    let specificProcedure: string | null = null;
    for (const [procId, keywords] of Object.entries(procedureKeywords)) {
      if (keywords.some(kw => userMessage.includes(kw))) {
        specificProcedure = procId;
        console.log(`🔧 getClinicProcedures - Detected specific procedure: ${procId}`);
        break;
      }
    }
    
    // ALWAYS check clinicData.ts FIRST (primary source)
    if (specificProcedure) {
      console.log(`🔧 getClinicProcedures - User asked about specific procedure, checking clinicData.ts (PRIMARY)...`);
      const procedureInfo = getProcedureInfoForGPT(specificProcedure, clinicCode);
      if (procedureInfo) {
        console.log(`🔧 getClinicProcedures - ✅ Found procedure info from clinicData.ts (PRIMARY SOURCE)`);
        return procedureInfo;
      }
      console.log(`🔧 getClinicProcedures - ⚠️ Procedure not found in clinicData.ts`);
    }
    
    // If no specific procedure or not found, return general list from clinicData.ts
    console.log(`🔧 getClinicProcedures - Returning general list from clinicData.ts (PRIMARY SOURCE)`);
    const clinicContext = formatClinicDataForGPT(clinicCode);
    const proceduresSection = clinicContext.split('💰 **PROCEDIMENTOS DISPONÍVEIS')[1] || '';
    
    if (proceduresSection) {
      return `📋 **Valores dos Procedimentos** (Particular)\n\n${proceduresSection}\n\n💡 Consulte valores para convênios específicos.\n💡 Para saber o valor de um procedimento específico, pergunte: "qual o valor da acupuntura?"`;
    }
    
    // Fallback message if clinicData.ts doesn't have procedures section
    return '📋 Procedimentos disponíveis:\n\nConsulte nossa equipe para mais informações sobre valores.';
    
  } catch (error) {
    console.error('Error fetching clinic procedures:', error);
    // Fallback to clinicData.ts on error
    let clinicCode = context.userData.selectedClinic || context.userData.clinicCode || 'vieiralves';
    const clinicContext = formatClinicDataForGPT(clinicCode);
    const proceduresSection = clinicContext.split('💰 **PROCEDIMENTOS DISPONÍVEIS')[1] || '';
    
    if (proceduresSection) {
      return `📋 **Valores dos Procedimentos** (Particular)\n\n${proceduresSection}\n\n💡 Consulte valores para convênios específicos.\n💡 Para saber o valor de um procedimento específico, pergunte: "qual o valor da acupuntura?"`;
    }
    
    return '📋 Procedimentos disponíveis:\n\n• Fisioterapia Ortopédica\n• Acupuntura\n• RPG\n• Liberação Miofascial\n\nConsulte valores com nossa equipe.';
  }
}

/**
 * Gets clinic accepted insurances
 */
async function getClinicInsurances(context: WorkflowExecutionContext): Promise<string> {
  try {
    // ALWAYS use clinicData.ts as PRIMARY source
    console.log(`🔧 getClinicInsurances - Using clinicData.ts (PRIMARY SOURCE)`);
    
    // Check if user asked about a specific insurance
    const userMessage = (context.message || '').toLowerCase();
    const insuranceKeywords = ['bradesco', 'sulamerica', 'sulamérica', 'mediservice', 'saude caixa', 'petrobras', 'geap', 'pro social', 'postal', 'conab', 'affeam', 'ambep', 'gama', 'life', 'notredame', 'oab', 'capesaude', 'casembrapa', 'cultural', 'evida', 'fogas', 'fusex', 'plan-assite'];
    
    let specificInsurance: string | null = null;
    for (const keyword of insuranceKeywords) {
      if (userMessage.includes(keyword)) {
        specificInsurance = keyword;
        console.log(`🔧 getClinicInsurances - Detected specific insurance: ${keyword}`);
        break;
      }
    }
    
    // Use clinicData.ts as PRIMARY source
    if (specificInsurance) {
      return getInsuranceInfoForGPT(specificInsurance);
    }
    
    return getInsuranceInfoForGPT(); // Return all insurances
    
  } catch (error) {
    console.error('Error fetching clinic insurances:', error);
    // Fallback to clinicData.ts on error
    return getInsuranceInfoForGPT();
  }
}

/**
 * Gets clinic location information
 */
async function getClinicLocation(context: WorkflowExecutionContext): Promise<string> {
  let clinicCode = context.userData.selectedClinic || context.userData.clinicCode || 'vieiralves';
  
  // Normalize clinic code
  if (clinicCode === 'vieiralves' || clinicCode === 'vieira-alves') {
    clinicCode = 'vieiralves';
  } else if (clinicCode === 'sao-jose' || clinicCode === 'são josé') {
    clinicCode = 'sao-jose';
  }
  
  try {
    console.log(`🔧 getClinicLocation - Clinic code: ${clinicCode}`);
    
    // Try to fetch from API first
    try {
      const { api } = await import('../../../lib/utils');
      const response = await api.get(`/api/clinic/clinics/${clinicCode}`);
      const clinic = response.data;
      
      if (clinic) {
        console.log(`🔧 getClinicLocation - Found clinic from API: ${clinic.name}`);
        
        // Format schedule
        const scheduleLines: string[] = [];
        if (clinic.openingHours || clinic.schedule) {
          const schedule = clinic.openingHours || clinic.schedule;
          Object.entries(schedule).forEach(([day, hours]) => {
            if (hours && hours !== 'Fechado' && hours !== 'Closed') {
              scheduleLines.push(`${day}: ${hours}`);
            } else if (hours === 'Fechado' || hours === 'Closed') {
              scheduleLines.push(`${day}: Fechado`);
            }
          });
        }
        
        const scheduleText = scheduleLines.length > 0 ? 
          scheduleLines.join('\n') : 
          'Segunda a Sexta: 08:00 - 18:00, Sábado: 08:00 - 12:00';
        
        const address = clinic.address || clinic.neighborhood || '';
        const phone = clinic.phone || '';
        const mapsUrl = clinic.mapUrl || clinic.mapsUrl || '';
        
        return `📍 **${clinic.name}**\n\n` +
               `📮 Endereço: ${address}\n` +
               `📞 Telefone: ${phone}\n` +
               `🗺️ Maps: ${mapsUrl}\n\n` +
               `⏰ **Horários:**\n${scheduleText}`;
      }
    } catch (apiError) {
      console.error('🔧 getClinicLocation - API error:', apiError);
    }
    
    // Fallback to clinicData.ts formatter
    console.log(`🔧 getClinicLocation - Using clinicData.ts fallback...`);
    return getLocationInfoForGPT(clinicCode);
    
  } catch (error) {
    console.error('Error fetching clinic location:', error);
    // Final fallback
    return getLocationInfoForGPT(clinicCode);
  }
}

