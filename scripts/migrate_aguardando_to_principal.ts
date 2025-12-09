/**
 * Script para migrar conversas com status 'AGUARDANDO' para 'PRINCIPAL'
 * 
 * Execute: npx ts-node scripts/migrate_aguardando_to_principal.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateAguardandoToPrincipal() {
  try {
    console.log('🔄 Iniciando migração de AGUARDANDO para PRINCIPAL...\n');

    // Contar conversas com status AGUARDANDO
    const count = await prisma.conversation.count({
      where: { status: 'AGUARDANDO' }
    });

    console.log(`📊 Encontradas ${count} conversas com status 'AGUARDANDO'\n`);

    if (count === 0) {
      console.log('✅ Nenhuma conversa para migrar. Tudo já está padronizado!');
      return;
    }

    // Atualizar todas as conversas
    const result = await prisma.conversation.updateMany({
      where: { status: 'AGUARDANDO' },
      data: { status: 'PRINCIPAL' }
    });

    console.log(`✅ ${result.count} conversas migradas com sucesso!`);
    console.log(`   Status alterado de 'AGUARDANDO' para 'PRINCIPAL'\n`);

    // Verificar se ainda há conversas com AGUARDANDO
    const remaining = await prisma.conversation.count({
      where: { status: 'AGUARDANDO' }
    });

    if (remaining === 0) {
      console.log('✅ Migração concluída! Todas as conversas agora usam status PRINCIPAL.');
    } else {
      console.log(`⚠️ Ainda existem ${remaining} conversas com status AGUARDANDO.`);
    }

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar migração
migrateAguardandoToPrincipal()
  .then(() => {
    console.log('\n✅ Script finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro ao executar script:', error);
    process.exit(1);
  });
