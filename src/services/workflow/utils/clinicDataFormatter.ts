import { clinicData } from '../../../data/clinicData.js';
import { formatMessageForWhatsApp } from './messageFormatter.js';
import { TemplateService } from '../../../services/templateService.js';
import type { TemplateContext } from '../../../types/templates.js';

/**
 * Formats clinic data for GPT context
 * Provides all relevant information in a structured format for GPT to use
 */
export function formatClinicDataForGPT(clinicCode?: string): string {
  const selectedClinic = clinicCode || 'vieiralves';
  
  // Normalize clinic code
  let normalizedClinic = selectedClinic.replace(/-/g, '_');
  if (normalizedClinic === 'vieiralves' || normalizedClinic === 'vieira_alves') {
    normalizedClinic = 'vieiralves';
  } else if (normalizedClinic === 'sao_jose' || normalizedClinic === 'são_josé') {
    normalizedClinic = 'sao_jose';
  }
  
  // Get clinic unit (changed from locations to units)
  const location = clinicData.units.find(loc => 
    loc.id === normalizedClinic || 
    loc.id === selectedClinic ||
    loc.id.replace(/_/g, '-') === selectedClinic ||
    loc.id.replace(/-/g, '_') === normalizedClinic
  ) || clinicData.units[0];
  
  // Format procedures with all details
  const proceduresText = clinicData.procedures
    .filter(proc => {
      // Filter by available units
      if (proc.availableUnits && proc.availableUnits.length > 0) {
        return proc.availableUnits.some(unit => 
          unit === selectedClinic || 
          unit.replace(/_/g, '-') === selectedClinic ||
          unit.replace(/-/g, '_') === selectedClinic
        );
      }
      return true;
    })
    .map(proc => {
      let text = `• **${proc.name}**\n`;
      text += `  - Descrição: ${proc.description || 'Procedimento disponível'}\n`;
      text += `  - Duração: ${proc.duration} minutos\n`;
      
      // Get price for selected clinic
      const clinicPrice = proc.prices?.[normalizedClinic];
      if (clinicPrice !== null && clinicPrice !== undefined) {
        if (typeof clinicPrice === 'object' && clinicPrice !== null) {
          // Handle Pilates pricing structure
          const prices = clinicPrice as any;
          if (prices.twiceWeek || prices.threeWeek || prices.singleSession) {
            text += `  - Valor (Particular):\n`;
            if (prices.twiceWeek) text += `    • 2x por semana: R$ ${prices.twiceWeek.toFixed(2)}\n`;
            if (prices.threeWeek) text += `    • 3x por semana: R$ ${prices.threeWeek.toFixed(2)}\n`;
            if (prices.singleSession) text += `    • Sessão avulsa: R$ ${prices.singleSession.toFixed(2)}\n`;
          }
        } else {
          text += `  - Valor (Particular): R$ ${Number(clinicPrice).toFixed(2)}\n`;
        }
      } else {
        text += `  - Valor: Consultar\n`;
      }
      
      // Get packages for selected clinic
      const clinicPackages = proc.packages?.[normalizedClinic] || [];
      if (clinicPackages.length > 0) {
        const packagesText = clinicPackages.map((pkg: any) => 
          `    Pacote ${pkg.sessions} sessões: R$ ${pkg.price.toFixed(2)}`
        ).join('\n');
        text += `  - Pacotes disponíveis:\n${packagesText}\n`;
      }
      
      return text;
    })
    .join('\n');
  
  // Format insurance companies (now just an array of strings)
  const allInsurances = [...clinicData.insurance, ...clinicData.discountInsurance];
  const insurancesText = allInsurances.map(ins => `• ${ins}`).join('\n');
  
  // Format business hours
  const hoursText = `Segunda a Sexta: ${clinicData.businessHours.weekdays}\nSábado: ${clinicData.businessHours.saturday}\nDomingo: ${clinicData.businessHours.sunday}`;
  
  return `🏥 **INFORMAÇÕES DA CLÍNICA ${clinicData.name.toUpperCase()}**

📍 **UNIDADE SELECIONADA: ${location.name}**
- Maps: ${location.mapsUrl || 'N/A'}
- Telefone: ${location.phone}

⏰ **HORÁRIOS DE FUNCIONAMENTO:**
${hoursText}

💰 **PROCEDIMENTOS DISPONÍVEIS (${location.name}):**
${proceduresText}

🏥 **CONVÊNIOS ACEITOS:**
${insurancesText}

💡 **OBSERVAÇÕES:**
• Convênios com desconto: ${clinicData.discountInsurance.join(', ')}
• Valores podem variar conforme o convênio e plano`;
}

