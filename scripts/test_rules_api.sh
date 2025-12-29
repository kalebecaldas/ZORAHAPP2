#!/bin/bash

# Script para testar os endpoints da API de Regras

BASE_URL="http://localhost:3001/api/rules"

echo "🧪 Testando API de Regras do Bot"
echo "=================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para testar endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    
    echo -e "${BLUE}📋 Teste: ${description}${NC}"
    echo "   ${method} ${endpoint}"
    
    if [ -z "$data" ]; then
        response=$(curl -s -X ${method} "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -X ${method} "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "${data}")
    fi
    
    # Verificar se teve erro
    if echo "$response" | grep -q '"error"'; then
        echo -e "   ${RED}❌ Erro: $(echo $response | jq -r '.error' 2>/dev/null || echo $response)${NC}"
    else
        echo -e "   ${GREEN}✅ Sucesso${NC}"
        # Mostrar apenas primeira linha do resultado para não poluir
        echo "$response" | jq -C '.' 2>/dev/null | head -20
    fi
    echo ""
}

# 1. Testar listagem de regras de procedimentos
test_endpoint "GET" "/procedures" "Listar regras de procedimentos"

# 2. Testar busca de regra específica de procedimento
test_endpoint "GET" "/procedures/ACUPUNTURA" "Buscar regra de Acupuntura"

# 3. Testar atualização de regra de procedimento
test_endpoint "PUT" "/procedures/ACUPUNTURA" "Atualizar regra de Acupuntura" \
'{
  "requiresEvaluation": true,
  "evaluationPrice": 200,
  "evaluationInPackage": true,
  "minimumPackageSessions": 10,
  "highlightPackages": true,
  "showEvaluationFirst": true,
  "customMessage": "A acupuntura é excelente para várias condições. Teste atualizado!",
  "specialConditions": {
    "packageDiscount": "evaluation_free",
    "minSessions": 10
  },
  "isActive": true
}'

# 4. Testar listagem de regras de convênios
test_endpoint "GET" "/insurances" "Listar regras de convênios"

# 5. Testar busca de regra específica de convênio
test_endpoint "GET" "/insurances/BRADESCO" "Buscar regra de Bradesco"

# 6. Testar atualização de regra de convênio
test_endpoint "PUT" "/insurances/BRADESCO" "Atualizar regra de Bradesco" \
'{
  "showCoveredProcedures": true,
  "mentionOtherBenefits": true,
  "customGreeting": "Perfeito! Trabalhamos com Bradesco e temos ótimas opções para você!",
  "hideValues": true,
  "canShowDiscount": false,
  "specialProcedures": {},
  "isActive": true
}'

# 7. Testar listagem de templates
test_endpoint "GET" "/templates" "Listar templates de resposta"

# 8. Testar criação de novo template
test_endpoint "POST" "/templates" "Criar novo template" \
'{
  "intent": "TESTE",
  "context": "geral",
  "targetType": "general",
  "template": "Este é um template de teste: {mensagem}",
  "priority": 5,
  "description": "Template criado para teste",
  "isActive": true
}'

# 9. Testar preview de formatação de procedimento
test_endpoint "POST" "/preview/procedure" "Preview de formatação de procedimento" \
'{
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
}'

# 10. Testar preview de saudação de convênio
test_endpoint "POST" "/preview/insurance" "Preview de saudação de convênio" \
'{
  "insuranceCode": "BRADESCO",
  "insuranceName": "Bradesco"
}'

# 11. Testar preview de renderização de template
test_endpoint "POST" "/preview/template" "Preview de renderização de template" \
'{
  "template": "Olá {nome}! O valor de {procedimento} é R$ {preco}.",
  "variables": {
    "nome": "João",
    "procedimento": "Pilates",
    "preco": "150"
  }
}'

echo ""
echo -e "${GREEN}✅ Testes concluídos!${NC}"
echo ""
echo "💡 Dica: Use 'jq' para formatar melhor o JSON:"
echo "   curl -s http://localhost:3001/api/rules/procedures | jq"
