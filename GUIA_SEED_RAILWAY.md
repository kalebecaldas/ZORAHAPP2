# 🚀 Guia: Seed de Dados no Railway Shell

## 📋 O que este seed faz

O script `seed_clinic_data.ts` popula **TUDO** de uma vez:

1. ✅ **2 Clínicas** (Vieiralves e São José)
2. ✅ **16 Procedimentos** (Fisioterapia, Acupuntura, RPG, etc)
3. ✅ **29 Convênios** (Bradesco, SulAmérica, Mediservice, etc)
4. ✅ **Relações** (quais procedimentos cada clínica oferece)
5. ✅ **Preços Particular** (para ambas as clínicas)
6. ✅ **Cobertura de Convênios** (quais procedimentos cada convênio cobre)

---

## 🎯 Como Executar no Railway Shell

### Passo 1: Acessar Railway Shell

1. Acesse o Railway Dashboard
2. Vá em seu serviço
3. Clique em **"Shell"** ou **"Deployments" > Shell**

### Passo 2: Executar o Seed

Execute este comando:

```bash
npx tsx scripts/seed_clinic_data.ts
```

**OU** se preferir usar o npm script:

```bash
npm run seed:clinic-data
```

### Passo 3: Aguardar Conclusão

O script mostrará progresso em tempo real:

```
🌱 Iniciando seed completo de dados de clínica...

📍 ETAPA 1: Criando clínicas, procedimentos e convênios...
📍 Criando clínicas...
✅ Clínica Vieiralves: cmxxxxx...
✅ Clínica São José: cmxxxxx...

💉 Criando procedimentos...
✅ 16 procedimentos criados

🏥 Criando convênios...
✅ 29 convênios criados

🔗 ETAPA 2: Criando relações...
...

📊 RESUMO DO SEED:
   ✅ 2 clínicas criadas
   ✅ 16 procedimentos criados
   ✅ 29 convênios criados
   ...

🎉 Seed completo finalizado com sucesso!
```

---

## ✅ Verificar se Funcionou

Após executar, verifique:

```bash
npx tsx -e "
import prisma from './api/prisma/client.js';
(async () => {
  const clinics = await prisma.clinic.count();
  const procedures = await prisma.procedure.count();
  const insurances = await prisma.insuranceCompany.count();
  const prices = await prisma.clinicInsuranceProcedure.count();
  
  console.log('📊 Dados no banco:');
  console.log('   Clínicas:', clinics);
  console.log('   Procedimentos:', procedures);
  console.log('   Convênios:', insurances);
  console.log('   Preços/Coberturas:', prices);
  
  await prisma.\$disconnect();
})()
"
```

**Resultado esperado:**
- Clínicas: 2
- Procedimentos: 16
- Convênios: 29
- Preços/Coberturas: ~200+ (preços particular + coberturas de convênios)

---

## 🔄 Re-executar (Atualizar Dados)

O script usa `upsert`, então é **seguro re-executar**:

- ✅ Se já existir, **atualiza**
- ✅ Se não existir, **cria**
- ✅ Não duplica dados

Pode executar quantas vezes quiser!

---

## ⚠️ Troubleshooting

### Erro: "Cannot find module"

```bash
# Verificar se está no diretório correto
pwd
# Deve mostrar: /app (ou caminho do Railway)

# Instalar dependências se necessário
npm install
```

### Erro: "Database connection failed"

```bash
# Verificar variável de ambiente
echo $DATABASE_URL

# Se não estiver configurada, configure no Railway Dashboard
```

### Erro: "Clínicas não encontradas"

Isso não deve acontecer, pois o script cria as clínicas primeiro. Se acontecer:

```bash
# Executar novamente
npx tsx scripts/seed_clinic_data.ts
```

---

## 📝 O que é Criado

### Clínicas
- **Vieiralves**: Rua Rio Içá, 850 - Nossa Senhora das Graças
- **São José**: Av. Autaz Mirim, 5773 - São José Operário

### Procedimentos Principais
- Fisioterapia Ortopédica
- Fisioterapia Neurológica
- Fisioterapia Respiratória
- Fisioterapia Pélvica
- Acupuntura
- RPG
- Pilates
- Quiropraxia
- Consulta com Ortopedista
- E mais...

### Convênios
- Bradesco, SulAmérica, Mediservice
- Saúde Caixa, Petrobras, GEAP
- Pro Social, Postal Saúde, CONAB
- E mais 20+ convênios
- **Particular** (com preços e pacotes)

---

## 🎯 Próximos Passos

Após executar o seed:

1. ✅ Bot terá acesso a todos os procedimentos
2. ✅ Bot poderá informar preços corretos
3. ✅ Bot saberá quais convênios aceitam quais procedimentos
4. ✅ Sistema completo funcionando!

---

## 💡 Dica

Se quiser ver os dados criados:

```bash
npx tsx -e "
import prisma from './api/prisma/client.js';
(async () => {
  const clinics = await prisma.clinic.findMany();
  console.log('Clínicas:', clinics.map(c => c.displayName));
  
  const procedures = await prisma.procedure.findMany({ take: 5 });
  console.log('Procedimentos (primeiros 5):', procedures.map(p => p.name));
  
  const insurances = await prisma.insuranceCompany.findMany({ take: 5 });
  console.log('Convênios (primeiros 5):', insurances.map(i => i.displayName));
  
  await prisma.\$disconnect();
})()
"
```

---

## ✅ Checklist

- [ ] Acessei Railway Shell
- [ ] Executei `npx tsx scripts/seed_clinic_data.ts`
- [ ] Vi mensagem "🎉 Seed completo finalizado com sucesso!"
- [ ] Verifiquei dados com script de verificação
- [ ] Testei o bot (deve conhecer procedimentos e convênios)

---

**Pronto!** 🎉 O sistema está completo com todos os dados de clínica!
