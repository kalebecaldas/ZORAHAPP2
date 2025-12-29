import prisma from '../prisma/client.js'

/**
 * Serviço para gerenciar e aplicar regras de resposta do bot
 */
class RuleEngineService {
    /**
     * Busca regras de procedimento por código
     */
    async getProcedureRule(procedureCode: string) {
        try {
            if (!procedureCode) {
                return null
            }
            return await prisma.procedureRule.findUnique({
                where: { procedureCode }
            })
        } catch (error) {
            console.error(`Erro ao buscar regra para procedimento ${procedureCode}:`, error)
            return null
        }
    }

    /**
     * Busca regras de convênio por código
     */
    async getInsuranceRule(insuranceCode: string) {
        return await prisma.insuranceRule.findUnique({
            where: { insuranceCode }
        })
    }

    /**
     * Busca template de resposta por intenção e contexto
     * @param intent - Intenção classificada (INFORMACAO, AGENDAR, VALOR_PARTICULAR, etc)
     * @param context - Contexto da conversa (procedimento, convenio, geral)
     * @param targetType - Tipo de alvo (procedure, insurance, general)
     * @param targetId - ID específico (código do procedimento ou convênio)
     */
    async getResponseTemplate(
        intent: string,
        context?: string,
        targetType?: string,
        targetId?: string
    ) {
        // Buscar com prioridade: específico > tipo > geral
        const templates = await prisma.responseRule.findMany({
            where: {
                intent,
                isActive: true,
                OR: [
                    // 1. Mais específico: intent + targetId exato
                    { targetId: targetId || null },
                    // 2. Médio: intent + targetType
                    { targetType: targetType || null, targetId: null },
                    // 3. Geral: só intent
                    { targetType: 'general', targetId: null }
                ]
            },
            orderBy: { priority: 'desc' }
        })

        // Retornar o mais específico
        return templates[0] || null
    }

