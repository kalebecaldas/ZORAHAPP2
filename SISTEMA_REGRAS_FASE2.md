# Sistema de Regras do Bot - Fase 2 Concluída

## ✅ O que foi implementado

### 1. RuleEngineService (`api/services/ruleEngineService.ts`)

Serviço completo para gerenciar e aplicar regras de resposta do bot.

#### Funcionalidades:

**Busca de Regras:**
- `getProcedureRule(code)` - Busca regras específicas de procedimento
- `getInsuranceRule(code)` - Busca regras específicas de convênio
- `getResponseTemplate(intent, context, targetType, targetId)` - Busca templates de resposta com priorização

**Formatação de Dados:**
- `formatProcedureInfo(procedureData)` - Formata informações de procedimento aplicando regras
- `formatInsuranceGreeting(code, name)` - Formata saudação customizada por convênio
- `shouldShowInsuranceValues(code)` - Verifica se deve mostrar valores para convênio
- `canShowDiscount(code)` - Verifica se pode mostrar desconto

**Renderização de Templates:**
- `renderTemplate(template, variables)` - Sistema completo de templates com:
  - Variáveis simples: `{variavel}`
  - Condicionais: `{if condition}...{endif}`
  - Loops: `{foreach array}...{endforeach}`

**Busca em Massa:**
- `getAllProcedureRules()` - Lista todas as regras de procedimentos
- `getAllInsuranceRules()` - Lista todas as regras de convênios
- `getAllResponseTemplates()` - Lista todos os templates de resposta

### 2. Integração com AIConfigurationService

O `aiConfigurationService` agora usa o `ruleEngineService` para formatar procedimentos:

```typescript
private async formatProceduresWithRules(procedures: any[]): Promise<string> {
    const { ruleEngineService } = await import('./ruleEngineService.js')
    
    const formattedProcedures = await Promise.all(
        procedures.map(async (p: any) => {
            return await ruleEngineService.formatProcedureInfo(p)
        })
    )
    
    return formattedProcedures.map(info => `- ${info}`).join('\n')
}
```

**Benefícios:**
- Procedimentos são formatados dinamicamente com base nas regras do banco
- Mensagens customizadas por procedimento
- Destaque automático de avaliação e pacotes
- Informação de "Avaliação GRÁTIS" em pacotes qualificados

### 3. Sistema de Templates

#### Variáveis Simples
```
Template: "Olá {nome}! Para {procedimento}, o valor é R$ {preco}."
Resultado: "Olá João! Para Pilates, o valor é R$ 150."
```

#### Condicionais
```
Template: 
"Preço: R$ {preco}
{if hasDiscount}
✨ Desconto especial disponível!
{endif}"

Com desconto: "Preço: R$ 150\n✨ Desconto especial disponível!"
Sem desconto: "Preço: R$ 150"
```

#### Loops
```
Template:
"Pacotes disponíveis:
{foreach packages}
• {packages.name}: R$ {packages.price}
{endforeach}"

Resultado:
"Pacotes disponíveis:
• Pacote 5 sessões: R$ 750
• Pacote 10 sessões: R$ 1400"
```

## 📊 Testes Realizados

Todos os 10 testes passaram com sucesso:

1. ✅ Busca de regra de Acupuntura
2. ✅ Formatação de informações de Acupuntura
3. ✅ Busca de regra de Bradesco
4. ✅ Formatação de saudação para Bradesco
5. ✅ Busca de template para VALOR_PARTICULAR
6. ✅ Renderização de template com variáveis
7. ✅ Renderização com condicionais
8. ✅ Renderização com loops
9. ✅ Verificação de exibição de valores
10. ✅ Estatísticas gerais

## 🎯 Exemplo Real de Uso

### Antes (hardcoded):
```
- **Acupuntura**: R$ 180
  📦 Pacotes disponíveis:
    • Pacote 10 sessões: R$ 1600 (10 sessões) - Economia de R$ 400
```

### Depois (com regras):
```
A acupuntura é excelente para várias condições.

• **Avaliação**: R$ 200 (obrigatória)
• **Sessão avulsa**: R$ 180

📦 **Pacotes disponíveis:**
• Pacote 10 sessões: R$ 1600 (10 sessões) - **Avaliação GRÁTIS** - Economia de R$ 400
```

## 🔧 Como Usar

### Buscar e formatar procedimento:
```typescript
import { ruleEngineService } from './api/services/ruleEngineService.js'

const info = await ruleEngineService.formatProcedureInfo({
    code: 'ACUPUNTURA',
    name: 'Acupuntura',
    price: 180,
    packages: [...]
})
```

### Buscar template de resposta:
```typescript
const template = await ruleEngineService.getResponseTemplate(
    'VALOR_PARTICULAR',
    'procedimento',
    'procedure'
)
```

### Renderizar template:
```typescript
const rendered = ruleEngineService.renderTemplate(
    template.template,
    {
        procedimento: 'Acupuntura',
        preco: 180,
        requiresEvaluation: true,
        evaluationPrice: 200,
        hasPackages: true,
        packages: [...]
    }
)
```

## 📈 Estatísticas do Sistema

- **16 Regras de Procedimentos** - Uma para cada procedimento no banco
- **29 Regras de Convênios** - Uma para cada convênio no banco
- **6 Templates de Resposta** - Cobrindo todas as intenções principais

## 🚀 Próximos Passos (Fase 3)

1. **API Endpoints** - Criar endpoints REST para CRUD de regras:
   - `GET /api/rules/procedures` - Listar regras de procedimentos
   - `PUT /api/rules/procedures/:code` - Atualizar regra de procedimento
   - `GET /api/rules/insurances` - Listar regras de convênios
   - `PUT /api/rules/insurances/:code` - Atualizar regra de convênio
   - `GET /api/rules/templates` - Listar templates de resposta
   - `POST /api/rules/templates` - Criar novo template
   - `PUT /api/rules/templates/:id` - Atualizar template
   - `DELETE /api/rules/templates/:id` - Deletar template

2. **Interface Frontend (Fase 4)** - Nova aba "Regras & Templates":
   - Listar e editar regras de procedimentos
   - Listar e editar regras de convênios
   - Gerenciar templates de resposta
   - Preview de como cada regra afeta as respostas do bot

## 📝 Arquivos Criados/Modificados

### Criados:
- `api/services/ruleEngineService.ts` - Serviço principal
- `scripts/test_rule_engine.ts` - Script de testes
- `SISTEMA_REGRAS_FASE2.md` - Esta documentação

### Modificados:
- `api/services/aiConfigurationService.ts` - Integração com ruleEngineService

## 🎉 Status

**Fase 2: Backend Service - ✅ CONCLUÍDA**

O sistema está totalmente funcional e integrado com o bot. As regras são aplicadas automaticamente na formatação dos dados da clínica para o prompt do GPT.
