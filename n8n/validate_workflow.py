#!/usr/bin/env python3
import json

# Ler o workflow
with open('ZoraH Bot - Optimized v2.2.4.json', 'r', encoding='utf-8') as f:
    workflow = json.load(f)

print("=" * 80)
print("🔍 REVISÃO FINAL DO WORKFLOW - ZoraH Bot v2.2.4")
print("=" * 80)

# Mapear ID -> Nome
id_to_name = {}
name_to_id = {}
for node in workflow['nodes']:
    node_id = node.get('id')
    node_name = node.get('name')
    id_to_name[node_id] = node_name
    name_to_id[node_name] = node_id

print(f"\n✅ Total de nodes: {len(workflow['nodes'])}")

# Verificar conexões usando NOMES (que é como n8n usa)
connections = workflow.get('connections', {})
print(f"✅ Total de source nodes com conexões: {len(connections)}")

# Contar todas as conexões
total_edges = 0
for source_name, conn_types in connections.items():
    for conn_type, branches in conn_types.items():
        for branch in branches:
            if branch:
                total_edges += len(branch)

print(f"✅ Total de edges (conexões): {total_edges}")

# VERIFICAÇÕES CRÍTICAS
print("\n" + "=" * 80)
print("🎯 VERIFICAÇÕES CRÍTICAS:")
print("=" * 80)

errors = []
warnings = []

# 1. Webhook Start → Extract Data
print("\n1️⃣  Webhook Start → Extract Data")
if 'Webhook Start' in connections:
    targets = connections['Webhook Start'].get('main', [[]])[0]
    if targets and targets[0]['node'] == 'Extract Data':
        print("   ✅ Conectado corretamente")
    else:
        errors.append("Webhook Start não conecta com Extract Data")
        print("   ❌ ERRO: Conexão incorreta")
else:
    errors.append("Webhook Start sem conexões")
    print("   ❌ ERRO: Sem conexões")

# 2. Intent Router tem 4 branches
print("\n2️⃣  Intent Router (deve ter 4 saídas)")
if 'Intent Router' in connections:
    branches = connections['Intent Router'].get('main', [])
    print(f"   Branches encontradas: {len(branches)}")
    if len(branches) >= 4:
        print("   ✅ Quantidade correta de branches")
        
        # Verificar cada branch
        expected = {
            0: 'Information Agent',
            1: 'Check Patient HTTP',
            2: 'Handler Transfer',
            3: 'Format Ask Unit Response'
        }
        for idx, expected_target in expected.items():
            if idx < len(branches) and branches[idx]:
                actual_target = branches[idx][0]['node']
                if actual_target == expected_target:
                    print(f"   ✅ Branch {idx}: {actual_target}")
                else:
                    warnings.append(f"Intent Router branch {idx}: esperado '{expected_target}', encontrado '{actual_target}'")
                    print(f"   ⚠️  Branch {idx}: {actual_target} (esperado: {expected_target})")
    else:
        errors.append(f"Intent Router tem {len(branches)} branches, esperado 4")
        print(f"   ❌ ERRO: Apenas {len(branches)} branches")
else:
    errors.append("Intent Router sem conexões")
    print("   ❌ ERRO: Sem conexões")

# 3. Appointment Action Router tem 5 condições
print("\n3️⃣  Appointment Action Router (deve ter 5 saídas)")
if 'Appointment Action Router' in connections:
    branches = connections['Appointment Action Router'].get('main', [])
    print(f"   Branches encontradas: {len(branches)}")
    
    expected_routes = {
        0: 'Register Patient HTTP',      # NOVA
        1: 'Validate Insurance HTTP',
        2: 'Get Procedures HTTP',
        3: 'Validate Appointment Data',
        4: 'Format Final Response'
    }
    
    if len(branches) >= 5:
        print("   ✅ Quantidade correta de branches")
        for idx, expected_target in expected_routes.items():
            if idx < len(branches) and branches[idx]:
                actual_target = branches[idx][0]['node']
                if actual_target == expected_target:
                    print(f"   ✅ Branch {idx}: {actual_target}")
                else:
                    errors.append(f"Action Router branch {idx}: esperado '{expected_target}', encontrado '{actual_target}'")
                    print(f"   ❌ Branch {idx}: {actual_target} (esperado: {expected_target})")
            else:
                errors.append(f"Action Router branch {idx} vazia ou faltando")
                print(f"   ❌ Branch {idx}: VAZIA")
    else:
        errors.append(f"Action Router tem {len(branches)} branches, esperado 5")
        print(f"   ❌ ERRO: Apenas {len(branches)} branches")
else:
    errors.append("Appointment Action Router sem conexões")
    print("   ❌ ERRO: Sem conexões")