    /**
     * Renderiza um template substituindo variáveis
     * @param template - Template com variáveis {variavel}
     * @param variables - Objeto com valores das variáveis
     */
    renderTemplate(template: string, variables: Record<string, any>): string {
        let rendered = template

        // Substituir variáveis simples {variavel}
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`\\{${key}\\}`, 'g')
            rendered = rendered.replace(regex, String(value || ''))
        }

        // Processar condicionais {if condition}...{endif}
        rendered = this.processConditionals(rendered, variables)

        // Processar loops {foreach array}...{endforeach}
        rendered = this.processLoops(rendered, variables)

        return rendered.trim()
    }

    /**
     * Processa condicionais no template
     * Formato: {if condition}conteúdo{endif}
     */
    private processConditionals(template: string, variables: Record<string, any>): string {
        const conditionalRegex = /\{if\s+(\w+)\}([\s\S]*?)\{endif\}/g
        
        return template.replace(conditionalRegex, (match, condition, content) => {
            // Verificar se a condição é verdadeira
            const conditionValue = variables[condition]
            
            if (conditionValue) {
                return content
            }
            return ''
        })
    }

    /**
     * Processa loops no template
     * Formato: {foreach array}...{endforeach}
     */
    private processLoops(template: string, variables: Record<string, any>): string {
        const loopRegex = /\{foreach\s+(\w+)\}([\s\S]*?)\{endforeach\}/g
        
        return template.replace(loopRegex, (match, arrayName, content) => {
            const array = variables[arrayName]
            
            if (!Array.isArray(array) || array.length === 0) {
                return ''
            }
            
            // Renderizar conteúdo para cada item do array
            return array.map(item => {
                let itemContent = content
                
                // Substituir variáveis do item {item.property}
                const itemVarRegex = new RegExp(`\\{${arrayName}\\.(\\w+)\\}`, 'g')
                itemContent = itemContent.replace(itemVarRegex, (m, prop) => {
                    return String(item[prop] || '')
                })
                
                return itemContent
            }).join('\n')
        })
    }

    /**
     * Formata informações de procedimento com base nas regras
     * @param procedureData - Dados do procedimento
     * @param clinicCode - Código da unidade/clínica (opcional)
     */
    async formatProcedureInfo(procedureData: any, clinicCode?: string): Promise<string> {
        try {
            if (!procedureData || !procedureData.code) {
                return `**${procedureData?.name || 'Procedimento'}**: R$ ${procedureData?.price || 'N/A'}`
            }

            const rule = await this.getProcedureRule(procedureData.code)
            
            // ✅ Buscar preço específico da unidade se clinicCode for fornecido
            const { prismaClinicDataService } = await import('./prismaClinicDataService.js')
            const priceInfo = clinicCode 
                ? await prismaClinicDataService.calculatePrice(procedureData.code, undefined, clinicCode)
                : null
            
            // Usar preço da unidade específica se disponível, senão usar genérico
            const sessionPrice = priceInfo?.patientPays || procedureData.price
            
            if (!rule) {
                // Formato padrão sem regra
                const unitInfo = clinicCode ? ` (unidade: ${clinicCode})` : ''
                return `**${procedureData.name}**${unitInfo}: R$ ${sessionPrice}`
            }

            let info = ''

            // Mensagem customizada
            if (rule.customMessage) {
                info += `${rule.customMessage}\n\n`
            }

            // Informações de avaliação
            // Se tem preço de avaliação (mesmo sem requiresEvaluation marcado), mostrar
            if (rule.evaluationPrice) {
                if (rule.showEvaluationFirst !== false) {
                    // Se a avaliação já inclui a primeira sessão, mostrar apenas o valor da avaliação
                    // Por padrão, evaluationIncludesFirstSession é true
                    const includesFirst = rule.evaluationIncludesFirstSession !== false
                    if (includesFirst) {
                        const obrigatoria = rule.requiresEvaluation ? ' (obrigatória)' : ''
                        info += `• **Avaliação + Primeira Sessão**: R$ ${rule.evaluationPrice}${obrigatoria}\n`
                    } else {
                        const obrigatoria = rule.requiresEvaluation ? ' (obrigatória)' : ''
                        info += `• **Avaliação**: R$ ${rule.evaluationPrice}${obrigatoria}\n`
                        // Sessão avulsa só aparece se a avaliação não incluir a primeira sessão
                        info += `• **Sessão avulsa**: R$ ${sessionPrice}\n`
                    }
                }
            } else {
                // Se não tem avaliação, mostrar apenas sessão avulsa
                info += `• **Sessão avulsa**: R$ ${sessionPrice}\n`
            }

            // Pacotes
            if (procedureData.packages && procedureData.packages.length > 0) {
                info += `\n📦 **Pacotes disponíveis:**\n`
                
                procedureData.packages.forEach((pkg: any) => {
                    let pkgInfo = `• ${pkg.name}: R$ ${pkg.price} (${pkg.sessions} sessões)`
                    
                    // Adicionar info de avaliação grátis
                    if (rule.evaluationInPackage && pkg.sessions >= (rule.minimumPackageSessions || 10)) {
                        pkgInfo += ` - **Avaliação GRÁTIS**`
                    }
                    
                    if (pkg.description) {
                        pkgInfo += ` - ${pkg.description}`
                    }
                    
                    info += `${pkgInfo}\n`
                })
            }

            return info
        } catch (error) {
            console.error(`Erro ao formatar procedimento ${procedureData?.code}:`, error)
            // Retornar formato básico em caso de erro
            return `**${procedureData?.name || 'Procedimento'}**: R$ ${procedureData?.price || 'N/A'}`
        }
    }

    /**
     * Formata saudação para convênio com base nas regras
     */
    async formatInsuranceGreeting(insuranceCode: string, insuranceName: string): Promise<string> {
        const rule = await this.getInsuranceRule(insuranceCode)
        
        if (!rule || !rule.customGreeting) {
            return `Perfeito! Trabalhamos com ${insuranceName}.`
        }
        
        // Substituir variável {convenio} na saudação
        return rule.customGreeting.replace(/\{convenio\}/g, insuranceName)
    }

    /**
     * Verifica se deve mostrar valores para um convênio
     */
    async shouldShowInsuranceValues(insuranceCode: string): Promise<boolean> {
        const rule = await this.getInsuranceRule(insuranceCode)
        
        if (!rule) {
            return false // Por padrão, não mostrar valores
        }
        
        return !rule.hideValues
    }

    /**
     * Verifica se pode mostrar desconto para um convênio
     */
    async canShowDiscount(insuranceCode: string): Promise<boolean> {
        const rule = await this.getInsuranceRule(insuranceCode)
        
        if (!rule) {
            return false
        }
        
        return rule.canShowDiscount
    }

    /**
     * Busca todas as regras ativas de procedimentos
     */
    async getAllProcedureRules() {
        return await prisma.procedureRule.findMany({
            where: { isActive: true }
        })
    }

    /**
     * Busca todas as regras ativas de convênios
     */
    async getAllInsuranceRules() {
        return await prisma.insuranceRule.findMany({
            where: { isActive: true }
        })
    }

    /**
     * Busca todos os templates de resposta ativos
     */
    async getAllResponseTemplates() {
        return await prisma.responseRule.findMany({
            where: { isActive: true },
            orderBy: { priority: 'desc' }
        })
    }
}

export const ruleEngineService = new RuleEngineService()
