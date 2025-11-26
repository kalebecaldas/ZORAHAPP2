import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedProcedureTemplate() {
  try {
    console.log('🌱 Criando template padrão para informações de procedimentos...');

    // Check if template already exists
    const existing = await prisma.template.findUnique({
      where: { key: 'procedure_info_complete' }
    });

    const templateContent = `💉 *\${procedimento_nome}*

📝 *Descrição:*
\${procedimento_descricao}

⏱️ *Duração:* \${procedimento_duracao} minutos

💰 *Valor (Particular):* \${preco_particular}

\${pacotes_disponiveis}

\${convenios_aceitos}

💡 Valores com convênio podem variar. Consulte nossa equipe para valores específicos do seu plano.

📞 *Próximos passos:*
Para agendar uma sessão, entre em contato conosco ou use o comando de agendamento!`;

    const variables = [
      { name: 'procedimento_nome', description: 'Nome do procedimento', example: 'Acupuntura' },
      { name: 'procedimento_descricao', description: 'Descrição do procedimento', example: 'Técnica terapêutica com agulhas...' },
      { name: 'procedimento_duracao', description: 'Duração em minutos', example: '30' },
      { name: 'preco_particular', description: 'Preço para particular (pode ser texto formatado)', example: 'R$ 180.00' },
      { name: 'pacotes_disponiveis', description: 'Lista de pacotes formatada', example: '• Pacote de 10 sessões: R$ 1600.00...' },
      { name: 'convenios_aceitos', description: 'Lista de convênios formatada', example: '• BRADESCO\n• SULAMÉRICA...' },
      { name: 'tem_pacotes', description: 'Se tem pacotes (true/false)', example: 'true' },
      { name: 'tem_convenios', description: 'Se tem convênios (true/false)', example: 'true' },
      { name: 'total_convenios', description: 'Total de convênios', example: '15' }
    ];

    if (existing) {
      console.log('📝 Template já existe, atualizando...');
      await prisma.template.update({
        where: { id: existing.id },
        data: {
          content: templateContent,
          variables: variables as any,
          isActive: true
        }
      });
      console.log('✅ Template atualizado com sucesso!');
    } else {
      await prisma.template.create({
        data: {
          key: 'procedure_info_complete',
          category: 'procedures',
          title: 'Informação Completa de Procedimento',
          description: 'Template para exibir informações completas sobre um procedimento (nome, descrição, preço, pacotes, convênios)',
          content: templateContent,
          variables: variables as any,
          isActive: true
        }
      });
      console.log('✅ Template criado com sucesso!');
    }

    console.log('\n📋 Template disponível na aba Templates das Configurações!');
    console.log('   Chave: procedure_info_complete');
    console.log('   Categoria: procedures');
    console.log('\n💡 Você pode editar este template em: Configurações > Templates');

  } catch (error) {
    console.error('❌ Erro ao criar template:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedProcedureTemplate()
  .then(() => {
    console.log('\n✅ Processo concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro:', error);
    process.exit(1);
  });

