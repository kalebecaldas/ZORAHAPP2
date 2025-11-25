# Integração GPT com clinicData.ts

## Visão Geral

O sistema agora usa diretamente o arquivo `clinicData.ts` para fornecer contexto completo ao GPT, garantindo respostas precisas, completas e contextualizadas sobre procedimentos, convênios, valores e localização.

## Arquitetura Implementada

### 1. Utilitário de Formatação (`clinicDataFormatter.ts`)

Criado em `src/services/workflow/utils/clinicDataFormatter.ts` com funções especializadas:

- **`formatClinicDataForGPT(clinicCode?)`**: Formata TODOS os dados da clínica em um texto estruturado para o GPT
- **`getProcedureInfoForGPT(procedureName, clinicCode?)`**: Retorna informações detalhadas de um procedimento específico
- **`getInsuranceInfoForGPT(insuranceName?)`**: Retorna informações sobre convênios
- **`getLocationInfoForGPT(clinicCode?)`**: Retorna informações de localização e horários

### 2. Integração nos Executors

#### `apiCallExecutor.ts`
- **Fallback automático**: Se a API não retornar dados, usa `clinicData.ts` diretamente
- **Detecção inteligente**: Identifica quando o usuário pergunta sobre procedimentos específicos
- **Respostas completas**: Retorna informações detalhadas (valor, duração, pacotes, avaliação)

#### `gptExecutor.ts` (Classificador)
- **Contexto enriquecido**: Inclui dados do `clinicData.ts` no prompt do classificador
- **Melhor classificação**: GPT tem mais contexto para classificar intenções corretamente

### 3. Novo Executor GPT de Respostas (`gptResponseExecutor.ts`)

Criado executor especializado que:
- Usa `clinicData.ts` diretamente para gerar respostas completas
- Detecta automaticamente o que o usuário está perguntando (procedimento, convênio, localização)
- Gera respostas naturais e completas usando todos os dados disponíveis

## Como Funciona Atualmente

### Fluxo de Valores

1. **Usuário pergunta**: "qual valor da acupuntura?"
2. **GPT Classifier** (porta 1) → detecta intenção de valores
3. **API_CALL node** (`get_clinic_procedures`):
   - Tenta buscar da API primeiro
   - Se não encontrar, usa `getProcedureInfoForGPT('acupuntura')` do `clinicData.ts`
   - Retorna resposta completa com:
     - Valor particular
     - Duração
     - Se requer avaliação
     - Pacotes disponíveis
     - Convênios aceitos

### Fluxo de Convênios

1. **Usuário pergunta**: "vocês aceitam Bradesco?"
2. **GPT Classifier** (porta 2) → detecta intenção de convênios
3. **API_CALL node** (`get_clinic_insurances`):
   - Tenta buscar da API
   - Fallback para `getInsuranceInfoForGPT('bradesco')` do `clinicData.ts`
   - Retorna resposta completa sobre o convênio

### Fluxo de Localização

1. **Usuário pergunta**: "onde fica a clínica?"
2. **GPT Classifier** (porta 3) → detecta intenção de localização
3. **API_CALL node** (`get_clinic_location`):
   - Tenta buscar da API
   - Fallback para `getLocationInfoForGPT(clinicCode)` do `clinicData.ts`
   - Retorna endereço, telefone, horários, maps

## Melhorias Implementadas

### ✅ Respostas Completas
- GPT agora tem acesso a TODOS os dados do `clinicData.ts`
- Respostas incluem informações completas (não apenas valores básicos)
- Contexto sobre avaliações, pacotes, convênios

### ✅ Fallback Inteligente
- Se API falhar, usa `clinicData.ts` automaticamente
- Sistema nunca fica sem dados para responder

### ✅ Detecção de Procedimentos Específicos
- Identifica quando usuário pergunta sobre procedimento específico
- Retorna informações detalhadas do procedimento

### ✅ Interpolação de Placeholders
- Placeholders `${endereco}`, `${telefone}`, etc. agora funcionam corretamente
- Usa dados do `clinicData.ts` quando necessário

## Como Melhorar Ainda Mais

### Opção 1: Usar GPT para Gerar Respostas Completas (Recomendado)

Criar um novo tipo de node `GPT_RESPONSE_COMPLETE` que:
- Recebe a intenção classificada
- Usa `formatClinicDataForGPT()` para fornecer contexto completo
- GPT gera resposta natural e completa usando todos os dados

**Vantagens:**
- Respostas mais naturais e conversacionais
- GPT pode combinar múltiplas informações (ex: "acupuntura com Bradesco")
- Respostas adaptadas ao contexto da conversa

**Implementação:**
```typescript
// No gptResponseExecutor.ts
const clinicContext = formatClinicDataForGPT(clinicCode);
const systemPrompt = `Você é assistente da clínica. Use APENAS os dados abaixo:

${clinicContext}

Gere uma resposta completa, natural e útil sobre: [intenção detectada]`;
```

### Opção 2: Melhorar Prompts dos API_CALL Nodes

Adicionar mais contexto ao GPT antes de chamar API:
- Incluir dados do `clinicData.ts` no prompt
- GPT pode sugerir informações adicionais relevantes

### Opção 3: Cache de Respostas GPT

Para perguntas comuns, cachear respostas do GPT:
- "qual valor da acupuntura?" → resposta em cache
- Reduz custos e melhora performance

## Estrutura de Dados do clinicData.ts

O sistema espera a seguinte estrutura:

```typescript
{
  name: string,
  specialties: string[],
  businessHours: { weekdays, saturday, sunday },
  insurance: string[],
  insuranceCompanies: Array<{ id, name, description }>,
  procedures: Array<{
    id, name, description, duration, price, 
    evaluationPrice, requiresEvaluation,
    availableUnits, packages
  }>,
  locations: Array<{ id, name, address, phone }>
}
```

## Próximos Passos Sugeridos

1. **Testar respostas completas**: Verificar se todas as informações estão sendo retornadas corretamente
2. **Adicionar mais contexto**: Incluir informações sobre pacotes, descontos, avaliações
3. **Melhorar detecção**: Expandir keywords para detectar mais variações de perguntas
4. **Otimizar prompts**: Ajustar prompts do GPT para gerar respostas ainda melhores
5. **Adicionar exemplos**: Incluir exemplos de respostas no prompt do GPT

## Exemplo de Uso

```typescript
// No executor, quando usuário pergunta sobre acupuntura:
const procedureInfo = getProcedureInfoForGPT('acupuntura', 'vieiralves');
// Retorna:
// 💉 **Acupuntura**
// 📝 Descrição: Técnica milenar com agulhas...
// ⏱️ Duração: 30 minutos
// 💰 Valor (Particular): R$ 150.00
// 📋 Avaliação: R$ 250.00
// ⚠️ Requer avaliação prévia
// ...
```

