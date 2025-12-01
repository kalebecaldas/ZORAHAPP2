#!/usr/bin/env ts-node

/**
 * Script para importar o workflow completo definitivo para o banco de dados
 * 
 * Uso:
 *   npx ts-node scripts/import_workflow_definitivo.ts
 * 
 * Ou via Railway CLI:
 *   railway run npx ts-node scripts/import_workflow_definitivo.ts
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function importWorkflow() {
  try {
    console.log('📥 Importando workflow de 28 nós...\n')

    // Ler o arquivo JSON do workflow correto (28 nós)
    // Primeiro tenta workflow_to_sync.json, depois workflow_completo_definitivo.json como fallback
    let workflowPath = path.join(process.cwd(), 'workflow_to_sync.json')
    if (!fs.existsSync(workflowPath)) {
      workflowPath = path.join(process.cwd(), 'workflow_completo_definitivo.json')
    }
    
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'))
    
    // Extrair nodes e edges do formato correto
    const nodes = workflowData.config?.nodes || workflowData.nodes || []
    const edges = workflowData.config?.edges || workflowData.edges || []

    console.log(`📊 Workflow: ${workflowData.name || 'Workflow Principal'}`)
    console.log(`📝 Descrição: ${workflowData.description || 'Workflow de atendimento'}`)
    console.log(`📦 Nodes: ${nodes.length}`)
    console.log(`🔗 Edges: ${edges.length}\n`)

    // Verificar se tem exatamente 28 nós
    if (nodes.length !== 28) {
      console.warn(`⚠️  ATENÇÃO: Este workflow tem ${nodes.length} nós, não 28!`)
      console.warn(`   Se este não for o workflow correto, verifique o arquivo workflow_to_sync.json\n`)
    }

    // DELETAR TODOS os workflows antigos (não apenas desativar)
    const allWorkflows = await prisma.workflow.findMany()
    
    if (allWorkflows.length > 0) {
      console.log(`🗑️  Encontrados ${allWorkflows.length} workflow(s) no banco:\n`)
      allWorkflows.forEach(wf => {
        const nodeCount = (typeof wf.config === 'object' && wf.config !== null && 'nodes' in wf.config) 
          ? (wf.config as any).nodes?.length || 0 
          : 0
        console.log(`   - ${wf.name} (ID: ${wf.id}, Nodes: ${nodeCount}, Ativo: ${wf.isActive ? 'SIM' : 'NÃO'})`)
      })
      console.log('\n🗑️  Deletando TODOS os workflows antigos...')
      
      // Deletar todos os workflows
      const deleteResult = await prisma.workflow.deleteMany({})
      console.log(`✅ ${deleteResult.count} workflow(s) deletado(s)\n`)
    }

    // Criar o novo workflow
    console.log('🔨 Criando novo workflow...')
    
    const workflow = await prisma.workflow.create({
      data: {
        name: workflowData.name || 'Sistema Completo - 28 Nós',
        description: workflowData.description || 'Workflow principal de atendimento com 28 nós',
        type: workflowData.type || 'CONSULTATION',
        isActive: true, // Ativar imediatamente
        config: {
          nodes: nodes,
          edges: edges
        }
      }
    })

    console.log('✅ Workflow criado com sucesso!\n')
    console.log('📋 Detalhes:')
    console.log(`   ID: ${workflow.id}`)
    console.log(`   Nome: ${workflow.name}`)
    console.log(`   Status: ${workflow.isActive ? '🟢 ATIVO' : '⚪ INATIVO'}`)
    console.log(`   Tipo: ${workflow.type}`)
    console.log(`   Nodes: ${nodes.length}`)
    console.log(`   Edges: ${edges.length}`)
    console.log(`   Criado em: ${workflow.createdAt}`)
    
    // Atualizar AuditLog para definir este workflow como padrão
    try {
      // Buscar um usuário MASTER ou ADMIN para usar como actor
      const adminUser = await prisma.user.findFirst({
        where: {
          role: { in: ['MASTER', 'ADMIN'] }
        },
        orderBy: { createdAt: 'asc' }
      })
      
      if (adminUser) {
        await prisma.auditLog.create({
          data: {
            actorId: adminUser.id,
            action: 'DEFAULT_WORKFLOW',
            details: { id: workflow.id, name: workflow.name, nodes: nodes.length }
          }
        })
        console.log('✅ AuditLog atualizado - workflow definido como padrão\n')
      }
    } catch (auditError) {
      console.warn('⚠️  Não foi possível atualizar AuditLog:', auditError)
    }
    
    console.log('\n🎉 Importação concluída!')
    console.log('\n💡 Próximos passos:')
    console.log('   1. Acesse o WorkflowEditor: /workflows/editor/' + workflow.id)
    console.log('   2. Verifique se todos os nodes estão visíveis')
    console.log('   3. Teste o fluxo no TestChat: /test-chat')
    console.log('\n🔗 Link direto para o editor:')
    console.log(`   http://localhost:4002/workflows/editor/${workflow.id}`)

  } catch (error) {
    console.error('❌ Erro ao importar workflow:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar
importWorkflow()
  .then(() => {
    console.log('\n✨ Script finalizado!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Falha na importação:', error)
    process.exit(1)
  })

