/**
 * Conversation Templates Service
 * 
 * Fluxos de conversação pré-definidos (sem GPT)
 * Economia: 30-40%
 */

interface TemplateStep {
  id: string
  prompt: string
  type: 'text' | 'choice' | 'datetime' | 'confirm'
  choices?: string[]
  validation?: (input: string) => boolean
  next?: string | ((data: any) => string)
}

interface Template {
  id: string
  name: string
  steps: TemplateStep[]
}

interface ConversationState {
  templateId: string
  currentStep: string
  data: Record<string, any>
  startedAt: Date
}

class ConversationTemplatesService {
  private templates: Map<string, Template>
  private states: Map<string, ConversationState>
  private enabled: boolean

  constructor() {
    this.templates = new Map()
    this.states = new Map()
    this.enabled = true
    
    this.initializeTemplates()
    
    console.log(`📝 [Templates] Inicializado - ${this.templates.size} templates carregados`)
  }

  /**
   * Inicializa templates pré-definidos
   */
  private initializeTemplates() {
    // Template: Agendamento
    this.templates.set('appointment', {
      id: 'appointment',
      name: 'Agendamento',
      steps: [
        {
          id: 'procedure',
          prompt: '📋 Qual procedimento você deseja agendar?\n\n' +
                  '1️⃣ Acupuntura\n' +
                  '2️⃣ Fisioterapia\n' +
                  '3️⃣ RPG\n' +
                  '4️⃣ Pilates\n\n' +
                  'Digite o número ou nome do procedimento:',
          type: 'choice',
          choices: ['1', '2', '3', '4', 'acupuntura', 'fisioterapia', 'rpg', 'pilates'],
          next: 'location'
        },
        {
          id: 'location',
          prompt: '📍 Qual unidade você prefere?\n\n' +
                  '1️⃣ Vieiralves\n' +
                  '2️⃣ São José\n\n' +
                  'Digite o número ou nome:',
          type: 'choice',
          choices: ['1', '2', 'vieiralves', 'sao jose', 'são josé'],
          next: 'insurance'
        },
        {
          id: 'insurance',
          prompt: '🏥 Você tem convênio?\n\n' +
                  '1️⃣ Sim, tenho convênio\n' +
                  '2️⃣ Não, vou pagar particular\n\n' +
                  'Digite o número:',
          type: 'choice',
          choices: ['1', '2', 'sim', 'nao', 'não', 'particular'],
          next: (data) => data.insurance === '1' || data.insurance === 'sim' ? 'insurance_name' : 'name'
        },
        {
          id: 'insurance_name',
          prompt: '🏥 Qual o nome do seu convênio?\n\n' +
                  'Ex: Bradesco, SulAmérica, Unimed, etc.',
          type: 'text',
          next: 'name'
        },
        {
          id: 'name',
          prompt: '👤 Qual seu nome completo?',
          type: 'text',
          validation: (input) => input.trim().split(' ').length >= 2,
          next: 'phone'
        },
        {
          id: 'phone',
          prompt: '📱 Qual seu telefone?\n\n' +
                  'Ex: (92) 99999-9999',
          type: 'text',
          validation: (input) => /\d{8,}/.test(input.replace(/\D/g, '')),
          next: 'confirm'
        },
        {
          id: 'confirm',
          prompt: '✅ Confirme seus dados:\n\n' +
                  'Procedimento: {procedure}\n' +
                  'Unidade: {location}\n' +
                  'Convênio: {insurance_display}\n' +
                  'Nome: {name}\n' +
                  'Telefone: {phone}\n\n' +
                  'Está tudo correto?\n\n' +
                  '1️⃣ Sim, confirmar\n' +
                  '2️⃣ Não, corrigir',
          type: 'confirm',
          choices: ['1', '2', 'sim', 'nao', 'não', 'confirmar']
        }
      ]
    })

    // Template: Cadastro Simples
    this.templates.set('registration', {
      id: 'registration',
      name: 'Cadastro',
      steps: [
        {
          id: 'name',
          prompt: '👤 Para fazer seu cadastro, qual seu nome completo?',
          type: 'text',
          validation: (input) => input.trim().split(' ').length >= 2,
          next: 'cpf'
        },
        {
          id: 'cpf',
          prompt: '📄 Qual seu CPF?\n\n' +
                  'Digite apenas os números:',
          type: 'text',
          validation: (input) => /^\d{11}$/.test(input.replace(/\D/g, '')),
          next: 'email'
        },
        {
          id: 'email',
          prompt: '📧 Qual seu email?',
          type: 'text',
          validation: (input) => /\S+@\S+\.\S+/.test(input),
          next: 'phone'
        },
        {
          id: 'phone',
          prompt: '📱 Qual seu telefone?',
          type: 'text',
          validation: (input) => /\d{8,}/.test(input.replace(/\D/g, '')),
          next: 'birthdate'
        },
        {
          id: 'birthdate',
          prompt: '📅 Qual sua data de nascimento?\n\n' +
                  'Formato: DD/MM/AAAA',
          type: 'text',
          validation: (input) => /^\d{2}\/\d{2}\/\d{4}$/.test(input),
          next: 'confirm'
        },
        {
          id: 'confirm',
          prompt: '✅ Confirme seus dados:\n\n' +
                  'Nome: {name}\n' +
                  'CPF: {cpf_masked}\n' +
                  'Email: {email}\n' +
                  'Telefone: {phone}\n' +
                  'Nascimento: {birthdate}\n\n' +
                  'Está correto?\n\n' +
                  '1️⃣ Sim\n' +
                  '2️⃣ Não',
          type: 'confirm',
          choices: ['1', '2', 'sim', 'nao', 'não']
        }
      ]
    })
  }

