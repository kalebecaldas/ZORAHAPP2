# 🚀 Como Popular o Banco de Dados no Railway

## ✅ **Solução Criada**

Criei um **endpoint HTTP** na API que executa a sincronização diretamente no Railway. Agora você pode popular o banco de dados de **3 formas diferentes**:

---

## 📋 **Opção 1: Via Endpoint HTTP (RECOMENDADO - MAIS FÁCIL)** ✅

Esta é a forma mais fácil e não requer instalação de dependências!

### **Passo 1: Fazer Login na API**

Primeiro, você precisa fazer login para obter o token de autenticação:

```bash
# Fazer login
curl -X POST https://zorahapp2-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seu-email@exemplo.com",
    "password": "sua-senha"
  }'
```

Isso retornará um token JWT. Guarde esse token!

### **Passo 2: Executar Sincronização**

Use o token para chamar o endpoint de sincronização:

```bash
curl -X POST https://zorahapp2-production.up.railway.app/api/clinic/sync-from-txt \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### **Resposta Esperada:**

```json
{
  "success": true,
  "message": "Sincronização concluída com sucesso",
  "stats": {
    "clinics": 0,
    "procedures": 0,
    "insurances": 0,
    "links": 0,
    "coverage": 150
  },
  "filePath": "/app/src/infor_clinic.txt"
}
```

---

## 📋 **Opção 2: Via Railway CLI**

Se você prefere usar o Railway CLI, primeiro instale as dependências:

```bash
# 1. Instalar dependências primeiro
npm install

# 2. Gerar Prisma Client
npx prisma generate

# 3. Executar o script
railway run npx tsx scripts/sync_clinic_data_from_txt.ts
```

**OU** execute tudo de uma vez:

```bash
railway run bash -c "npm install && npx prisma generate && npx tsx scripts/sync_clinic_data_from_txt.ts"
```

---

## 📋 **Opção 3: Via Terminal Local**

Se você tem acesso ao `DATABASE_URL` do Railway:

```bash
# 1. Instalar dependências
npm install

# 2. Gerar Prisma Client
npx prisma generate

# 3. Configurar variável de ambiente
export DATABASE_URL="postgresql://usuario:senha@host:porta/database"

# 4. Executar script
npx tsx scripts/sync_clinic_data_from_txt.ts
```

---

## 🔍 **Verificar Resultado**

Após sincronizar, verifique se funcionou:

### **1. Via API (Bradesco - Vieiralves):**

```bash
curl https://zorahapp2-production.up.railway.app/api/clinic/clinics/vieiralves/insurances/bradesco/procedures | jq
```

**Deve retornar 7 procedimentos:**
- Acupuntura
- Consulta com Ortopedista
- Fisioterapia Neurológica
- Fisioterapia Ortopédica
- Fisioterapia Pélvica ✅
- Infiltração de ponto gatilho e Agulhamento a seco
- RPG

### **2. Via API (Bradesco - São José):**

```bash
curl https://zorahapp2-production.up.railway.app/api/clinic/clinics/sao-jose/insurances/bradesco/procedures | jq
```

**Deve retornar 6 procedimentos (SEM Fisioterapia Pélvica):**
- Acupuntura
- Consulta com Ortopedista
- Fisioterapia Neurológica
- Fisioterapia Ortopédica
- Infiltração de ponto gatilho e Agulhamento a seco
- RPG

### **3. Via Script de Comparação:**

```bash
# Instalar dependências primeiro
npm install && npx prisma generate

# Executar comparação
railway run npx tsx scripts/compare_bradesco_coverage.ts
```

---

## ✅ **O que o Endpoint Faz**

O endpoint `/api/clinic/sync-from-txt`:

1. ✅ **Lê o arquivo** `src/infor_clinic.txt` do servidor
2. ✅ **Cria/atualiza clínicas** (Vieiralves e São José)
3. ✅ **Cria/atualiza procedimentos** (todos os procedimentos necessários)
4. ✅ **Cria/atualiza convênios** (se não existirem)
5. ✅ **Vincula convênios às clínicas**
6. ✅ **Cria/atualiza coberturas** (quais procedimentos cada convênio atende em cada unidade)
7. ✅ **Desativa procedimentos** que não estão mais na lista

---

## 🔐 **Autenticação**

O endpoint requer:
- ✅ **Autenticação:** Token JWT válido
- ✅ **Permissão:** Role `ADMIN`

Se você não tem acesso admin, pode:
1. Usar a Opção 2 (Railway CLI) - não requer autenticação HTTP
2. Pedir para um admin executar
3. Temporariamente remover a autenticação em desenvolvimento

---

## 🐛 **Troubleshooting**

### **Erro: "Cannot find package '@prisma/client'"**

**Causa:** Dependências não instaladas ou Prisma Client não gerado.

**Solução:**
```bash
npm install
npx prisma generate
```

### **Erro: "Arquivo infor_clinic.txt não encontrado"**

O endpoint tenta encontrar o arquivo em vários caminhos:
- `/app/src/infor_clinic.txt`
- `/app/../src/infor_clinic.txt`
- `__dirname/../../src/infor_clinic.txt`

**Solução:** Verifique se o arquivo está no repositório e foi deployado no Railway.

### **Erro: "Unauthorized"**

Você precisa estar autenticado como ADMIN.

**Solução:** 
- Faça login primeiro
- Use o token no header `Authorization: Bearer TOKEN`
- Ou use Railway CLI (não requer autenticação HTTP)

### **Erro: "Procedure not found"**

O script cria procedimentos automaticamente. Se ainda assim der erro, verifique se o mapeamento está correto.

---

## 📊 **Estatísticas Retornadas**

O endpoint retorna estatísticas:

```json
{
  "stats": {
    "clinics": 0,        // Clínicas criadas (não atualizadas)
    "procedures": 0,     // Procedimentos criados
    "insurances": 0,     // Convênios criados
    "links": 0,          // Vínculos clínica-convênio criados
    "coverage": 150      // Coberturas (procedimentos por convênio) criadas/ativadas
  }
}
```

---

## 🎯 **Checklist**

- [ ] **Escolher método:** Endpoint HTTP (mais fácil) ou Railway CLI
- [ ] Se usar Railway CLI: `npm install && npx prisma generate`
- [ ] Executar sincronização
- [ ] Verificar resposta (success: true)
- [ ] Verificar estatísticas (coverage > 0)
- [ ] Testar via API se os dados estão corretos
- [ ] Verificar que São José **NÃO** tem Fisioterapia Pélvica
- [ ] Verificar que Vieiralves tem todos os procedimentos

---

## 🔗 **Links Úteis**

- **API Base:** https://zorahapp2-production.up.railway.app
- **Endpoint:** `/api/clinic/sync-from-txt`
- **Login:** `/api/auth/login`
- **Workflow Editor:** https://zorahapp2-production.up.railway.app/workflows/editor/cmibu88ho0000jizqbv1g3vj0

---

## 💡 **Recomendação**

**Use a Opção 1 (Endpoint HTTP)** - É mais fácil e não requer instalação de dependências localmente!

---

**Criado em:** 24/11/2025  
**Status:** ✅ Pronto para usar