/**
 * Gets specific procedure information for GPT
 * Now uses templates from database (editable in Settings > Templates)
 */
export async function getProcedureInfoForGPT(procedureName: string, clinicCode?: string): Promise<string | null> {
  const normalizedName = procedureName.toLowerCase().trim();
  const selectedClinic = clinicCode || 'vieiralves';
  
  console.log(`🔧 getProcedureInfoForGPT - Looking for procedure: "${normalizedName}" in clinic: "${selectedClinic}"`);
  
  const procedure = clinicData.procedures.find(proc => {
    const procName = proc.name.toLowerCase();
    const procId = proc.id.toLowerCase();
    
    // Try exact match first
    if (procId === normalizedName || procName === normalizedName) {
      return true;
    }
    
    // Try partial matches
    if (procName.includes(normalizedName) ||
        procId.includes(normalizedName) ||
        normalizedName.includes(procName.split(' ')[0]) ||
        normalizedName.includes(procId)) {
      return true;
    }
    
    return false;
  });
  
  console.log(`🔧 getProcedureInfoForGPT - Found procedure: ${procedure ? procedure.name : 'none'}`);
  
  if (!procedure) return null;
  
  // Check if procedure is available in selected clinic
  if (procedure.availableUnits && procedure.availableUnits.length > 0) {
    const isAvailable = procedure.availableUnits.some(unit => 
      unit === selectedClinic || 
      unit.replace(/_/g, '-') === selectedClinic ||
      unit.replace(/-/g, '_') === selectedClinic
    );
    
    if (!isAvailable) {
      return `⚠️ O procedimento "${procedure.name}" não está disponível na unidade selecionada.`;
    }
  }
  
  // Normalize clinic code for price lookup
  let normalizedClinicForPrice = selectedClinic.replace(/-/g, '_');
  if (normalizedClinicForPrice === 'vieiralves' || normalizedClinicForPrice === 'vieira_alves') {
    normalizedClinicForPrice = 'vieiralves';
  } else if (normalizedClinicForPrice === 'sao_jose' || normalizedClinicForPrice === 'são_josé') {
    normalizedClinicForPrice = 'sao_jose';
  }
  
  // Try to use template first, fallback to hardcoded if template doesn't exist
  try {
    // Build context for template
    const clinicPrice = procedure.prices?.[normalizedClinicForPrice];
    let priceText = 'Consultar com nossa equipe';
    
    if (clinicPrice !== null && clinicPrice !== undefined) {
      if (typeof clinicPrice === 'object' && clinicPrice !== null) {
        // Handle Pilates pricing structure
        const prices = clinicPrice as any;
        const priceLines: string[] = [];
        if (prices.twiceWeek) priceLines.push(`• 2x por semana: R$ ${prices.twiceWeek.toFixed(2)}`);
        if (prices.threeWeek) priceLines.push(`• 3x por semana: R$ ${prices.threeWeek.toFixed(2)}`);
        if (prices.singleSession) priceLines.push(`• Sessão avulsa: R$ ${prices.singleSession.toFixed(2)}`);
        priceText = priceLines.join('\n');
      } else {
        priceText = `R$ ${Number(clinicPrice).toFixed(2)}`;
      }
    }
    
    // Build packages text (only if packages exist)
    const clinicPackages = procedure.packages?.[normalizedClinicForPrice] || [];
    const packagesText = clinicPackages.length > 0
      ? `🎁 *Pacotes Disponíveis:*\n${clinicPackages.map((pkg: any) => {
          const pricePerSession = pkg.price / pkg.sessions;
          return `• Pacote de ${pkg.sessions} sessões: R$ ${pkg.price.toFixed(2)} (R$ ${pricePerSession.toFixed(2)} por sessão)`;
        }).join('\n')}\n`
      : '';
    
    // Build insurances text (only if insurances exist)
    const acceptedInsurances = procedure.convenios || [];
    const insurancesText = acceptedInsurances.length > 0
      ? `💳 *Aceita os seguintes convênios:*\n${acceptedInsurances.slice(0, 10).map((ins: string) => `• ${ins}`).join('\n')}${acceptedInsurances.length > 10 ? `\n... e mais ${acceptedInsurances.length - 10} convênios` : ''}\n`
      : '';
    
    const templateContext: TemplateContext = {
      procedimento_nome: procedure.name,
      procedimento_descricao: procedure.description || 'Procedimento disponível',
      procedimento_duracao: `${procedure.duration}`,
      preco_particular: priceText,
      pacotes_disponiveis: packagesText,
      convenios_aceitos: insurancesText,
      tem_pacotes: clinicPackages.length > 0 ? 'true' : 'false',
      tem_convenios: acceptedInsurances.length > 0 ? 'true' : 'false',
      total_convenios: `${acceptedInsurances.length}`
    };
    
    // Try to get template
    const template = await TemplateService.getInterpolatedTemplate('procedure_info_complete', templateContext);
    
    if (template) {
      console.log(`🔧 getProcedureInfoForGPT - Using template for ${procedure.name}`);
      return formatMessageForWhatsApp(template);
    }
  } catch (error) {
    console.warn(`🔧 getProcedureInfoForGPT - Template not found or error, using fallback:`, error);
  }
  
  // Fallback to hardcoded format if template doesn't exist
  let info = `💉 *${procedure.name}*\n`;
  info += `📝 *Descrição:*\n${procedure.description || 'Procedimento disponível'}\n`;
  info += `⏱️ *Duração:* ${procedure.duration} minutos\n`;
  
  // Get price for selected clinic
  const clinicPrice = procedure.prices?.[normalizedClinicForPrice];
  if (clinicPrice !== null && clinicPrice !== undefined) {
    if (typeof clinicPrice === 'object' && clinicPrice !== null) {
      // Handle Pilates pricing structure
      const prices = clinicPrice as any;
      info += `💰 *Valor (Particular):*\n`;
      if (prices.twiceWeek) info += `• 2x por semana: R$ ${prices.twiceWeek.toFixed(2)}\n`;
      if (prices.threeWeek) info += `• 3x por semana: R$ ${prices.threeWeek.toFixed(2)}\n`;
      if (prices.singleSession) info += `• Sessão avulsa: R$ ${prices.singleSession.toFixed(2)}\n`;
    } else {
      info += `💰 *Valor (Particular):* R$ ${Number(clinicPrice).toFixed(2)}\n`;
    }
  } else {
    info += `💰 *Valor:* Consultar com nossa equipe\n`;
  }
  
  // Get packages for selected clinic
  const clinicPackages = procedure.packages?.[normalizedClinicForPrice] || [];
  if (clinicPackages.length > 0) {
    info += `🎁 *Pacotes Disponíveis:*\n`;
    clinicPackages.forEach((pkg: any) => {
      const pricePerSession = pkg.price / pkg.sessions;
      info += `• Pacote de ${pkg.sessions} sessões: R$ ${pkg.price.toFixed(2)} (R$ ${pricePerSession.toFixed(2)} por sessão)\n`;
    });
  }
  
  // Get insurance info from procedure.convenios
  const acceptedInsurances = procedure.convenios || [];
  if (acceptedInsurances.length > 0) {
    info += `💳 *Aceita os seguintes convênios:*\n`;
    info += acceptedInsurances.slice(0, 10).map((ins: string) => `• ${ins}`).join('\n');
    if (acceptedInsurances.length > 10) {
      info += `\n... e mais ${acceptedInsurances.length - 10} convênios`;
    }
    info += `\n💡 Valores com convênio podem variar. Consulte nossa equipe para valores específicos do seu plano.`;
  } else {
    info += `💡 Consulte nossa equipe para informações sobre convênios aceitos.`;
  }
  
  info += `\n📞 *Próximos passos:*\n`;
  info += `Para agendar uma sessão, entre em contato conosco ou use o comando de agendamento!`;
  
  // Format for WhatsApp with proper line breaks (reduced spacing)
  return formatMessageForWhatsApp(info);
}

