import { WorkflowExecutionContext } from '../core/types';

/**
 * Interpolates placeholders in a message template
 * Supports: ${unidade_nome}, ${paciente.nome}, ${procedimento_1}, etc.
 */
export async function interpolateMessage(
  template: string,
  context: WorkflowExecutionContext
): Promise<string> {
  if (!template) return '';
  
  let output = template;
  
  try {
    // Get clinic information
    let clinicCode = context.userData.selectedClinic || context.userData.clinicCode || 'vieiralves';
    
    // Normalize clinic code (vieiralves vs vieira-alves, etc)
    if (clinicCode === 'vieiralves' || clinicCode === 'vieira-alves') {
      clinicCode = 'vieiralves';
    } else if (clinicCode === 'sao-jose' || clinicCode === 'sao jose' || clinicCode === 'são josé') {
      clinicCode = 'sao-jose';
    }
    
    // Import clinic data dynamically
    const { clinicData } = await import('../../../data/clinicData.js');
    
    // Normalize clinic code
    let normalizedClinic = clinicCode.replace(/-/g, '_');
    if (normalizedClinic === 'vieiralves' || normalizedClinic === 'vieira_alves') {
      normalizedClinic = 'vieiralves';
    } else if (normalizedClinic === 'sao_jose' || normalizedClinic === 'são_josé') {
      normalizedClinic = 'sao_jose';
    }
    
    const clinic = clinicData.units.find((c: any) => {
      const cId = c.id || '';
      return cId === normalizedClinic || 
             cId === clinicCode ||
             cId.replace(/-/g, '_') === normalizedClinic ||
             cId.replace(/_/g, '-') === clinicCode;
    }) || clinicData.units[0];
    
    console.log(`🔧 Interpolator - Clinic code: ${clinicCode}, Normalized: ${normalizedClinic}, Found clinic: ${clinic?.name || 'none'}`);
    
    // Replace clinic placeholders
    if (clinic) {
      const mapsUrl = clinic.mapsUrl || '';
      const phone = clinic.phone || '(92) 3234-5678';
      const address = mapsUrl || 'Consulte o link do Maps';
      
      // Get business hours from clinicData
      const businessHours = clinicData.businessHours;
      const scheduleText = `Segunda a Sexta: ${businessHours.weekdays}, Sábado: ${businessHours.saturday}, Domingo: ${businessHours.sunday}`;
      
      output = output
        .replace(/\$\{unidade_nome\}/g, clinic.name || 'Clínica')
        .replace(/\$\{endereco\}/g, address)
        .replace(/\$\{telefone\}/g, phone)
        .replace(/\$\{maps_url\}/g, mapsUrl)
        .replace(/\$\{horario_atendimento\}/g, scheduleText);
      
      console.log(`🔧 Interpolator - Replaced placeholders for clinic: ${clinic.name}`);
    } else {
      console.warn(`🔧 Interpolator - Clinic not found for code: ${clinicCode}`);
    }
    
    // Replace patient placeholders
    const collectedData = context.userData.collectedData || {};
    output = output
      .replace(/\$\{paciente\.nome\}/g, collectedData.name || context.userData.patientName || '-')
      .replace(/\$\{paciente\.cpf\}/g, collectedData.cpf || '-')
      .replace(/\$\{paciente\.data_nascimento\}/g, collectedData.birth_date || '-')
      .replace(/\$\{paciente\.nascimento\}/g, collectedData.birth_date || '-')
      .replace(/\$\{paciente\.email\}/g, collectedData.email || '-')
      .replace(/\$\{paciente\.convenio\}/g, collectedData.insurance || context.userData.patientInsurance || '-')
      .replace(/\$\{paciente\.telefone\}/g, collectedData.phone || context.phone || '-');
    
    // Replace procedure placeholders
    output = output
      .replace(/\$\{procedimento_1\}/g, collectedData.procedure_1 || '-')
      .replace(/\$\{procedimento_2\}/g, collectedData.procedure_2 || '-')
      .replace(/\$\{procedimento_3\}/g, collectedData.procedure_3 || '-');
    
    // Replace scheduling placeholders
    output = output
      .replace(/\$\{data_escolhida\}/g, collectedData.preferred_date || '-')
      .replace(/\$\{turno\}/g, collectedData.preferred_shift || '-');
    
    // Dynamic procedure list placeholder
    if (output.includes('${procedimentos_disponiveis}')) {
      const proceduresList = await getProceduresList(clinicCode, context.userData.patientInsurance || collectedData.insurance);
      output = output.replace(/\$\{procedimentos_disponiveis\}/g, proceduresList);
    }
    
    // Replace procedimentos_lista placeholder (from ACTION node)
    if (output.includes('${procedimentos_lista}')) {
      const procedimentosLista = context.userData.procedimentosLista || context.userData.procedimentosDisponiveis || '• Consulte nossos procedimentos disponíveis';
      output = output.replace(/\$\{procedimentos_lista\}/g, procedimentosLista);
    }
    
  } catch (error) {
    console.error('Error interpolating message:', error);
  }
  
  return output;
}

/**
 * Formats clinic schedule into readable text
 */
function formatSchedule(schedule: any): string {
  if (!schedule) return 'Consulte horários disponíveis';
  
  const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const scheduleLines: string[] = [];
  
  Object.keys(schedule).forEach(day => {
    const hours = schedule[day];
    if (hours && hours !== 'Fechado') {
      scheduleLines.push(`${day}: ${hours}`);
    } else if (hours === 'Fechado') {
      scheduleLines.push(`${day}: Fechado`);
    }
  });
  
  return scheduleLines.join(', ');
}

/**
 * Gets available procedures list for the clinic and insurance
 */
async function getProceduresList(clinicCode: string, insurance: string = 'particular'): Promise<string> {
  try {
    // Import API utility
    const { api } = await import('../../../lib/utils');
    
    const insuranceId = (insurance || 'particular').toLowerCase() === 'particular' ? 'particular' : insurance;
    
    // Fetch procedures for the clinic and insurance
    const response = await api.get(`/api/clinic/clinics/${clinicCode}/insurances/${insuranceId}/procedures`);
    const procedures = Array.isArray(response.data) ? response.data : (response.data?.procedures || []);
    
    // Filter procedures for São José (exclude certain procedures)
    const bannedForSaoJose = ['fisioterapia-pelvica', 'quiropraxia', 'pilates-aparelhos', 'pilates'];
    const filteredProcedures = procedures.filter((p: any) => {
      const procName = (p.procedure?.name || p.name || p.procedureCode || '').toLowerCase();
      if (clinicCode === 'sao-jose') {
        return !bannedForSaoJose.some(banned => procName.includes(banned.replace('-', ' ')));
      }
      return true;
    });
    
    // Extract procedure names
    const names = filteredProcedures
      .map((p: any) => p.procedure?.name || p.name || p.procedureCode || '')
      .filter(Boolean);
    
    // Remove duplicates
    const uniqueNames = Array.from(new Set(names));
    
    if (uniqueNames.length === 0) {
      return '• Consulte nossos procedimentos disponíveis';
    }
    
    // Format as bullet list
    return uniqueNames.map(name => `• ${name}`).join('\n');
    
  } catch (error) {
    console.error('Error fetching procedures list:', error);
    
    // Fallback: return common procedures
    return `• Fisioterapia Ortopédica
• Acupuntura
• RPG
• Liberação Miofascial
• Ventosaterapia`;
  }
}