# 4. Novo fluxo de registro de paciente
print("\n4️⃣  Fluxo de Registro de Paciente (NOVO)")
if 'Register Patient HTTP' in connections:
    targets = connections['Register Patient HTTP'].get('main', [[]])[0]
    if targets and targets[0]['node'] == 'Process Patient Registration':
        print("   ✅ Register Patient HTTP → Process Patient Registration")
    else:
        errors.append("Register Patient HTTP não conecta com Process Patient Registration")
        print("   ❌ ERRO: Conexão incorreta")
else:
    errors.append("Register Patient HTTP sem conexões")
    print("   ❌ ERRO: Register Patient HTTP sem conexões")

if 'Process Patient Registration' in connections:
    targets = connections['Process Patient Registration'].get('main', [[]])[0]
    if targets and targets[0]['node'] == 'Format Final Response':
        print("   ✅ Process Patient Registration → Format Final Response")
    else:
        errors.append("Process Patient Registration não conecta com Format Final Response")
        print("   ❌ ERRO: Conexão incorreta")
else:
    errors.append("Process Patient Registration sem conexões")
    print("   ❌ ERRO: Process Patient Registration sem conexões")

# 5. Caminho final
print("\n5️⃣  Caminho Final (Format Final Response → Send to System → Webhook Response)")
if 'Format Final Response' in connections:
    targets = connections['Format Final Response'].get('main', [[]])[0]
    if targets and targets[0]['node'] == 'Send to System':
        print("   ✅ Format Final Response → Send to System")
    else:
        errors.append("Format Final Response não conecta com Send to System")
        print("   ❌ ERRO: Conexão incorreta")
else:
    errors.append("Format Final Response sem conexões")
    print("   ❌ ERRO: Format Final Response sem conexões")

if 'Send to System' in connections:
    targets = connections['Send to System'].get('main', [[]])[0]
    if targets and targets[0]['node'] == 'Webhook Response':
        print("   ✅ Send to System → Webhook Response")
    else:
        errors.append("Send to System não conecta com Webhook Response")
        print("   ❌ ERRO: Conexão incorreta")
else:
    errors.append("Send to System sem conexões")
    print("   ❌ ERRO: Send to System sem conexões")

# 6. Verificar nodes AI (agents)
print("\n6️⃣  Conexões AI (Language Models e Memory)")
ai_checks = [
    ('Intent Classifier Agent', 'Gemini Intent Model', 'ai_languageModel'),
    ('Intent Classifier Agent', 'Postgres Memory Intent', 'ai_memory'),
    ('Information Agent', 'Gemini Information Model', 'ai_languageModel'),
    ('Information Agent', 'Postgres Memory Information', 'ai_memory'),
    ('Appointment Agent', 'Gemini Appointment Model', 'ai_languageModel'),
    ('Appointment Agent', 'Postgres Memory Appointment', 'ai_memory'),
]

for target_agent, source, conn_type in ai_checks:
    if source in connections and conn_type in connections[source]:
        targets = connections[source][conn_type][0]
        if targets and targets[0]['node'] == target_agent:
            print(f"   ✅ {source} → {target_agent}")
        else:
            errors.append(f"{source} não conecta corretamente com {target_agent}")
            print(f"   ❌ {source} → {target_agent}")
    else:
        errors.append(f"{source} sem conexão {conn_type}")
        print(f"   ❌ {source} sem conexão {conn_type}")

# RESUMO FINAL
print("\n" + "=" * 80)
print("📊 RESUMO DA REVISÃO:")
print("=" * 80)

print(f"\n❌ Erros encontrados: {len(errors)}")
if errors:
    for i, error in enumerate(errors, 1):
        print(f"   {i}. {error}")

print(f"\n⚠️  Avisos: {len(warnings)}")
if warnings:
    for i, warning in enumerate(warnings, 1):
        print(f"   {i}. {warning}")

if not errors and not warnings:
    print("\n" + "=" * 80)
    print("✅✅✅ WORKFLOW PERFEITO - PRONTO PARA IMPORTAR! ✅✅✅")
    print("=" * 80)
    print("\n📝 Próximos passos:")
    print("   1. Importe 'ZoraH Bot - Optimized v2.2.4.json' no n8n")
    print("   2. Configure credenciais (Google Gemini + Postgres)")
    print("   3. Ative o workflow")
    print("   4. Teste com um paciente novo")
elif not errors:
    print("\n" + "=" * 80)
    print("✅ WORKFLOW VÁLIDO COM AVISOS - Pode importar")
    print("=" * 80)
else:
    print("\n" + "=" * 80)
    print("❌ ENCONTRADOS ERROS - CORRIGIR ANTES DE IMPORTAR")
    print("=" * 80)