/**
 * Gets insurance information for GPT
 */
export function getInsuranceInfoForGPT(insuranceName?: string): string {
  const allInsurances = [...clinicData.insurance, ...clinicData.discountInsurance];
  
  if (!insuranceName) {
    // Return all insurances
    return `🏥 **CONVÊNIOS ACEITOS**\n\n` +
           `📋 **Lista completa:**\n${allInsurances.map(ins => `• ${ins}`).join('\n')}\n\n` +
           `💡 **Convênios com desconto:**\n${clinicData.discountInsurance.map(ins => `• ${ins}`).join('\n')}\n\n` +
           `💡 Para saber quais procedimentos são cobertos pelo seu convênio, pergunte: "quais procedimentos o [nome do convênio] cobre?"`;
  }
  
  const normalized = insuranceName.toLowerCase().trim();
  const removeAccents = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleanInput = removeAccents(normalized);
  
  // Try to find insurance in the list
  const insurance = allInsurances.find(ins => {
    const insName = removeAccents(ins.toLowerCase());
    return insName.includes(cleanInput) || cleanInput.includes(insName);
  });
  
  if (!insurance) {
    return `❓ Não encontrei informações específicas sobre "${insuranceName}".\n\n` +
           `💡 Nossos principais convênios são:\n` +
           `${clinicData.insurance.slice(0, 5).map(ins => `• ${ins}`).join('\n')}\n\n` +
           `📞 Entre em contato para verificar se seu convênio é aceito!`;
  }
  
  const isDiscount = clinicData.discountInsurance.includes(insurance);
  
  return `✅ **Sim, atendemos ${insurance}!**\n\n` +
         `📝 **Sobre o convênio:**\n${isDiscount ? 'Convênio aceito com desconto especial' : 'Convênio aceito em nossa clínica'}\n\n` +
         `💡 **Procedimentos disponíveis:**\n` +
         `Para saber quais procedimentos são cobertos, pergunte sobre um procedimento específico.\n\n` +
         `💰 **Valores:**\n` +
         `Os valores variam conforme o procedimento e o plano do seu convênio.\n` +
         `Para saber valores específicos, pergunte: "qual o valor da [procedimento] com ${insurance}?"\n\n` +
         `📞 Entre em contato para mais detalhes sobre cobertura e valores!`;
}

