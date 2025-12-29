/**
 * Quick Replies Service
 * 
 * Botões de escolha rápida para WhatsApp
 * Economia: 40-50% (reduz mensagens abertas)
 */

interface QuickReply {
  id: string
  title: string
  description?: string
}

interface QuickReplyMessage {
  text: string
  buttons: QuickReply[]
}

class QuickRepliesService {
  private enabled: boolean

  constructor() {
    this.enabled = true
    console.log(`📱 [Quick Replies] Inicializado`)
  }

  /**
   * Gera menu principal
   */
  getMainMenu(): QuickReplyMessage {
    return {
      text: '👋 Olá! Bem-vindo às Clínicas IAAM!\n\n' +
            'Como posso ajudá-lo hoje?',
      buttons: [
        { id: 'prices', title: '💰 Valores', description: 'Consultar preços' },
        { id: 'location', title: '📍 Localização', description: 'Endereço e horários' },
        { id: 'insurance', title: '🏥 Convênios', description: 'Convênios aceitos' },
        { id: 'appointment', title: '📅 Agendar', description: 'Marcar consulta' }
      ]
    }
  }

  /**
   * Menu de procedimentos
   */
  getProceduresMenu(): QuickReplyMessage {
    return {
      text: '📋 Escolha o procedimento:',
      buttons: [
        { id: 'acupuncture', title: '🎯 Acupuntura' },
        { id: 'physiotherapy', title: '💪 Fisioterapia' },
        { id: 'rpg', title: '🧘 RPG' },
        { id: 'pilates', title: '🏋️ Pilates' }
      ]
    }
  }

  /**
   * Menu de unidades
   */
  getLocationsMenu(): QuickReplyMessage {
    return {
      text: '📍 Escolha a unidade:',
      buttons: [
        { id: 'vieiralves', title: '🏥 Vieiralves', description: 'Rua Vieiralves' },
        { id: 'sao-jose', title: '🏥 São José', description: 'Av. São José' }
      ]
    }
  }

  /**
   * Menu de convênios
   */
  getInsuranceMenu(): QuickReplyMessage {
    return {
      text: '🏥 Você tem convênio?',
      buttons: [
        { id: 'yes', title: '✅ Sim, tenho' },
        { id: 'no', title: '❌ Não, particular' }
      ]
    }
  }

  /**
   * Menu de confirmação
   */
  getConfirmationMenu(data: string): QuickReplyMessage {
    return {
      text: data + '\n\n✅ Está correto?',
      buttons: [
        { id: 'confirm', title: '✅ Sim, confirmar' },
        { id: 'cancel', title: '❌ Não, corrigir' }
      ]
    }
  }

  /**
   * Formata para WhatsApp Business API
   */
  formatForWhatsApp(message: QuickReplyMessage) {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: message.text
        },
        action: {
          buttons: message.buttons.slice(0, 3).map(btn => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title.substring(0, 20) // WhatsApp limita a 20 chars
            }
          }))
        }
      }
    }
  }

  /**
   * Formata para lista (mais de 3 opções)
   */
  formatAsList(title: string, options: QuickReply[]) {
    return {
      messaging_product: 'whatsapp',
      type: 'interactive',
      interactive: {
        type: 'list',
        header: {
          type: 'text',
          text: title
        },
        body: {
          text: 'Escolha uma opção:'
        },
        action: {
          button: 'Ver opções',
          sections: [
            {
              title: 'Opções disponíveis',
              rows: options.map(opt => ({
                id: opt.id,
                title: opt.title.substring(0, 24), // Limite do WhatsApp
                description: opt.description?.substring(0, 72) // Limite do WhatsApp
              }))
            }
          ]
        }
      }
    }
  }

  /**
   * Detecta se mensagem é resposta a quick reply
   */
  isQuickReplyResponse(message: string): boolean {
    // IDs de quick replies são sempre curtos e sem espaços
    return message.length < 20 && !message.includes(' ') && /^[a-z-]+$/.test(message)
  }

  /**
   * Mapeia resposta de quick reply para intent
   */
  mapQuickReplyToIntent(replyId: string): string | null {
    const mapping: Record<string, string> = {
      'prices': 'price',
      'location': 'location',
      'insurance': 'insurance',
      'appointment': 'appointment',
      'acupuncture': 'price_acupuncture',
      'physiotherapy': 'price_fisio',
      'rpg': 'price_rpg',
      'pilates': 'price_pilates',
      'vieiralves': 'location_vieiralves',
      'sao-jose': 'location_sao_jose',
      'yes': 'has_insurance',
      'no': 'no_insurance',
      'confirm': 'confirm',
      'cancel': 'cancel'
    }

    return mapping[replyId] || null
  }

  /**
   * Gera quick reply baseado em contexto
   */
  getContextualReply(context: string): QuickReplyMessage | null {
    switch (context) {
      case 'greeting':
        return this.getMainMenu()
      
      case 'ask_procedure':
        return this.getProceduresMenu()
      
      case 'ask_location':
        return this.getLocationsMenu()
      
      case 'ask_insurance':
        return this.getInsuranceMenu()
      
      default:
        return null
    }
  }

  /**
   * Estatísticas
   */
  getStats() {
    return {
      enabled: this.enabled
    }
  }
}

// Exportar singleton
export const quickRepliesService = new QuickRepliesService()
