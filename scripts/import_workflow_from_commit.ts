import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Usar Prisma Client com DATABASE_URL da variável de ambiente (Railway) ou local
const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
console.log(`🔗 Usando DATABASE_URL: ${databaseUrl.includes('postgres') ? 'PostgreSQL (Railway)' : 'SQLite (Local)'}`);

const prisma = new PrismaClient();

async function importWorkflowFromCommit() {
  try {
    const commitHash = '96a3f61';
    
    console.log(`📦 Verificando commit ${commitHash}...`);
    
    // Verificar se o commit existe
    try {
      execSync(`git show ${commitHash} --stat`, { stdio: 'pipe' });
    } catch (error) {
      console.error(`❌ Commit ${commitHash} não encontrado`);
      return;
    }
    
    // Listar arquivos modificados no commit relacionados a workflow
    const files = execSync(`git show ${commitHash} --name-only --pretty=format:`, { encoding: 'utf-8' })
      .split('\n')
      .filter(f => f.includes('workflow') || f.includes('Workflow'));
    
    console.log('📁 Arquivos encontrados:', files);
    
    // Tentar extrair workflow do commit
    // Primeiro, vamos verificar se há um arquivo JSON de workflow
    const jsonFiles = ['workflow_completo_real.json', 'workflow_dinamico_completo.json', 'workflow_completo_real_with_connections.json'];
    
    let workflowData = null;
    
    for (const jsonFile of jsonFiles) {
      try {
        // Tentar ler a versão do commit
        const content = execSync(`git show ${commitHash}:${jsonFile}`, { encoding: 'utf-8' });
        workflowData = JSON.parse(content);
        console.log(`✅ Workflow encontrado em: ${jsonFile}`);
        break;
      } catch (error) {
        // Arquivo não existe neste commit, continuar
        continue;
      }
    }
    
    if (!workflowData) {
      // Tentar buscar no banco de dados do commit (se houver migrations ou seeds)
      console.log('⚠️ Nenhum arquivo JSON encontrado. Verificando código do commit...');
      
      // Verificar arquivos de rotas ou scripts que possam ter o workflow
      const codeFiles = execSync(`git show ${commitHash} --name-only`, { encoding: 'utf-8' })
        .split('\n')
        .filter(f => f.includes('workflow') || f.includes('routes'));
      
      console.log('📄 Arquivos de código relacionados:', codeFiles);
      
      // Se não encontrar, vamos usar o workflow_completo_real_with_connections.json atual
      // que parece ter as posições corretas
      const currentWorkflowPath = path.join(process.cwd(), 'workflow_completo_real_with_connections.json');
      if (fs.existsSync(currentWorkflowPath)) {
        workflowData = JSON.parse(fs.readFileSync(currentWorkflowPath, 'utf-8'));
        console.log('✅ Usando workflow_completo_real_with_connections.json atual');
      }
    }
    
    if (!workflowData) {
      console.error('❌ Nenhum workflow encontrado no commit ou nos arquivos atuais');
      return;
    }
    
    console.log(`\n📋 Workflow encontrado: ${workflowData.name}`);
    console.log(`📊 Nós: ${workflowData.config?.nodes?.length || workflowData.nodes?.length || 0}`);
    console.log(`🔗 Edges: ${workflowData.config?.edges?.length || workflowData.edges?.length || 0}`);
    
    // Converter para formato interno
    const nodes = (workflowData.config?.nodes || workflowData.nodes || []).map((node: any) => ({
      id: node.id,
      type: node.type,
      data: node.data || node.content || {},
      position: node.position || { x: 0, y: 0 },
      connections: node.connections || []
    }));
    
    const edges = (workflowData.config?.edges || workflowData.edges || []).map((edge: any) => ({
      id: edge.id || `${edge.source}_${edge.target}`,
      source: edge.source,
      target: edge.target,
      data: {
        port: edge.data?.port || edge.port || 'main',
        condition: edge.data?.condition || edge.condition
      },
      type: edge.type || 'smoothstep',
      animated: edge.animated || false
    }));
    
    // Desativar workflows existentes
    await prisma.workflow.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });
    
    // Criar ou atualizar o workflow
    const existingWorkflow = await prisma.workflow.findFirst({
      where: { name: workflowData.name }
    });
    
    let workflow;
    if (existingWorkflow) {
      workflow = await prisma.workflow.update({
        where: { id: existingWorkflow.id },
        data: {
          name: workflowData.name,
          description: workflowData.description || '',
          type: workflowData.type || 'CONSULTATION',
          isActive: true,
          config: {
            nodes,
            edges
          }
        }
      });
      console.log(`\n✅ Workflow atualizado: ${workflow.id}`);
    } else {
      workflow = await prisma.workflow.create({
        data: {
          name: workflowData.name,
          description: workflowData.description || '',
          type: workflowData.type || 'CONSULTATION',
          isActive: true,
          config: {
            nodes,
            edges
          }
        }
      });
      console.log(`\n✅ Workflow criado: ${workflow.id}`);
    }
    
    // Mostrar algumas posições para verificação
    console.log('\n📍 Posições dos primeiros nós:');
    nodes.slice(0, 10).forEach((node: any) => {
      console.log(`  - ${node.id} (${node.type}): x=${node.position.x}, y=${node.position.y}`);
    });
    
    console.log('\n🎉 Workflow importado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao importar workflow:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importWorkflowFromCommit();

