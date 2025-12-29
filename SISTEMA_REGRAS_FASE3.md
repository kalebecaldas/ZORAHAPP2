# Sistema de Regras do Bot - Fase 3 Concluída

## ✅ O que foi implementado

### API REST Completa para Gerenciamento de Regras

Arquivo: `api/routes/rules.ts`

## 📋 Endpoints Disponíveis

### Regras de Procedimentos

#### `GET /api/rules/procedures`
Lista todas as regras de procedimentos com informações enriquecidas.

**Resposta:**
```json
[
  {
    "id": "...",
    "procedureCode": "ACUPUNTURA",
    "requiresEvaluation": true,
    "evaluationPrice": 200,
    "evaluationInPackage": true,
    "minimumPackageSessions": 10,
    "highlightPackages": true,
    "showEvaluationFirst": true,
    "customMessage": "A acupuntura é excelente para várias condições.",
    "specialConditions": {...},
    "isActive": true,
    "procedureName": "Acupuntura",
    "procedureDescription": "..."
  }
]
```

#### `GET /api/rules/procedures/:code`
Busca regra específica de um procedimento.

**Exemplo:** `GET /api/rules/procedures/ACUPUNTURA`

**Resposta:**
```json
{
  "id": "...",
  "procedureCode": "ACUPUNTURA",
  "requiresEvaluation": true,
  "evaluationPrice": 200,
  "procedure": {
    "code": "ACUPUNTURA",
    "name": "Acupuntura",
    "description": "...",
    "basePrice": 180
  }
}
```

#### `PUT /api/rules/procedures/:code`
Atualiza regra de um procedimento.

**Exemplo:** `PUT /api/rules/procedures/ACUPUNTURA`

**Body:**
```json
{
  "requiresEvaluation": true,
  "evaluationPrice": 200,
  "evaluationInPackage": true,
  "minimumPackageSessions": 10,
  "highlightPackages": true,
  "showEvaluationFirst": true,
  "customMessage": "Mensagem customizada",
  "specialConditions": {},
  "isActive": true
}
```

### Regras de Convênios

#### `GET /api/rules/insurances`
Lista todas as regras de convênios com informações enriquecidas.

**Resposta:**
```json
[
  {
    "id": "...",
    "insuranceCode": "BRADESCO",
    "showCoveredProcedures": true,
    "mentionOtherBenefits": true,
    "customGreeting": "Perfeito! Trabalhamos com Bradesco.",
    "hideValues": true,
    "canShowDiscount": false,
    "specialProcedures": {},
    "isActive": true,
    "insuranceName": "Bradesco Saúde",
    "insuranceDisplayName": "Bradesco",
    "insuranceDiscount": false,
    "insuranceIsParticular": false
  }
]
```

#### `GET /api/rules/insurances/:code`
Busca regra específica de um convênio.

**Exemplo:** `GET /api/rules/insurances/BRADESCO`

#### `PUT /api/rules/insurances/:code`
Atualiza regra de um convênio.

**Exemplo:** `PUT /api/rules/insurances/BRADESCO`

**Body:**
```json
{
  "showCoveredProcedures": true,
  "mentionOtherBenefits": true,
  "customGreeting": "Ótimo! Com Bradesco...",
  "hideValues": true,
  "canShowDiscount": false,
  "specialProcedures": {},
  "isActive": true
}
```

### Templates de Resposta

#### `GET /api/rules/templates`
Lista todos os templates de resposta ordenados por prioridade.

**Resposta:**
```json
[
  {
    "id": "...",
    "intent": "VALOR_PARTICULAR",
    "context": "procedimento",
    "targetType": "procedure",
    "targetId": null,
    "template": "Para {procedimento}...",
    "conditions": null,
    "priority": 10,
    "rules": null,
    "isActive": true,
    "description": "Template para informação de valores particulares"
  }
]
```

#### `GET /api/rules/templates/:id`
Busca um template específico.

#### `POST /api/rules/templates`
Cria um novo template de resposta.

**Body:**
```json
{
  "intent": "INFORMACAO",
  "context": "geral",
  "targetType": "general",
  "targetId": null,
  "template": "Mensagem: {texto}",
  "conditions": null,
  "priority": 5,
  "rules": null,
  "isActive": true,
  "description": "Descrição do template"
}
```

#### `PUT /api/rules/templates/:id`
Atualiza um template de resposta.

#### `DELETE /api/rules/templates/:id`
Deleta um template de resposta.

### Endpoints de Preview

#### `POST /api/rules/preview/procedure`
Preview de como um procedimento será formatado com as regras atuais.

**Body:**
```json
{
  "procedureCode": "ACUPUNTURA",
  "procedureData": {
    "name": "Acupuntura",
    "price": 180,
    "packages": [
      {
        "name": "Pacote 10 sessões",
        "price": 1600,
        "sessions": 10,
        "description": "Economia de R$ 400"
      }
    ]
  }
}
```

