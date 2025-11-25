# 🔄 Sincronização de Dados da Clínica

## 📋 **Visão Geral**

Este documento explica como sincronizar os dados da clínica (procedimentos, convênios e coberturas) entre o arquivo `src/infor_clinic.txt` e o banco de dados do Railway.

## 🎯 **Objetivo**

Garantir que:
1. ✅ Todos os procedimentos estão cadastrados no banco
2. ✅ Todos os convênios estão cadastrados no banco
3. ✅ As coberturas (quais procedimentos cada convênio atende em cada unidade) estão corretas
4. ✅ O catálogo estático (`api/data/clinicData.ts`) está alinhado com o banco

## 📁 **Arquivos Envolvidos**

- `src/infor_clinic.txt` - **Fonte da verdade** (dados oficiais)
- `api/data/clinicData.ts` - Catálogo estático (deve ser atualizado)
- Banco de dados Railway - Dados dinâmicos (sincronizado via scripts)

## 🚀 **Scripts Disponíveis**

### **1. `sync_clinic_data_from_txt.ts`**

Sincroniza o banco de dados com o arquivo `src/infor_clinic.txt`.

**O que faz:**
- ✅ Cria/atualiza clínicas (Vieiralves e São José)
- ✅ Cria/atualiza procedimentos
- ✅ Cria/atualiza convênios
- ✅ Vincula convênios às clínicas
- ✅ Cria/atualiza coberturas (quais procedimentos cada convênio atende em cada unidade)
- ✅ Desativa procedimentos que não estão mais na lista

**Como executar:**

```bash
# Localmente (com DATABASE_URL apontando para Railway)
npx tsx scripts/sync_clinic_data_from_txt.ts

# Ou via Railway CLI
railway run npx tsx scripts/sync_clinic_data_from_txt.ts
```

### **2. `compare_bradesco_coverage.ts`**

Compara a cobertura do Bradesco entre o arquivo e o banco.

**O que faz:**
- ✅ Compara procedimentos esperados (do arquivo) vs procedimentos no banco
- ✅ Mostra diferenças (faltando, extras, correspondentes)
- ✅ Útil para verificar se a sincronização funcionou

**Como executar:**

```bash
npx tsx scripts/compare_bradesco_coverage.ts
```

## 📊 **Estrutura dos Dados**

### **Procedimentos Esperados por Convênio**

#### **BRADESCO - Vieiralves**
- Acupuntura
- Consulta com Ortopedista
- Fisioterapia Neurológica
- Fisioterapia Ortopédica
- Fisioterapia Pélvica
- Infiltração de ponto gatilho e Agulhamento a seco
- RPG

#### **BRADESCO - São José**
- Acupuntura
- Consulta com Ortopedista
- Fisioterapia Neurológica
- Fisioterapia Ortopédica
- Infiltração de ponto gatilho e Agulhamento a seco
- RPG

**Diferença:** São José **NÃO** atende Fisioterapia Pélvica.

## 🔍 **Verificação Manual**

### **1. Verificar no Banco de Dados**

```sql
-- Ver procedimentos do Bradesco na Vieiralves
SELECT 
  p.name as procedure_name,
  p.code as procedure_code,
  cip.is_active,
  cip.price
FROM "ClinicInsuranceProcedure" cip
JOIN "Procedure" p ON p.code = cip."procedureCode"
JOIN "Clinic" c ON c.id = cip."clinicId"
JOIN "InsuranceCompany" i ON i.code = cip."insuranceCode"
WHERE i.code = 'bradesco'
  AND c.code = 'vieiralves'
  AND cip.is_active = true
ORDER BY p.name;

-- Ver procedimentos do Bradesco na São José
SELECT 
  p.name as procedure_name,
  p.code as procedure_code,
  cip.is_active,
  cip.price
FROM "ClinicInsuranceProcedure" cip
JOIN "Procedure" p ON p.code = cip."procedureCode"
JOIN "Clinic" c ON c.id = cip."clinicId"
JOIN "InsuranceCompany" i ON i.code = cip."insuranceCode"
WHERE i.code = 'bradesco'
  AND c.code = 'sao-jose'
  AND cip.is_active = true
ORDER BY p.name;
```

### **2. Verificar via API**

```bash
# Listar procedimentos do Bradesco na Vieiralves
curl https://zorahapp2-production.up.railway.app/api/clinic/clinics/vieiralves/insurances/bradesco/procedures

# Listar procedimentos do Bradesco na São José
curl https://zorahapp2-production.up.railway.app/api/clinic/clinics/sao-jose/insurances/bradesco/procedures
```

## ⚠️ **Regras Importantes**

### **Procedimentos que NÃO são atendidos na São José:**

1. ❌ **Fisioterapia Pélvica** - Apenas Vieiralves
2. ❌ **Quiropraxia** - Apenas Vieiralves (FUSEX)
3. ❌ **Pilates** - Apenas Vieiralves

### **Mapeamento de Nomes**

O script usa um mapeamento para converter nomes do arquivo para códigos do banco:

```typescript
'Acupuntura' → 'acupuntura'
'Consulta com Ortopedista' → 'consulta-ortopedista'
'Fisioterapia Pélvica' → 'fisioterapia-pelvica'
'Infiltração de ponto gatilho e Agulhamento a seco' → 'infiltracao-ponto-gatilho'
```

## 🔄 **Fluxo de Sincronização**

```
1. Atualizar src/infor_clinic.txt (se necessário)
   ↓
2. Executar sync_clinic_data_from_txt.ts
   ↓
3. Verificar com compare_bradesco_coverage.ts
   ↓
4. Atualizar api/data/clinicData.ts (se necessário)
   ↓
5. Testar via API/Workflow
```

## 🐛 **Troubleshooting**

### **Erro: "Clinic not found"**
- Verifique se as clínicas foram criadas: `scripts/create_test_clinics.js`
- Ou execute o sync que cria automaticamente

### **Erro: "Procedure not found"**
- Verifique se o procedimento existe no banco
- O script cria procedimentos automaticamente se não existirem

### **Erro: "Insurance not found"**
- Verifique se o convênio foi criado
- Execute `/api/clinic/seed` primeiro se necessário

### **Procedimentos não aparecem**
- Verifique se `isActive = true` na tabela `ClinicInsuranceProcedure`
- Execute o script de sync novamente

## 📝 **Checklist de Sincronização**

- [ ] Arquivo `src/infor_clinic.txt` está atualizado
- [ ] Executado `sync_clinic_data_from_txt.ts`
- [ ] Executado `compare_bradesco_coverage.ts` e verificado diferenças
- [ ] Verificado via API que os dados estão corretos
- [ ] Testado workflow com dados reais
- [ ] Atualizado `api/data/clinicData.ts` se necessário

## 🔗 **Links Úteis**

- [Railway Dashboard](https://railway.app)
- [API Documentation](./API_DOCUMENTATION.md)
- [Workflow Editor](https://zorahapp2-production.up.railway.app/workflows/editor/cmibu88ho0000jizqbv1g3vj0)

---

**Última atualização:** 24/11/2025

