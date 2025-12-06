# ✅ Ajustes no Seed - Pilates e Durações

## 🎯 Ajustes Realizados

### 1. Pilates - Duração Corrigida
- ❌ **Antes**: 50 minutos
- ✅ **Agora**: 30 minutos (conforme sistema local)

### 2. Pilates - Pacotes Adicionados
- ❌ **Antes**: `hasPackage: false` (sem pacotes)
- ✅ **Agora**: `hasPackage: true` com 3 pacotes:

```json
[
  {
    "name": "Pilates 2x na semana",
    "price": 39,
    "sessions": 8,
    "description": "2 sessões por semana"
  },
  {
    "name": "Pilates 3x na semana",
    "price": 56,
    "sessions": 12,
    "description": "3 sessões por semana"
  },
  {
    "name": "Pilates sessão avulsa",
    "price": 70,
    "sessions": 1,
    "description": "Sessão avulsa"
  }
]
```

### 3. Outras Durações Ajustadas

Para corresponder ao sistema local:

| Procedimento | Duração Antes | Duração Agora |
|-------------|---------------|---------------|
| Fisioterapia Pélvica | 50 min | ✅ 60 min |
| Acupuntura | 50 min | ✅ 45 min |
| RPG | 50 min | ✅ 60 min |
| Avaliação Acupuntura | 60 min | ✅ 45 min |
| Pilates | 50 min | ✅ 30 min |

---

## 📋 Resumo dos Pacotes do Pilates

### Vieiralves - Particular

**Sessão Avulsa**: R$ 70,00

**Pacotes Disponíveis**:
1. **Pilates 2x na semana**
   - 8 sessões
   - R$ 39/sessão
   - Total: R$ 312,00
   - Descrição: "2 sessões por semana"

2. **Pilates 3x na semana**
   - 12 sessões
   - R$ 56/sessão
   - Total: R$ 672,00
   - Descrição: "3 sessões por semana"

3. **Pilates sessão avulsa**
   - 1 sessão
   - R$ 70/sessão
   - Total: R$ 70,00
   - Descrição: "Sessão avulsa"

---

## 🚀 Como Aplicar no Railway

Execute no Railway Shell:

```bash
npx tsx scripts/seed_clinic_data.ts
```

O script irá:
1. ✅ Atualizar a duração do Pilates para 30 min
2. ✅ Adicionar os 3 pacotes corretos
3. ✅ Ajustar outras durações conforme necessário
4. ✅ Usar `upsert` (seguro re-executar)

---

## ✅ Verificação

Após executar, verifique:

```bash
npx tsx -e "
import prisma from './api/prisma/client.js';
(async () => {
  const pilates = await prisma.procedure.findUnique({ 
    where: { code: 'PILATES' },
    include: {
      clinicProcedures: {
        include: {
          clinic: true
        }
      }
    }
  });
  
  console.log('Pilates:');
  console.log('  Duração:', pilates?.duration, 'min');
  console.log('  Preço base:', pilates?.basePrice);
  
  const price = await prisma.clinicInsuranceProcedure.findFirst({
    where: {
      procedureCode: 'PILATES',
      insuranceCode: 'PARTICULAR',
      clinic: { code: 'VIEIRALVES' }
    }
  });
  
  if (price?.hasPackage && price.packageInfo) {
    const packages = typeof price.packageInfo === 'string' 
      ? JSON.parse(price.packageInfo) 
      : price.packageInfo;
    console.log('  Pacotes:', packages.length);
    packages.forEach((pkg: any) => {
      console.log(\`    - \${pkg.name}: \${pkg.sessions} sessões, R$ \${pkg.price}/sessão\`);
    });
  }
  
  await prisma.\$disconnect();
})()
"
```

**Resultado esperado:**
```
Pilates:
  Duração: 30 min
  Preço base: 70
  Pacotes: 3
    - Pilates 2x na semana: 8 sessões, R$ 39/sessão
    - Pilates 3x na semana: 12 sessões, R$ 56/sessão
    - Pilates sessão avulsa: 1 sessão, R$ 70/sessão
```

---

## 📝 Notas

- ✅ Durações ajustadas para corresponder ao sistema local
- ✅ Pacotes do Pilates idênticos ao sistema local
- ✅ Script usa `upsert` - pode executar várias vezes sem problemas
- ✅ Todas as durações agora estão corretas
