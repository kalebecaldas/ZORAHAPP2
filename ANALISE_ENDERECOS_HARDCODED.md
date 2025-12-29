# 🔍 ANÁLISE: Endereços Hardcoded

## ❌ Problema Identificado

O bot está respondendo com endereços HARDCODED ao invés de buscar do banco de dados.

**Resposta do bot:**
```
📍 **Vieiralves**
Endereço: Rua Vieiralves, 1230
Telefone: (92) 3234-5678
```

---

## 📊 Onde Está Hardcoded

### 1. ❌ `api/services/intelligentBot.ts` (linha 266)

```typescript
clinicData: {
    name: 'Clínica de Fisioterapia',
    address: 'Rua Vieiralves, 1230 - Manaus/AM',  // ❌ HARDCODED!
    phone: '(92) 3234-5678',                      // ❌ HARDCODED!
    procedures: await prismaClinicDataService.getProcedures() as any,
    insuranceCompanies: await prismaClinicDataService.getInsuranceCompanies() as any,
    locations: await prismaClinicDataService.getLocations() as any  // ✅ Busca do banco
}
```

**Problema:** Mesmo buscando `locations` do banco, o `address` e `phone` principais estão hardcoded!

---

### 2. ❌ `api/services/aiConfigurationService.ts` (linha 576)

```typescript
private formatClinicData(clinicData: any): string {
    if (!clinicData) {
        return `### Clínicas Disponíveis
- **Vieiralves**: Rua Vieiralves, 1230 - Manaus/AM     // ❌ HARDCODED!
- **São José**: Rua São José, 456 - Manaus/AM         // ❌ HARDCODED!

### Procedimentos Principais
- Fisioterapia Ortopédica, Neurológica, Respiratória, Pélvica
- Acupuntura
- RPG
- Pilates
- Quiropraxia
- Consultas com Ortopedista

### Convênios Aceitos
Bradesco, SulAmérica, Mediservice, Saúde Caixa, Petrobras, GEAP, e outros.`
    }
    // ...
}
```

**Problema:** Quando `clinicData` é null, retorna fallback HARDCODED!

---

### 3. ✅ Banco de Dados (Prisma Schema)

```prisma
model Clinic {
  id        String   @id @default(cuid())
  code      String   @unique
  name      String
  displayName String
  address   String        // ✅ Campo existe!
  neighborhood String
  city      String
  state     String
  zipCode   String
  phone     String        // ✅ Campo existe!
  email     String?
  openingHours Json
  coordinates Json?
  specialties Json
  parkingAvailable Boolean @default(false)
  accessibility Json
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Status:** ✅ Estrutura correta! Campos `address` e `phone` existem.

---

### 4. ✅ Função que Busca do Banco

**`api/services/prismaClinicDataService.ts`:**

```typescript
async getLocations() {
    const clinics = await prisma.clinic.findMany()
    return clinics.map(c => ({
        id: c.code,
        name: c.name,
        address: c.address,          // ✅ Busca do banco!
        neighborhood: c.neighborhood,
        phone: c.phone,              // ✅ Busca do banco!
        openingHours: typeof c.openingHours === 'string' ? JSON.parse(c.openingHours) : c.openingHours,
        mapUrl: '' // Add if available in schema
    }))
}

async getClinicByName(name: string) {
    const clinic = await prisma.clinic.findFirst({
        where: {
            OR: [
                { name: { contains: name, mode: 'insensitive' } },
                { displayName: { contains: name, mode: 'insensitive' } }
            ],
            isActive: true
        }
    })

    if (!clinic) return null

    return {
        id: clinic.code,
        name: clinic.name,
        displayName: clinic.displayName,
        address: clinic.address,     // ✅ Busca do banco!
        neighborhood: clinic.neighborhood,
        city: clinic.city,
        state: clinic.state,
        phone: clinic.phone,         // ✅ Busca do banco!
        // ...
    }
}
```

**Status:** ✅ Funções funcionam! O problema é onde são usadas.

---

## 🎯 Solução Necessária

### Opção 1: Remover Hardcoded e Usar Banco

**`intelligentBot.ts`:**
```typescript
// ANTES (❌):
clinicData: {
    name: 'Clínica de Fisioterapia',
    address: 'Rua Vieiralves, 1230 - Manaus/AM',
    phone: '(92) 3234-5678',
    // ...
}

