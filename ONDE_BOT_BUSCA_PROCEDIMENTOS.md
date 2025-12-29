# 📍 ONDE O BOT BUSCA INFORMAÇÕES DE PROCEDIMENTOS

## 🔍 FLUXO COMPLETO

### 1. **FONTE DOS DADOS (Banco de Dados)**

**Arquivo:** `api/services/prismaClinicDataService.ts`

#### Funções principais:

**`getProceduresByClinic(clinicCode)`** - Linha 276
```typescript
// Busca procedimentos de uma clínica específica com preços PARTICULARES
// Retorna: name, price, packages, requiresEvaluation, etc.
```

**`getProcedures()`** - Linha 4
```typescript
// Busca TODOS os procedimentos (sem filtro de clínica)
// Retorna: basePrice, packages, requiresEvaluation, etc.
```

**`calculatePrice(procedureCode, insuranceCode, locationCode)`** - Linha 96
```typescript
// Calcula preço específico para clínica + convênio + procedimento
// Busca em: ClinicInsuranceProcedure (tabela de preços)
```

---

### 2. **FORMATAÇÃO PARA O GPT**

**Arquivo:** `api/services/aiConfigurationService.ts`

#### Função: `formatClinicData()` - Linha 287

**Esta é a função que formata os dados para o GPT!**

```typescript
// Linha 338-350
clinicData.procedures.map((p: any) => {
    let info = `- **${p.name}**: R$ ${p.price}`

    // Adicionar pacotes se existirem
    if (p.packages && p.packages.length > 0) {
        info += `\n  📦 **Pacotes disponíveis:**`
        p.packages.forEach((pkg: any) => {
            info += `\n    • ${pkg.name}: R$ ${pkg.price} (${pkg.sessions} sessões) - ${pkg.description}`
        })
    }

    return info
}).join('\n')
```

**O que aparece no prompt do GPT:**
```
### Procedimentos Disponíveis
- **Acupuntura**: R$ 180
  📦 **Pacotes disponíveis:**
    • Pacote 10 sessões: R$ 1.600 (10 sessões) - avaliação GRÁTIS + economia de R$ 400!
```

---

### 3. **ONDE O GPT USA ESSAS INFORMAÇÕES**

**Arquivo:** `api/services/aiConfigurationService.ts`

#### Função: `buildDynamicPrompt()` - Linha 41

**O prompt completo inclui:**
- Contexto do paciente
- Conversa atual
- **Conhecimento da clínica** ← Aqui estão os procedimentos formatados
- Regras de transferência
- Exemplos

**Linha 179:**
```typescript
## CONHECIMENTO DA CLÍNICA
${await this.formatClinicData(clinicData)}
```

---

## 🎯 ONDE ADICIONAR REGRAS ESPECÍFICAS

### **OPÇÃO 1: Modificar `formatClinicData()` (Recomendado)**

**Arquivo:** `api/services/aiConfigurationService.ts` - Linha 287

**Adicionar regras específicas por procedimento:**

```typescript
private async formatClinicData(clinicData: any): Promise<string> {
    // ... código existente ...
    
    return `### Clínica Selecionada: ${clinicData.name}
Endereço: ${clinicData.address}
Telefone: ${clinicData.phone}

### Procedimentos Disponíveis
${clinicData.procedures.map((p: any) => {
    let info = `- **${p.name}**: R$ ${p.price}`

    // ✅ ADICIONAR REGRAS ESPECÍFICAS AQUI
    if (p.name.toLowerCase().includes('acupuntura')) {
        info += `\n  ⚠️ **REGRA ESPECIAL:** Para acupuntura, a avaliação é obrigatória e custa R$ 200.`
        info += `\n  ⚠️ **REGRA ESPECIAL:** Se comprar pacote de 10 sessões, a avaliação sai GRÁTIS.`
    }
    
    if (p.name.toLowerCase().includes('fisioterapia pélvica')) {
        info += `\n  ⚠️ **REGRA ESPECIAL:** Requer avaliação prévia obrigatória.`
    }

    // Adicionar pacotes se existirem
    if (p.packages && p.packages.length > 0) {
        info += `\n  📦 **Pacotes disponíveis:**`
        p.packages.forEach((pkg: any) => {
            info += `\n    • ${pkg.name}: R$ ${pkg.price} (${pkg.sessions} sessões)`
            
            // ✅ REGRAS ESPECÍFICAS PARA PACOTES
            if (p.name.toLowerCase().includes('acupuntura') && pkg.sessions === 10) {
                info += ` - avaliação GRÁTIS + economia de R$ 400!`
            }
        })
    }

    return info
}).join('\n')}\n
```

---

### **OPÇÃO 2: Adicionar no System Prompt**

**Arquivo:** `api/services/aiConfigurationService.ts` - Linha 102

**Adicionar seção de regras específicas:**

```typescript
## ⚠️ REGRAS ESPECÍFICAS POR PROCEDIMENTO