  /**
   * Inicia um template para um usuário
   */
  startTemplate(userId: string, templateId: string): string {
    const template = this.templates.get(templateId)
    if (!template) {
      return `Template "${templateId}" não encontrado.`
    }

    this.states.set(userId, {
      templateId,
      currentStep: template.steps[0].id,
      data: {},
      startedAt: new Date()
    })

    console.log(`📝 [Templates] Iniciado template "${templateId}" para usuário ${userId}`)

    return this.formatPrompt(template.steps[0].prompt, {})
  }

  /**
   * Processa resposta do usuário
   */
  processResponse(userId: string, message: string): { response: string; completed: boolean; data?: any } {
    const state = this.states.get(userId)
    if (!state) {
      return { response: '', completed: false }
    }

    const template = this.templates.get(state.templateId)
    if (!template) {
      return { response: 'Erro no template.', completed: true }
    }

    const currentStep = template.steps.find(s => s.id === state.currentStep)
    if (!currentStep) {
      return { response: 'Erro: passo não encontrado.', completed: true }
    }

    const normalized = message.toLowerCase().trim()

    // Validar input
    if (currentStep.type === 'choice' && currentStep.choices) {
      if (!currentStep.choices.some(c => normalized.includes(c.toLowerCase()))) {
        return {
          response: `❌ Opção inválida. Por favor, escolha uma das opções.\n\n${currentStep.prompt}`,
          completed: false
        }
      }
    }

    if (currentStep.validation && !currentStep.validation(message)) {
      return {
        response: `❌ Formato inválido. Por favor, tente novamente.\n\n${currentStep.prompt}`,
        completed: false
      }
    }

    // Salvar resposta
    state.data[currentStep.id] = message

    // Determinar próximo passo
    let nextStepId: string | undefined
    
    if (typeof currentStep.next === 'function') {
      nextStepId = currentStep.next(state.data)
    } else {
      nextStepId = currentStep.next
    }

    // Se não tem próximo passo, finalizar
    if (!nextStepId) {
      this.states.delete(userId)
      console.log(`📝 [Templates] Template "${state.templateId}" completado para usuário ${userId}`)
      return {
        response: '✅ Cadastro concluído! Em breve entraremos em contato.',
        completed: true,
        data: state.data
      }
    }

    // Ir para próximo passo
    const nextStep = template.steps.find(s => s.id === nextStepId)
    if (!nextStep) {
      return { response: 'Erro no fluxo.', completed: true }
    }

    state.currentStep = nextStepId

    return {
      response: this.formatPrompt(nextStep.prompt, state.data),
      completed: false
    }
  }

  /**
   * Formata prompt com dados
   */
  private formatPrompt(prompt: string, data: Record<string, any>): string {
    let formatted = prompt

    // Substituir placeholders
    for (const [key, value] of Object.entries(data)) {
      formatted = formatted.replace(`{${key}}`, String(value))
    }

    // Placeholders especiais
    if (data.cpf) {
      formatted = formatted.replace('{cpf_masked}', '***.' + data.cpf.slice(-4))
    }

    if (data.insurance) {
      const display = data.insurance === '1' || data.insurance === 'sim' 
        ? data.insurance_name || 'Convênio'
        : 'Particular'
      formatted = formatted.replace('{insurance_display}', display)
    }

    return formatted
  }

  /**
   * Verifica se usuário está em template
   */
  isInTemplate(userId: string): boolean {
    return this.states.has(userId)
  }

  /**
   * Cancela template
   */
  cancelTemplate(userId: string): void {
    this.states.delete(userId)
    console.log(`📝 [Templates] Template cancelado para usuário ${userId}`)
  }

  /**
   * Obtém estatísticas
   */
  getStats() {
    return {
      templates: this.templates.size,
      activeConversations: this.states.size,
      enabled: this.enabled
    }
  }
}

// Exportar singleton
export const conversationTemplatesService = new ConversationTemplatesService()
