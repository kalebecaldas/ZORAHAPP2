import OpenAI from 'openai'
import prisma from '../prisma/client.js'

/**
 * Serviço de Memória de Longo Prazo
 * Extrai e armazena fatos importantes sobre o paciente
 */
export class MemoryService {
    private openai: OpenAI

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            timeout: 30000
        })
    }

    /**
     * Extrai memórias importantes de uma conversa usando IA
     */
    async extractMemories(
        conversationId: string,
        phone: string,
        recentMessages: string[]
    ): Promise<any> {
        // Criar prompt específico para extração de memórias
        const conversationText = recentMessages.join('\n')

        const extractionPrompt = `Analise a conversa abaixo e extraia APENAS fatos importantes de longo prazo sobre o paciente.

IMPORTANTE: Extraia APENAS informações que devem ser lembradas em futuras conversas.

Exemplos de fatos relevantes:
- Nome do paciente
- CPF (apenas números)
- Email
- Data de nascimento (formato DD/MM/AAAA)
- Convênio médico
- Número da carteirinha do convênio
- Condições médicas/dores mencionadas
- Preferências (horário, local, tipo de tratamento)
- Objetivos do paciente
- Histórico relevante

Exemplos de coisas que NÃO são memórias de longo prazo:
- "quer agendar" (é intenção temporária)
- "disse oi" (não é relevante)
- "perguntou o preço" (não é um fato sobre o paciente)

Conversa:
${conversationText}

Retorne em JSON neste formato EXATO:
{
  "has_memories": true/false,
  "memories": {
    "nome": "...",
    "cpf": "...",
    "email": "...",
    "nascimento": "DD/MM/AAAA",
    "convenio": "...",
    "numero_convenio": "...",
    "condicoes": ["..."],
    "preferencias": {...},
    "fatos_importantes": ["..."]
  }
}

Se não houver memórias relevantes, retorne { "has_memories": false }`

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [{
                    role: 'system',
                    content: 'Você é um extrator de memórias. Retorne APENAS JSON válido.'
                }, {
                    role: 'user',
                    content: extractionPrompt
                }],
                response_format: { type: 'json_object' },
                temperature: 0.3 // Baixa temperatura para ser mais preciso
            })

            const result = JSON.parse(response.choices[0].message.content!)

            if (result.has_memories) {
                console.log(`🧠 Memórias extraídas para ${phone}:`, result.memories)
                await this.saveMemories(phone, result.memories)
            }

            return result

        } catch (error) {
            console.error('Erro ao extrair memórias:', error)
            return { has_memories: false }
        }
    }

    /**
     * Salva memórias no campo preferences do Patient
     */
    async saveMemories(phone: string, newMemories: any): Promise<void> {
        try {
            // Helper para parsear data DD/MM/AAAA
            const parseDate = (dateStr: string): Date | undefined => {
                if (!dateStr) return undefined;
                const [day, month, year] = dateStr.split('/');
                if (!day || !month || !year) return undefined;
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            };

            // Buscar paciente
            let patient = await prisma.patient.findUnique({
                where: { phone }
            });

            if (!patient) {
                // Criar paciente se não existir
                patient = await prisma.patient.create({
                    data: {
                        phone,
                        name: newMemories.nome || 'Aguardando cadastro',
                        cpf: newMemories.cpf || null,
                        email: newMemories.email || null,
                        birthDate: newMemories.nascimento ? parseDate(newMemories.nascimento) : null,
                        insuranceCompany: newMemories.convenio || null,
                        insuranceNumber: newMemories.numero_convenio || null,
                        preferences: { memories: newMemories }
                    }
                });
                console.log(`✅ Paciente criado com dados completos: ${patient.id}`);
            } else {
                // Mesclar memórias existentes com novas
                const existingPrefs = (patient.preferences as any) || {};
                const existingMemories = existingPrefs.memories || {};

                const mergedMemories = {
                    ...existingMemories,
                    ...newMemories,
                    // Mesclar arrays sem duplicar
                    condicoes: [
                        ...(existingMemories.condicoes || []),
                        ...(newMemories.condicoes || [])
                    ].filter((v, i, a) => a.indexOf(v) === i),
                    fatos_importantes: [
                        ...(existingMemories.fatos_impor_tantes || []),
                        ...(newMemories.fatos_importantes || [])
                    ].filter((v, i, a) => a.indexOf(v) === i),
                    ultima_atualizacao: new Date().toISOString()
                };

                // ✅ ATUALIZAR CAMPOS CORRETOS DO PATIENT
                await prisma.patient.update({
                    where: { id: patient.id },
                    data: {
                        name: newMemories.nome || patient.name,
                        cpf: newMemories.cpf || patient.cpf,
                        email: newMemories.email || patient.email,
                        birthDate: newMemories.nascimento ? parseDate(newMemories.nascimento) : patient.birthDate,
                        insuranceCompany: newMemories.convenio || patient.insuranceCompany,
                        insuranceNumber: newMemories.numero_convenio || patient.insuranceNumber,
                        preferences: {
                            ...existingPrefs,
                            memories: mergedMemories
                        }
                    }
                });

                console.log(`✅ Paciente atualizado com dados completos: ${phone}`);
                console.log(`   - Nome: ${newMemories.nome || patient.name}`);
                console.log(`   - CPF: ${newMemories.cpf || patient.cpf || 'não informado'}`);
                console.log(`   - Email: ${newMemories.email || patient.email || 'não informado'}`);
            }

        } catch (error) {
            console.error('Erro ao salvar memórias:', error);
        }
    }

    /**
     * Busca memórias de um paciente
     */
    async getMemories(phone: string): Promise<any> {
        try {
            const patient = await prisma.patient.findUnique({
                where: { phone }
            })

            if (!patient || !patient.preferences) {
                return null
            }

            const prefs = patient.preferences as any
            return prefs.memories || null

        } catch (error) {
            console.error('Erro ao buscar memórias:', error)
            return null
        }
    }

    /**
     * Formata memórias para incluir no prompt da IA
     */
    formatMemoriesForPrompt(memories: any): string {
        if (!memories) {
            return ''
        }

        let text = '\n## 🧠 MEMÓRIAS DE LONGO PRAZO\n'
        text += 'O que você já sabe sobre este paciente:\n\n'

        if (memories.nome) {
            text += `**Nome:** ${memories.nome}\n`
        }

        if (memories.condicoes && memories.condicoes.length > 0) {
            text += `**Condições/Dores:** ${memories.condicoes.join(', ')}\n`
        }

        if (memories.preferencias) {
            text += `**Preferências:**\n`
            Object.entries(memories.preferencias).forEach(([key, value]) => {
                text += `  - ${key}: ${value}\n`
            })
        }

        if (memories.fatos_importantes && memories.fatos_importantes.length > 0) {
            text += `**Fatos Importantes:**\n`
            memories.fatos_importantes.forEach((fato: string) => {
                text += `  - ${fato}\n`
            })
        }

        text += '\n**IMPORTANTE:** Use essas informações naturalmente na conversa quando relevante. Não repita tudo de volta!\n'

        return text
    }
}

// Exportar singleton
export const memoryService = new MemoryService()
