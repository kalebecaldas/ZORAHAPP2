# 📋 Instruções para Sincronizar Banco de Dados

## 🎯 **Objetivo**

Sincronizar o banco de dados do Railway com os dados oficiais do arquivo `src/infor_clinic.txt`, garantindo que:
- ✅ Procedimentos estão corretos
- ✅ Convênios estão corretos  
- ✅ Coberturas (quais procedimentos cada convênio atende) estão corretas
- ✅ Diferenças entre unidades (Vieiralves vs São José) estão respeitadas

## 🚀 **Passo a Passo**

### **1. Verificar Ambiente**

Certifique-se de que a variável `DATABASE_URL` está configurada apontando para o banco do Railway:

```bash
# Verificar se está configurada
echo $DATABASE_URL

# Ou no Railway
railway variables
```

### **2. Comparar Estado Atual (Opcional)**

Antes de sincronizar, você pode comparar o que está no banco vs o que deveria estar:

```bash
npx tsx scripts/compare_bradesco_coverage.ts
```

Isso mostrará diferenças para o convênio Bradesco (exemplo).

### **3. Sincronizar Dados**

Execute o script de sincronização:

```bash
# Localmente (se DATABASE_URL apontar para Railway)
npx tsx scripts/sync_clinic_data_from_txt.ts

# OU via Railway CLI
railway run npx tsx scripts/sync_clinic_data_from_txt.ts
```

O script irá:
- ✅ Criar/atualizar clínicas (Vieiralves e São José)
- ✅ Criar/atualizar procedimentos
- ✅ Criar/atualizar convênios
- ✅ Vincular convênios às clínicas
- ✅ Criar/atualizar coberturas (procedimentos por convênio por unidade)
- ✅ Desativar procedimentos que não estão mais na lista

### **4. Verificar Resultado**

Execute novamente o script de comparação:

```bash
npx tsx scripts/compare_bradesco_coverage.ts
```

Agora deve mostrar que tudo está sincronizado.

### **5. Verificar via API**

Teste se os dados estão corretos via API:

```bash
# Bradesco na Vieiralves
curl https://zorahapp2-production.up.railway.app/api/clinic/clinics/vieiralves/insurances/bradesco/procedures | jq

# Bradesco na São José
curl https://zorahapp2-production.up.railway.app/api/clinic/clinics/sao-jose/insurances/bradesco/procedures | jq
```

### **6. Verificar Workflow**

Acesse o workflow editor e teste:
- https://zorahapp2-production.up.railway.app/workflows/editor/cmibu88ho0000jizqbv1g3vj0

Teste o fluxo:
1. Escolher unidade (1 ou 2)
2. Perguntar sobre valores de procedimentos
3. Verificar se os procedimentos corretos aparecem

## 📊 **Verificação Esperada**

### **BRADESCO - Vieiralves deve ter:**
- ✅ Acupuntura
- ✅ Consulta com Ortopedista
- ✅ Fisioterapia Neurológica
- ✅ Fisioterapia Ortopédica
- ✅ Fisioterapia Pélvica
- ✅ Infiltração de ponto gatilho e Agulhamento a seco
- ✅ RPG

### **BRADESCO - São José deve ter:**
- ✅ Acupuntura
- ✅ Consulta com Ortopedista
- ✅ Fisioterapia Neurológica
- ✅ Fisioterapia Ortopédica
- ❌ **NÃO** deve ter Fisioterapia Pélvica
- ✅ Infiltração de ponto gatilho e Agulhamento a seco
- ✅ RPG

## ⚠️ **Importante**

### **Procedimentos que NÃO são atendidos na São José:**
1. ❌ **Fisioterapia Pélvica** - Apenas Vieiralves
2. ❌ **Quiropraxia** - Apenas Vieiralves (FUSEX)
3. ❌ **Pilates** - Apenas Vieiralves

O script automaticamente respeita essas diferenças baseado no arquivo `src/infor_clinic.txt`.

## 🔄 **Atualizar Catálogo Estático (Opcional)**

Se necessário, você também pode atualizar o catálogo estático em `api/data/clinicData.ts` para manter consistência. Mas o sistema agora usa principalmente o banco de dados.

## 🐛 **Troubleshooting**

### **Erro de conexão com banco**
```bash
# Verificar DATABASE_URL
railway variables

# Ou configurar localmente
export DATABASE_URL="postgresql://..."
```

### **Erro: "Procedure not found"**
O script cria procedimentos automaticamente. Se ainda assim der erro, verifique o mapeamento em `PROCEDURE_NAME_MAP`.

### **Dados não aparecem após sync**
- Verifique se `isActive = true` nas tabelas
- Execute o script novamente
- Verifique logs do script para erros

## 📝 **Checklist Final**

- [ ] Executado `sync_clinic_data_from_txt.ts`
- [ ] Executado `compare_bradesco_coverage.ts` e verificado
- [ ] Testado via API
- [ ] Testado workflow no editor
- [ ] Verificado que São José não tem Fisioterapia Pélvica
- [ ] Verificado que Vieiralves tem todos os procedimentos

## 🔗 **Links Úteis**

- [Documentação Completa](./scripts/CLINIC_DATA_SYNC.md)
- [Workflow Editor](https://zorahapp2-production.up.railway.app/workflows/editor/cmibu88ho0000jizqbv1g3vj0)
- [Railway Dashboard](https://railway.app)

---

**Criado em:** 24/11/2025  
**Última atualização:** 24/11/2025