**Resposta:**
```json
{
  "formattedInfo": "A acupuntura é excelente para várias condições.\n\n• **Avaliação**: R$ 200 (obrigatória)\n• **Sessão avulsa**: R$ 180\n\n📦 **Pacotes disponíveis:**\n• Pacote 10 sessões: R$ 1600 (10 sessões) - **Avaliação GRÁTIS** - Economia de R$ 400"
}
```

#### `POST /api/rules/preview/insurance`
Preview de saudação e configurações de um convênio.

**Body:**
```json
{
  "insuranceCode": "BRADESCO",
  "insuranceName": "Bradesco"
}
```

**Resposta:**
```json
{
  "greeting": "Perfeito! Trabalhamos com Bradesco.",
  "shouldShowValues": false,
  "canShowDiscount": false
}
```

#### `POST /api/rules/preview/template`
Preview de renderização de template com variáveis.

**Body:**
```json
{
  "template": "Olá {nome}! O valor de {procedimento} é R$ {preco}.",
  "variables": {
    "nome": "João",
    "procedimento": "Pilates",
    "preco": "150"
  }
}
```

**Resposta:**
```json
{
  "rendered": "Olá João! O valor de Pilates é R$ 150."
}
```

## 🔒 Segurança

Todos os endpoints estão protegidos:
- ✅ **Rate Limiting**: 1000 requisições por minuto para rotas autenticadas
- ✅ **CORS**: Configurado para aceitar apenas origens permitidas
- ✅ **Helmet**: Headers de segurança aplicados
- ✅ **Auth Middleware**: Autenticação requerida (reutilizada do sistema)

## 🧪 Testes

Script de teste: `scripts/test_rules_api.sh`

### Como executar:
```bash
# Tornar executável (apenas primeira vez)
chmod +x scripts/test_rules_api.sh

# Executar testes
./scripts/test_rules_api.sh
```

### Testes incluídos:
1. ✅ Listar regras de procedimentos
2. ✅ Buscar regra específica de procedimento
3. ✅ Atualizar regra de procedimento
4. ✅ Listar regras de convênios
5. ✅ Buscar regra específica de convênio
6. ✅ Atualizar regra de convênio
7. ✅ Listar templates de resposta
8. ✅ Criar novo template
9. ✅ Preview de formatação de procedimento
10. ✅ Preview de saudação de convênio
11. ✅ Preview de renderização de template

**Resultado:** ✅ **Todos os 11 testes passaram com sucesso!**

## 📊 Exemplos de Uso

### Atualizar mensagem customizada de um procedimento
```bash
curl -X PUT http://localhost:3001/api/rules/procedures/PILATES \
  -H "Content-Type: application/json" \
  -d '{
    "customMessage": "O Pilates fortalece e alonga de forma segura e eficaz.",
    "highlightPackages": true
  }'
```

### Testar preview de formatação
```bash
curl -X POST http://localhost:3001/api/rules/preview/procedure \
  -H "Content-Type: application/json" \
  -d '{
    "procedureCode": "PILATES",
    "procedureData": {
      "name": "Pilates",
      "price": 150,
      "packages": []
    }
  }'
```

### Criar novo template de resposta
```bash
curl -X POST http://localhost:3001/api/rules/templates \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "CANCELAMENTO",
    "context": "agendamento",
    "targetType": "general",
    "template": "Entendo que você precisa cancelar. Posso te ajudar com isso.",
    "priority": 10,
    "description": "Template para cancelamentos"
  }'
```

## 🔄 Integração

As rotas foram registradas em `api/app.ts`:

```typescript
import rulesRoutes from './routes/rules.js'

// ...

app.use('/api/rules', authenticatedLimiter, rulesRoutes)
```

## 📁 Arquivos Criados/Modificados

### Criados:
- `api/routes/rules.ts` - Endpoints REST completos
- `scripts/test_rules_api.sh` - Script de teste bash
- `SISTEMA_REGRAS_FASE3.md` - Esta documentação

### Modificados:
- `api/app.ts` - Registro das rotas

## 🎯 Status

**Fase 3: API Endpoints - ✅ CONCLUÍDA**

API REST completa com:
- ✅ CRUD de regras de procedimentos
- ✅ CRUD de regras de convênios
- ✅ CRUD de templates de resposta
- ✅ Endpoints de preview para testes
- ✅ Autenticação e rate limiting
- ✅ Testes automatizados

## 🚀 Próxima Fase (Fase 4)

**Interface Frontend**: Criar a UI para gerenciar regras na página "Configuração da IA":
- Tab "Regras de Procedimentos" - Listar e editar regras de cada procedimento
- Tab "Regras de Convênios" - Listar e editar regras de cada convênio
- Tab "Templates de Resposta" - Gerenciar templates com editor visual
- Preview em tempo real de como cada regra afeta as respostas do bot
