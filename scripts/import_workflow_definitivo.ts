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
    console.log('📥 Importando workflow completo definitivo...\n')

    // Ler o arquivo JSON
    const workflowPath = path.join(process.cwd(), 'workflow_completo_definitivo.json')
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'))

    console.log(`📊 Workflow: ${workflowData.name}`)
    console.log(`📝 Descrição: ${workflowData.description}`)
    console.log(`📦 Nodes: ${workflowData.nodes.length}`)
    console.log(`🔗 Edges: ${workflowData.edges.length}\n`)

    // Verificar se já existe um workflow ativo
    const activeWorkflows = await prisma.workflow.findMany({
      where: { isActive: true }
    })

    if (activeWorkflows.length > 0) {
      console.log(`⚠️  Encontrados ${activeWorkflows.length} workflow(s) ativo(s):\n`)
      activeWorkflows.forEach(wf => {
        console.log(`   - ${wf.name} (ID: ${wf.id})`)
      })
      console.log('\n⚙️  Desativando workflows anteriores...')
      
      await prisma.workflow.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      })
      console.log('✅ Workflows anteriores desativados\n')
    }

    // Criar o novo workflow
    console.log('🔨 Criando novo workflow...')
    
    const workflow = await prisma.workflow.create({
      data: {
        name: workflowData.name,
        description: workflowData.description,
        type: workflowData.type || 'CONSULTATION',
        isActive: true, // Ativar imediatamente
        config: {
          nodes: workflowData.nodes,
          edges: workflowData.edges
        }
      }
    })

    console.log('✅ Workflow criado com sucesso!\n')
    console.log('📋 Detalhes:')
    console.log(`   ID: ${workflow.id}`)
    console.log(`   Nome: ${workflow.name}`)
    console.log(`   Status: ${workflow.isActive ? '🟢 ATIVO' : '⚪ INATIVO'}`)
    console.log(`   Tipo: ${workflow.type}`)
    console.log(`   Criado em: ${workflow.createdAt}`)
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

