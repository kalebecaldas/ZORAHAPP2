# 🚀 Guia Passo a Passo: Executar Script via SSH no Railway

## ✅ Status: SCRIPT VALIDADO E PRONTO

### 📋 Verificação Completa

✅ **Estrutura do Script:**
- Import correto: `import prisma from '../api/prisma/client.js'`
- Função principal: `railwayMigrateAndSeed()`
- Tratamento de erros: `try/catch/finally`
- Disconnect do Prisma: `await prisma.$disconnect()`
- Process.exit() correto

✅ **Funcionalidades:**
1. Cria `SystemSettings` (idempotente)
2. Popula `ResponseRules` (7 templates atualizados)
3. Popula `ProcedureRules` (dinâmico baseado em procedimentos existentes)
4. Popula `InsuranceRules` (dinâmico baseado em convênios existentes)
5. Verifica dados essenciais (procedimentos, convênios, clínicas)

✅ **Templates Atualizados com Novas Funcionalidades:**
- `VALOR_PARTICULAR` - com variável `{unidade}` e pergunta de unidade
- `LOCALIZACAO` - formatação melhorada com números
- `HORARIO` - verifica unidade antes de informar horários

✅ **Segurança:**
- Idempotente (pode rodar múltiplas vezes sem problemas)
- Preserva dados existentes
- Não sobrescreve configurações manuais
- Usa `findFirst/findUnique` antes de criar

---

## 🔧 Passo a Passo para Execução

### Passo 1: Conectar ao Railway via SSH

```bash
railway ssh
```

**Aguarde a conexão** - Você verá algo como:
```
Connected to railway-production-xxxx
```

### Passo 2: Verificar se está no diretório correto

```bash
pwd
# Deve mostrar: /app (diretório padrão do Railway)

ls -la
# Deve listar os arquivos do projeto
```

### Passo 3: Verificar se as dependências estão instaladas

```bash
# tsx já vem instalado nas dependências do projeto
which tsx
# ou
npx tsx --version
```

### Passo 4: Executar o Script de Migração

```bash
npx tsx scripts/railway_migrate_and_seed.ts
```

### Passo 5: Acompanhar a Execução

Você verá logs como:

```
🚀 Iniciando migração e seed para Railway...

1️⃣ Verificando SystemSettings...
   📝 Criando SystemSettings inicial...
   ✅ SystemSettings criado

2️⃣ Populando ResponseRules...
   ✅ Criado template: VALOR_PARTICULAR
   ✅ Criado template: CONVENIO_PROCEDIMENTOS
   ✅ Criado template: LISTAR_PROCEDIMENTOS_CONVENIO
   ✅ Criado template: INFORMACAO
   ✅ Criado template: AGENDAR
   ✅ Criado template: LOCALIZACAO
   ✅ Criado template: HORARIO
   ✅ ResponseRules populados

3️⃣ Populando ProcedureRules...
   📋 Encontrados X procedimentos
   ✅ Criada regra para: Fisioterapia Pélvica
   ✅ Criada regra para: Acupuntura
   ✅ Criada regra para: RPG
   ...
   ✅ ProcedureRules populados

4️⃣ Populando InsuranceRules...
   📋 Encontrados Y convênios
   ✅ Criada regra para: Bradesco
   ✅ Criada regra para: SulAmérica
   ...
   ✅ InsuranceRules populados

5️⃣ Verificando dados essenciais...
   Procedimentos: X
   Convênios: Y
   Clínicas: Z
   ✅ Dados essenciais presentes

✅ Migração e seed concluídos com sucesso!
✅ Script concluído com sucesso!
```

### Passo 6: Verificar se Deu Certo

```bash
# Verificar tabelas criadas (opcional)
npx prisma studio
# ou consultar diretamente no Railway dashboard
```

### Passo 7: Sair do SSH

```bash
exit
```

---

## 🔍 Troubleshooting