/**
 * Gets location information for GPT
 */
export function getLocationInfoForGPT(clinicCode?: string): string {
  const selectedClinic = clinicCode || 'vieiralves';
  
  // Normalize clinic code
  let normalizedClinicForLocation = selectedClinic.replace(/-/g, '_');
  if (normalizedClinicForLocation === 'vieiralves' || normalizedClinicForLocation === 'vieira_alves') {
    normalizedClinicForLocation = 'vieiralves';
  } else if (normalizedClinicForLocation === 'sao_jose' || normalizedClinicForLocation === 'são_josé') {
    normalizedClinicForLocation = 'sao_jose';
  }
  
  const location = clinicData.units.find(loc => {
    const locId = loc.id || '';
    const normalizedLocId = locId.replace(/-/g, '_').replace(/_/g, '-');
    return normalizedLocId === normalizedClinicForLocation || 
           locId === selectedClinic || 
           locId === normalizedClinicForLocation ||
           locId.replace(/_/g, '-') === selectedClinic ||
           locId.replace(/-/g, '_') === normalizedClinicForLocation;
  }) || clinicData.units[0];
  
  const hoursText = `Segunda a Sexta: ${clinicData.businessHours.weekdays}\nSábado: ${clinicData.businessHours.saturday}\nDomingo: ${clinicData.businessHours.sunday}`;
  
  // location.mapsUrl contains the maps URL
  const mapsUrl = location.mapsUrl || '';
  
  return `📍 **${location.name}**\n\n` +
         `🗺️ **Como chegar:**\n${mapsUrl ? `Acesse: ${mapsUrl}` : 'Consulte disponibilidade'}\n\n` +
         `📞 **Telefone:**\n${location.phone}\n\n` +
         `⏰ **Horários de Funcionamento:**\n${hoursText}\n\n` +
         `💡 **Estacionamento:**\nConsulte disponibilidade ao entrar em contato.\n\n` +
         `📞 **Dúvidas?** Entre em contato pelo telefone acima!`;
}

