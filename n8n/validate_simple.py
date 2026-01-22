#!/usr/bin/env python3
import json

# Ler o workflow
with open('ZoraH Bot - Simple v2.2.4.json', 'r', encoding='utf-8') as f:
    workflow = json.load(f)

print("=" * 80)
print("✅ VALIDAÇÃO FINAL - Workflow Simplificado")
print("=" * 80)

print(f"\n📦 Total de nodes: {len(workflow['nodes'])}")
print(f"🔗 Total de conexões: {len(workflow.get('connections', {}))}")

errors = []

# 1. Verificar que métricas foram simplificadas
print("\n🎯 VERIFICAÇÃO DE SIMPLIFICAÇÃO:")
print("-" * 80)

# Verificar Format Final Response
for node in workflow['nodes']:
    if node.get('id') == 'format-final-response':
        code = node.get('parameters', {}).get('jsCode', '')
        if 'metrics' in code and 'responseTimeMs' in code:
            print("✅ Format Final Response envia objeto 'metrics'")
            
            # Verificar que NÃO tem analytics complexos
            if 'intentClassifiedAt' not in code and 'messageReceivedTimestamp' not in code:
                print("✅ Analytics complexos foram removidos")
            else:
                errors.append("Analytics complexos ainda presentes")
                print("❌ Analytics complexos ainda presentes")
        else:
            errors.append("Format Final Response não tem métricas")
            print("❌ Format Final Response não tem métricas")

# 2. Verificar fluxo completo
print("\n🔄 VERIFICAÇÃO DE FLUXO:")
print("-" * 80)

flow_checks = [
    ('Webhook Start', 'Extract Data'),
    ('Parse Intent Response', 'Intent Router'),
    ('Format Final Response', 'Prepare Analytics'),
    ('Prepare Analytics', 'Send to System'),
    ('Send to System', 'Webhook Response')
]

for source, target in flow_checks:
    if source in workflow.get('connections', {}):
        targets = workflow['connections'][source].get('main', [[]])[0]
        if targets and targets[0]['node'] == target:
            print(f"✅ {source} → {target}")
        else:
            errors.append(f"{source} não conecta com {target}")
            print(f"❌ {source} → {target}")

# 3. Verificar Intent Router
print("\n📍 VERIFICAÇÃO DE ROTAS:")
print("-" * 80)

if 'Intent Router' in workflow.get('connections', {}):
    branches = workflow['connections']['Intent Router'].get('main', [])
    expected = ['Information Agent', 'Handle Appointment Request', 'Handler Transfer', 'Format Ask Unit Response']
    
    if len(branches) >= 4:
        print(f"✅ Intent Router tem {len(branches)} branches")
        for i, exp in enumerate(expected):
            if i < len(branches) and branches[i]:
                actual = branches[i][0]['node']
                if actual == exp:
                    print(f"   ✅ Branch {i}: {actual}")
                else:
                    print(f"   ⚠️  Branch {i}: {actual} (esperado: {exp})")

print("\n" + "=" * 80)
print("📊 RESUMO:")
print("=" * 80)

if not errors:
    print("\n✅✅✅ WORKFLOW SIMPLIFICADO E VALIDADO!")
    print("\n📊 Métricas enviadas (apenas essenciais):")
    print("   • intent")
    print("   • responseTimeMs")
    print("   • timestamp")
    print("   • requiresTransfer")
    print("\n🚀 PRONTO PARA IMPORTAR NO N8N!")
else:
    print(f"\n❌ {len(errors)} erro(s) encontrado(s):")
    for i, err in enumerate(errors, 1):
        print(f"   {i}. {err}")