// DEPOIS (✅):
const locations = await prismaClinicDataService.getLocations()
const mainLocation = locations[0] || { address: 'Endereço não cadastrado', phone: 'Telefone não cadastrado' }

clinicData: {
    name: 'Clínica IAAM',
    address: mainLocation.address,  // ✅ Do banco!
    phone: mainLocation.phone,      // ✅ Do banco!
    locations: locations,           // ✅ Todas as unidades
    // ...
}
```

---

### Opção 2: Usar Dados da Primeira Clínica Ativa

**`aiConfigurationService.ts`:**
```typescript
private async formatClinicData(clinicData: any): Promise<string> {
    if (!clinicData) {
        // Buscar do banco ao invés de hardcoded
        const { prismaClinicDataService } = await import('./prismaClinicDataService.js')
        const locations = await prismaClinicDataService.getLocations()
        
        const clinicsText = locations.map(loc => 
            `- **${loc.name}**: ${loc.address} - Tel: ${loc.phone}`
        ).join('\n')
        
        return `### Clínicas Disponíveis
${clinicsText}

### Procedimentos Principais
- Fisioterapia Ortopédica, Neurológica, Respiratória, Pélvica
- Acupuntura
- RPG
- Pilates
- Quiropraxia
- Consultas com Ortopedista

### Convênios Aceitos
Bradesco, SulAmérica, Mediservice, Saúde Caixa, Petrobras, GEAP, e outros.`
    }
    // ...
}
```

---

## 📋 Checklist de Implementação

- [ ] Remover hardcoded de `intelligentBot.ts` (linha 266-267)
- [ ] Remover hardcoded de `aiConfigurationService.ts` (linha 576-577)
- [ ] Verificar se existem clínicas cadastradas no banco
- [ ] Se não, rodar script de seed: `scripts/migrate_clinic_data_to_db.ts`
- [ ] Testar bot pedindo localização/endereço
- [ ] Confirmar que vem do banco

---

## 🔍 Como Verificar Dados no Banco

```typescript
// Em qualquer service:
const locations = await prismaClinicDataService.getLocations()
console.log('📍 Clínicas cadastradas:', locations)
```

**Resultado esperado:**
```javascript
[
  {
    id: 'vieiralves',
    name: 'Vieiralves',
    address: 'Rua Vieiralves, 1230',
    phone: '(92) 3234-5678',
    // ...
  },
  {
    id: 'saojose',
    name: 'São José',
    address: 'Rua São José, 456',
    phone: '(92) 99999-9999',
    // ...
  }
]
```

---

## ⚠️ Impacto

### Arquivos que precisam ser alterados:
1. ✅ `api/services/intelligentBot.ts`
2. ✅ `api/services/aiConfigurationService.ts`

### Arquivos que podem ter seed:
3. `scripts/migrate_clinic_data_to_db.ts` (já existe!)

---

## 🎉 Resultado Final

**ANTES:**
- ❌ Endereços hardcoded
- ❌ Impossível atualizar via UI
- ❌ Dados desatualizados

**DEPOIS:**
- ✅ Endereços do banco
- ✅ Editável via Settings
- ✅ Sempre atualizado
- ✅ Múltiplas clínicas suportadas

---

**Status:** 🔍 ANALISADO - Aguardando implementação  
**Prioridade:** 🔥 ALTA (dados desatualizados impactam usuário)  
**Complexidade:** ⭐⭐ MÉDIA (2 arquivos, lógica simples)
