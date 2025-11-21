import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const templates = [
  // Categoria: Boas-vindas
  {
    key: 'welcome_initial',
    category: 'welcome',
    title: 'Mensagem Inicial',
    description: 'Mensagem de boas-vindas inicial pedindo seleção de unidade',
    content: 'Olá! Em qual unidade você gostaria de ser atendido(a)?\n\n1️⃣ Unidade Vieiralves 📍 Rua Rio Içá, 850 — Nossa Sra. das Graças\n2️⃣ Unidade São José 📍 Av. Autaz Mirim, 5773 — São José Operário\n\nResponda com 1 ou 2, ou digite o nome da unidade.',
    variables: [
      { name: 'clinica_nome', description: 'Nome da clínica', example: 'Clínica de Fisioterapia' }
    ],
    isActive: true
  },
  {
    key: 'welcome_unit_vieiralves',
    category: 'welcome',
    title: 'Confirmação Unidade Vieiralves',
    description: 'Mensagem após seleção da unidade Vieiralves',
    content: '✅ Você escolheu a Unidade Vieiralves!\n\nVocê pode perguntar sobre consultas, nossos procedimentos ou convênios. Se quiser agendar, diga que quer agendar.',
    variables: [],
    isActive: true
  },
  {
    key: 'welcome_unit_saojose',
    category: 'welcome',
    title: 'Confirmação Unidade São José',
    description: 'Mensagem após seleção da unidade São José',
    content: '✅ Você escolheu a Unidade São José!\n\nVocê pode perguntar sobre consultas, nossos procedimentos ou convênios. Se quiser agendar, diga que quer agendar.',
    variables: [],
    isActive: true
  },
  {
    key: 'welcome_options',
    category: 'welcome',
    title: 'Opções de Atendimento',
    description: 'Mensagem com opções disponíveis',
    content: 'Você pode perguntar sobre consultas, nossos procedimentos ou convênios. Se quiser agendar, diga que quer agendar.',
    variables: [],
    isActive: true
  },

  // Categoria: Unidades
  {
    key: 'unit_location',
    category: 'units',
    title: 'Localização da Unidade',
    description: 'Informações de localização completa',
    content: '📍 *Localização e Horários*\n\n• Unidade: ${unidade_nome}\n• Endereço: ${endereco}\n• Bairro: ${bairro}\n• Cidade: ${cidade}\n• Horário: ${horario_atendimento}\n• Contato: ${telefone_unidade}\n• Email: ${email_unidade}\n\n${maps_url ? `📍 Mapa: ${maps_url}` : ""}\n${estacionamento ? `🅿️ ${estacionamento}` : ""}\n${acessibilidade ? `♿ ${acessibilidade}` : ""}\n\nDeseja agendar ou saber valores?',
    variables: [
      { name: 'unidade_nome', description: 'Nome da unidade', example: 'Unidade Vieiralves' },
      { name: 'endereco', description: 'Endereço completo', example: 'Rua Rio Içá, 850' },
      { name: 'bairro', description: 'Bairro', example: 'Nossa Sra. das Graças' },
      { name: 'cidade', description: 'Cidade', example: 'Manaus' },
      { name: 'horario_atendimento', description: 'Horários', example: 'Seg-Sex: 8h-18h' },
      { name: 'telefone_unidade', description: 'Telefone da unidade', example: '(92) 3234-5678' },
      { name: 'email_unidade', description: 'Email da unidade', example: 'contato@clinica.com' },
      { name: 'maps_url', description: 'URL do Google Maps', example: 'https://maps.google.com/...' },
      { name: 'estacionamento', description: 'Estacionamento', example: 'Disponível' },
      { name: 'acessibilidade', description: 'Acessibilidade', example: 'Acessível' }
    ],
    isActive: true
  },
  {
    key: 'unit_hours',
    category: 'units',
    title: 'Horários de Funcionamento',
    description: 'Informações de horários',
    content: '🕐 *Horários de Funcionamento*\n\n${horario_atendimento}',
    variables: [
      { name: 'horario_atendimento', description: 'Horários de funcionamento', example: 'Seg-Sex: 8h-18h' }
    ],
    isActive: true
  },
  {
    key: 'unit_contact',
    category: 'units',
    title: 'Contato da Unidade',
    description: 'Informações de contato',
    content: '📞 *Contato*\n\nTelefone: ${telefone_unidade}\n${email_unidade ? `Email: ${email_unidade}` : ""}',
    variables: [
      { name: 'telefone_unidade', description: 'Telefone da unidade', example: '(92) 3234-5678' },
      { name: 'email_unidade', description: 'Email da unidade', example: 'contato@clinica.com' }
    ],
    isActive: true
  },

  // Categoria: Procedimentos
  {
    key: 'procedure_list_header',
    category: 'procedures',
    title: 'Cabeçalho Lista de Procedimentos',
    description: 'Cabeçalho para lista de procedimentos',
    content: '📋 *Procedimentos disponíveis:*',
    variables: [],
    isActive: true
  },
  {
    key: 'procedure_info',
    category: 'procedures',
    title: 'Informações do Procedimento',
    description: 'Informações detalhadas de um procedimento',
    content: '*${procedimento_nome}*\n\n${procedimento_descricao}\n\n⏱️ Duração: ${procedimento_duracao} min\n${informacoes_importantes ? `\n📌 ${informacoes_importantes}` : ""}',
    variables: [
      { name: 'procedimento_nome', description: 'Nome do procedimento', example: 'Acupuntura' },
      { name: 'procedimento_descricao', description: 'Descrição', example: 'Técnica de medicina chinesa...' },
      { name: 'procedimento_duracao', description: 'Duração em minutos', example: '60' },
      { name: 'informacoes_importantes', description: 'Informações importantes', example: 'Requer avaliação prévia' }
    ],
    isActive: true
  },
  {
    key: 'procedure_price_particular',
    category: 'procedures',
    title: 'Valor Particular',
    description: 'Preço para pacientes particulares',
    content: '💰 *Valor Particular*\n\nR$ ${preco_particular}',
    variables: [
      { name: 'preco_particular', description: 'Preço particular', example: '150.00' }
    ],
    isActive: true
  },
  {
    key: 'procedure_price_insurance',
    category: 'procedures',
    title: 'Valor com Convênio',
    description: 'Preço com convênio',
    content: '💰 *${convenio_nome}*\n\nR$ ${preco_convenio}${tem_desconto ? `\n\n🎉 Desconto de ${desconto_percentual}% aplicado!` : ""}',
    variables: [
      { name: 'convenio_nome', description: 'Nome do convênio', example: 'Bradesco' },
      { name: 'preco_convenio', description: 'Preço com convênio', example: '120.00' },
      { name: 'tem_desconto', description: 'Se tem desconto', example: 'true' },
      { name: 'desconto_percentual', description: 'Percentual de desconto', example: '20' }
    ],
    isActive: true
  },
  {
    key: 'procedure_discount',
    category: 'procedures',
    title: 'Mensagem de Desconto',
    description: 'Mensagem quando há desconto aplicado',
    content: '🎉 *Desconto Especial!*\n\nVocê tem ${desconto_percentual}% de desconto no ${convenio_nome}!',
    variables: [
      { name: 'desconto_percentual', description: 'Percentual de desconto', example: '20' },
      { name: 'convenio_nome', description: 'Nome do convênio', example: 'Bradesco' }
    ],
    isActive: true
  },

  // Categoria: Agendamento
  {
    key: 'scheduling_start',
    category: 'scheduling',
    title: 'Início do Agendamento',
    description: 'Mensagem inicial do fluxo de agendamento',
    content: 'Vamos agendar sua consulta. Vou coletar algumas informações.',
    variables: [],
    isActive: true
  },
  {
    key: 'scheduling_name',
    category: 'scheduling',
    title: 'Coleta de Nome',
    description: 'Solicitação do nome completo',
    content: '✍️ Informe seu nome completo:',
    variables: [],
    isActive: true
  },
  {
    key: 'scheduling_insurance',
    category: 'scheduling',
    title: 'Coleta de Convênio',
    description: 'Solicitação do convênio',
    content: '💳 Qual é seu convênio? (digite "particular" se não tiver)',
    variables: [],
    isActive: true
  },
  {
    key: 'scheduling_birthdate',
    category: 'scheduling',
    title: 'Coleta de Data de Nascimento',
    description: 'Solicitação da data de nascimento',
    content: '📆 Qual é sua data de nascimento? (Ex: 15/08/1990)',
    variables: [],
    isActive: true
  },
  {
    key: 'scheduling_email',
    category: 'scheduling',
    title: 'Coleta de Email',
    description: 'Solicitação do email (opcional)',
    content: '📧 Informe seu email (ou digite "não tenho" para pular):',
    variables: [],
    isActive: true
  },
  {
    key: 'scheduling_procedure',
    category: 'scheduling',
    title: 'Seleção de Procedimento',
    description: 'Solicitação do procedimento desejado',
    content: '📝 Qual procedimento você deseja? Você pode digitar o nome ou o número da lista.',
    variables: [],
    isActive: true
  },
  {
    key: 'scheduling_date',
    category: 'scheduling',
    title: 'Coleta de Data Preferida',
    description: 'Solicitação da data preferida',
    content: '📅 Qual data preferida para sua consulta? (Ex: 15/12/2024)',
    variables: [],
    isActive: true
  },
  {
    key: 'scheduling_shift',
    category: 'scheduling',
    title: 'Coleta de Turno',
    description: 'Solicitação do turno preferido',
    content: '🕐 Qual turno prefere? (Manhã, Tarde ou Noite)',
    variables: [],
    isActive: true
  },
  {
    key: 'scheduling_confirm',
    category: 'scheduling',
    title: 'Confirmação de Dados',
    description: 'Tela de confirmação dos dados coletados',
    content: '📋 *Confirme seus dados:*\n\n1. Nome: ${nome}\n2. Data de Nascimento: ${data_nascimento}\n3. Email: ${email || "Não informado"}\n4. Convênio: ${convenio || "Particular"}\n\n*Deseja alterar algum dado?*\n\nDigite o número do campo que deseja alterar ou digite *0* para confirmar e prosseguir.',
    variables: [
      { name: 'nome', description: 'Nome do paciente', example: 'João Silva' },
      { name: 'data_nascimento', description: 'Data de nascimento', example: '15/05/1990' },
      { name: 'email', description: 'Email', example: 'joao@email.com' },
      { name: 'convenio', description: 'Convênio', example: 'Bradesco' }
    ],
    isActive: true
  },
  {
    key: 'scheduling_success',
    category: 'scheduling',
    title: 'Sucesso no Agendamento',
    description: 'Mensagem de sucesso após confirmação',
    content: '✅ Dados confirmados! Intenção registrada: ${procedimento} em ${data_preferida} (${turno}). Vou encaminhar para nossa equipe.',
    variables: [
      { name: 'procedimento', description: 'Procedimento', example: 'Acupuntura' },
      { name: 'data_preferida', description: 'Data preferida', example: '15/12/2024' },
      { name: 'turno', description: 'Turno', example: 'Manhã' }
    ],
    isActive: true
  },

  // Categoria: Validações
  {
    key: 'error_insurance_not_found',
    category: 'validation',
    title: 'Convênio Não Encontrado',
    description: 'Erro quando convênio não é encontrado',
    content: 'Não encontrei este convênio. Digite "particular" ou informe um convênio aceito.',
    variables: [],
    isActive: true
  },
  {
    key: 'error_invalid_date',
    category: 'validation',
    title: 'Data Inválida',
    description: 'Erro quando data está em formato inválido',
    content: 'Data inválida. Use o formato DD/MM/AAAA (Ex: 15/08/1990)',
    variables: [],
    isActive: true
  },
  {
    key: 'error_procedure_not_available',
    category: 'validation',
    title: 'Procedimento Não Disponível',
    description: 'Erro quando procedimento não está disponível',
    content: 'Este procedimento não está disponível para este convênio. Por favor, escolha outro procedimento ou digite "particular".',
    variables: [],
    isActive: true
  },
  {
    key: 'error_invalid_data',
    category: 'validation',
    title: 'Dados Inconsistentes',
    description: 'Erro quando há dados inconsistentes',
    content: '⚠️ Dados inconsistentes detectados. Por favor, verifique e corrija as informações.',
    variables: [],
    isActive: true
  },

  // Categoria: Transferência
  {
    key: 'transfer_human',
    category: 'transfer',
    title: 'Transferência para Atendente',
    description: 'Mensagem ao transferir para atendente humano',
    content: 'Transferindo você para um atendente humano que cuidará do seu atendimento. Por favor, aguarde um momento.',
    variables: [],
    isActive: true
  },
  {
    key: 'transfer_farewell',
    category: 'transfer',
    title: 'Mensagem de Despedida',
    description: 'Mensagem final de despedida',
    content: 'Obrigado por entrar em contato! Se precisar de mais alguma coisa, estou à disposição. 😊',
    variables: [],
    isActive: true
  },
  {
    key: 'transfer_continue',
    category: 'transfer',
    title: 'Continuar Conversa',
    description: 'Mensagem para continuar a conversa',
    content: 'Deseja mais informações ou prefere agendar agora?',
    variables: [],
    isActive: true
  }
];

async function seedTemplates() {
  console.log('🌱 Populando templates iniciais...\n');
  
  try {
    let created = 0;
    let skipped = 0;
    
    for (const template of templates) {
      try {
        const existing = await prisma.template.findUnique({
          where: { key: template.key }
        });
        
        if (existing) {
          console.log(`⏭️  Template "${template.key}" já existe, pulando...`);
          skipped++;
          continue;
        }
        
        await prisma.template.create({
          data: {
            ...template,
            variables: template.variables as any
          }
        });
        
        console.log(`✅ Criado: ${template.key} (${template.category})`);
        created++;
      } catch (error: any) {
        console.error(`❌ Erro ao criar ${template.key}:`, error.message);
      }
    }
    
    console.log(`\n✅ Concluído!`);
    console.log(`📊 Criados: ${created}`);
    console.log(`📊 Ignorados (já existentes): ${skipped}`);
    console.log(`📊 Total: ${templates.length}`);
    
  } catch (error) {
    console.error('❌ Erro ao popular templates:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedTemplates();