### Acupuntura:
- Avaliação obrigatória: R$ 200
- Sessão avulsa: R$ 180
- Pacote 10 sessões: R$ 1.600 (avaliação GRÁTIS)
- **IMPORTANTE:** Sempre mencione que a avaliação é obrigatória antes da primeira sessão

### Fisioterapia Pélvica:
- Avaliação obrigatória: R$ 250
- **IMPORTANTE:** Sempre mencione que requer avaliação prévia

### Outros procedimentos:
- Seguir valores padrão do banco de dados
```

---

### **OPÇÃO 3: Criar arquivo de configuração separado**

**Criar:** `api/config/procedureRules.ts`

```typescript
export const procedureRules = {
    'acupuntura': {
        requiresEvaluation: true,
        evaluationPrice: 200,
        sessionPrice: 180,
        packageRules: {
            10: {
                price: 1600,
                includesEvaluation: true,
                description: 'avaliação GRÁTIS + economia de R$ 400!'
            }
        },
        specialInstructions: 'Para acupuntura, a avaliação é obrigatória antes da primeira sessão.'
    },
    'fisioterapia pélvica': {
        requiresEvaluation: true,
        evaluationPrice: 250,
        specialInstructions: 'Requer avaliação prévia obrigatória.'
    }
}
```

**E usar em `formatClinicData()`:**

```typescript
import { procedureRules } from '../config/procedureRules.js'

// No map dos procedimentos:
if (procedureRules[p.name.toLowerCase()]) {
    const rules = procedureRules[p.name.toLowerCase()]
    info += `\n  ⚠️ **${rules.specialInstructions}**`
    if (rules.requiresEvaluation) {
        info += `\n  💰 Avaliação: R$ ${rules.evaluationPrice}`
    }
}
```

---

## 📊 ESTRUTURA DOS DADOS NO BANCO

### Tabela: `Procedure`
- `code` - Código único
- `name` - Nome do procedimento
- `basePrice` - Preço base
- `requiresEvaluation` - Se requer avaliação

### Tabela: `ClinicInsuranceProcedure`
- `clinicId` - ID da clínica
- `insuranceCode` - Código do convênio ('PARTICULAR', 'BRADESCO', etc.)
- `procedureCode` - Código do procedimento
- `price` - Preço específico
- `hasPackage` - Se tem pacotes
- `packageInfo` - JSON com informações dos pacotes

**Exemplo de `packageInfo`:**
```json
[
  {
    "name": "Pacote 10 sessões",
    "price": 1600,
    "sessions": 10,
    "description": "avaliação GRÁTIS + economia de R$ 400!"
  }
]
```

---

## 🎯 RECOMENDAÇÃO

**Para adicionar regras específicas por procedimento:**

1. **Modifique `formatClinicData()`** em `api/services/aiConfigurationService.ts`
2. **Adicione lógica condicional** baseada no nome do procedimento
3. **Inclua as regras diretamente no texto formatado** que vai para o GPT

**Exemplo prático:**

```typescript
// Linha 338-350 em aiConfigurationService.ts
clinicData.procedures.map((p: any) => {
    let info = `- **${p.name}**: R$ ${p.price}`
    
    const procName = p.name.toLowerCase()
    
    // ✅ REGRAS ESPECÍFICAS PARA ACUPUNTURA
    if (procName.includes('acupuntura')) {
        info += `\n  💰 **Avaliação:** R$ 200 (obrigatória)`
        info += `\n  💰 **Sessão avulsa:** R$ 180`
        info += `\n  ⚠️ **IMPORTANTE:** A avaliação é obrigatória antes da primeira sessão.`
    }
    
    // ✅ REGRAS ESPECÍFICAS PARA FISIOTERAPIA PÉLVICA
    if (procName.includes('fisioterapia pélvica') || procName.includes('pelvica')) {
        info += `\n  💰 **Avaliação:** R$ 250 (obrigatória)`
        info += `\n  ⚠️ **IMPORTANTE:** Requer avaliação prévia obrigatória.`
    }

    // Adicionar pacotes
    if (p.packages && p.packages.length > 0) {
        info += `\n  📦 **Pacotes disponíveis:**`
        p.packages.forEach((pkg: any) => {
            info += `\n    • ${pkg.name}: R$ ${pkg.price} (${pkg.sessions} sessões)`
            
            // Regras específicas para pacotes de acupuntura
            if (procName.includes('acupuntura') && pkg.sessions === 10) {
                info += ` - avaliação GRÁTIS + economia de R$ 400!`
            }
        })
    }

    return info
}).join('\n')
```

---

## ✅ PRÓXIMOS PASSOS

1. **Identifique quais procedimentos** precisam de regras especiais
2. **Decida os valores** de avaliação e sessões
3. **Modifique `formatClinicData()`** com as regras
4. **Teste** com mensagens reais
5. **Ajuste** conforme necessário

**Quer que eu implemente essas regras específicas agora?** 🚀