### Erro: "Module not found"
```bash
# Instalar dependências
npm install

# Tentar novamente
npx tsx scripts/railway_migrate_and_seed.ts
```

### Erro: "Prisma Client not generated"
```bash
# Gerar Prisma Client
npx prisma generate

# Tentar novamente
npx tsx scripts/railway_migrate_and_seed.ts
```

### Erro: "Database connection failed"
```bash
# Verificar variáveis de ambiente
env | grep DATABASE_URL

# Se não existir, configurar no Railway Dashboard
```

### Se o Script Rodar Múltiplas Vezes
**Não tem problema!** O script é idempotente:
- Se `SystemSettings` já existe → pula
- Se template já existe → pula
- Se regra já existe → pula (ou atualiza apenas campo específico)

---

## 📊 O Que o Script Faz em Detalhes

### 1. SystemSettings
Cria configuração global do sistema:
- `inactivityTimeoutMinutes`: 20
- `closingMessage`: Mensagem de encerramento
- `autoAssignEnabled`: true
- `maxConversationsPerAgent`: 5

### 2. ResponseRules (7 Templates)
Templates para respostas do bot baseadas em intenção:
- `VALOR_PARTICULAR` → Com pergunta de unidade
- `CONVENIO_PROCEDIMENTOS` → Informações de convênio
- `LISTAR_PROCEDIMENTOS_CONVENIO` → Lista procedimentos cobertos
- `INFORMACAO` → Informações gerais
- `AGENDAR` → Iniciar agendamento
- `LOCALIZACAO` → Endereços das unidades
- `HORARIO` → Horários de funcionamento

### 3. ProcedureRules (Dinâmico)
Para cada procedimento no banco:
- Detecta se requer avaliação
- Define preço de avaliação (se aplicável)
- `evaluationIncludesFirstSession`: **true** (sempre)
- Mensagem customizada (Acupuntura, Pilates, RPG)
- Configurações de pacotes

### 4. InsuranceRules (Dinâmico)
Para cada convênio no banco:
- Saudação customizada
- Controle de visibilidade de valores
- Suporte a convênios com desconto
- Lista procedimentos cobertos

---

## ✅ Após Execução

### Teste o Bot
1. **Pergunta sobre valor sem unidade:**
   ```
   USER: "Quanto custa RPG?"
   BOT: "Para te passar o valor correto, qual unidade você prefere?
         1️⃣ Vieiralves
         2️⃣ São José"
   ```

2. **Procedimento não atendido:**
   ```
   USER: "atendem terapia ocupacional?"
   BOT: "Entendo seu interesse em Terapia Ocupacional!
         Infelizmente, não atendemos...
         📋 Procedimentos que oferecemos:..."
   ```

3. **Listagem de procedimentos:**
   - ✅ Mostra: Fisioterapia Pélvica, Acupuntura, RPG
   - ❌ NÃO mostra: Avaliação de Fisioterapia Pélvica (faz parte do procedimento)

---

## 🎯 Resumo Final

**Comando único para executar:**
```bash
railway ssh
npx tsx scripts/railway_migrate_and_seed.ts
exit
```

**Tempo estimado:** 30-60 segundos

**Resultado esperado:** 
- ✅ Tabelas criadas/atualizadas
- ✅ Templates de resposta configurados
- ✅ Regras de procedimentos aplicadas
- ✅ Regras de convênios aplicadas
- ✅ Bot funcionando com novas funcionalidades

**Segurança:**
- ✅ Não perde dados existentes
- ✅ Pode rodar múltiplas vezes
- ✅ Reversível (basta recriar com dados anteriores)

---

## 📝 Comandos Úteis Adicionais

```bash
# Ver logs em tempo real
railway logs --follow

# Verificar status do serviço
railway status

# Reiniciar serviço (se necessário)
railway restart

# Ver variáveis de ambiente
railway variables
```

---

## 🎉 Pronto para Execução!

Todas as verificações passaram. O script está pronto para ser executado no Railway sem problemas!
