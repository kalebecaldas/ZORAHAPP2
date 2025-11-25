# ✅ Resumo da Sincronização de Dados

## 📋 **O que foi feito**

### **1. Scripts Criados**

✅ **`scripts/sync_clinic_data_from_txt.ts`**
- Sincroniza banco de dados com `src/infor_clinic.txt`
- Cria/atualiza clínicas, procedimentos, convênios e coberturas
- Respeita diferenças entre unidades (Vieiralves vs São José)

✅ **`scripts/compare_bradesco_coverage.ts`**
- Compara cobertura do Bradesco entre arquivo e banco
- Mostra diferenças (faltando, extras, correspondentes)

### **2. Documentação Criada**

✅ **`scripts/CLINIC_DATA_SYNC.md`**
- Documentação completa dos scripts
- Estrutura dos dados
- Troubleshooting

✅ **`DATABASE_SYNC_INSTRUCTIONS.md`**
- Instruções passo a passo para sincronizar
- Checklist de verificação

## 🎯 **Próximos Passos**

### **1. Executar Sincronização**

**Opção A: Via Endpoint HTTP (RECOMENDADO)** ✅

```bash
# 1. Fazer login
curl -X POST https://zorahapp2-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "seu-email", "password": "sua-senha"}'

# 2. Executar sincronização (use o token retornado)
curl -X POST https://zorahapp2-production.up.railway.app/api/clinic/sync-from-txt \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

**Opção B: Via Railway CLI**

```bash
railway run npx tsx scripts/sync_clinic_data_from_txt.ts
```

**Opção C: Via Terminal Local**

```bash
# Se DATABASE_URL apontar para Railway
export DATABASE_URL="postgresql://..."
npx tsx scripts/sync_clinic_data_from_txt.ts
```

📖 **Ver guia completo:** [HOW_TO_SYNC_RAILWAY.md](./HOW_TO_SYNC_RAILWAY.md)

### **2. Verificar Resultado**

```bash
# Comparar Bradesco
npx tsx scripts/compare_bradesco_coverage.ts

# Verificar via API
curl https://zorahapp2-production.up.railway.app/api/clinic/clinics/vieiralves/insurances/bradesco/procedures | jq
```

### **3. Testar Workflow**

1. Acesse: https://zorahapp2-production.up.railway.app/workflows/editor/cmibu88ho0000jizqbv1g3vj0
2. Teste o fluxo completo
3. Verifique se os procedimentos corretos aparecem

## ✅ **Verificações Esperadas**

### **BRADESCO - Vieiralves**
- ✅ Acupuntura
- ✅ Consulta com Ortopedista
- ✅ Fisioterapia Neurológica
- ✅ Fisioterapia Ortopédica
- ✅ Fisioterapia Pélvica
- ✅ Infiltração de ponto gatilho e Agulhamento a seco
- ✅ RPG

### **BRADESCO - São José**
- ✅ Acupuntura
- ✅ Consulta com Ortopedista
- ✅ Fisioterapia Neurológica
- ✅ Fisioterapia Ortopédica
- ❌ **NÃO** deve ter Fisioterapia Pélvica
- ✅ Infiltração de ponto gatilho e Agulhamento a seco
- ✅ RPG

## 🔍 **Workflow - Status**

✅ **Workflow está configurado corretamente:**
- Usa endpoints `get_clinic_procedures`, `get_clinic_insurances`, `get_clinic_location`
- Busca dados diretamente do banco de dados
- Respeita a clínica selecionada (`selectedClinic`)
- Retorna ao `gpt_classifier` após responder (permite follow-up questions)

## 📊 **Estrutura de Dados**

### **Banco de Dados**
- `Clinic` - Clínicas (Vieiralves, São José)
- `Procedure` - Procedimentos disponíveis
- `InsuranceCompany` - Convênios
- `ClinicInsurance` - Vincula convênios às clínicas
- `ClinicInsuranceProcedure` - **Coberturas** (quais procedimentos cada convênio atende em cada unidade)

### **Arquivo Fonte**
- `src/infor_clinic.txt` - **Fonte da verdade** com todos os dados oficiais

## ⚠️ **Importante**

### **Procedimentos que NÃO são atendidos na São José:**
1. ❌ **Fisioterapia Pélvica** - Apenas Vieiralves
2. ❌ **Quiropraxia** - Apenas Vieiralves (FUSEX)
3. ❌ **Pilates** - Apenas Vieiralves

O script automaticamente respeita essas diferenças.

## 🔗 **Links Úteis**

- [Instruções de Sincronização](./DATABASE_SYNC_INSTRUCTIONS.md)
- [Documentação Completa](./scripts/CLINIC_DATA_SYNC.md)
- [Workflow Editor](https://zorahapp2-production.up.railway.app/workflows/editor/cmibu88ho0000jizqbv1g3vj0)

---

**Status:** ✅ Scripts criados e documentação completa  
**Próximo passo:** Executar sincronização no Railway  
**Data:** 24/11/2025

