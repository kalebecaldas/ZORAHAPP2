export type TemplateCategory = 
  | 'welcome' 
  | 'units' 
  | 'procedures' 
  | 'insurance' 
  | 'scheduling' 
  | 'validation' 
  | 'transfer';

export interface TemplateVariable {
  name: string;
  description: string;
  example: string;
}

export interface Template {
  id: string;
  key: string;
  category: TemplateCategory;
  title: string;
  description: string;
  content: string;
  variables: TemplateVariable[];
  example?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplateContext {
  // Unidades
  unidade_nome?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  horario_atendimento?: string;
  telefone_unidade?: string;
  email_unidade?: string;
  maps_url?: string;
  estacionamento?: string;
  acessibilidade?: string;
  
  // Procedimentos
  procedimento_nome?: string;
  procedimento_descricao?: string;
  procedimento_duracao?: string;
  preco_particular?: string | number;
  informacoes_importantes?: string;
  pacotes_disponiveis?: string;
  convenios_aceitos?: string;
  tem_pacotes?: string;
  tem_convenios?: string;
  total_convenios?: string;
  
  // Convênios
  convenio_nome?: string;
  convenio_display?: string;
  preco_convenio?: string | number;
  desconto_percentual?: string | number;
  tem_desconto?: boolean;
  
  // Agendamento
  nome?: string;
  email?: string;
  data_nascimento?: string;
  telefone?: string;
  convenio?: string;
  procedimento?: string;
  data_preferida?: string;
  turno?: string;
  
  // Sistema
  clinica_nome?: string;
  data_atual?: string;
  hora_atual?: string;
}

export const TEMPLATE_CATEGORIES: Record<TemplateCategory, { label: string; icon: string; description: string }> = {
  welcome: {
    label: 'Boas-vindas e Saudações',
    icon: '👋',
    description: 'Mensagens de boas-vindas, seleção de unidade e confirmações'
  },
  units: {
    label: 'Informações de Unidades',
    icon: '📍',
    description: 'Localização, horários, contatos e informações das unidades'
  },
  procedures: {
    label: 'Procedimentos e Valores',
    icon: '💰',
    description: 'Lista de procedimentos, valores e informações de preços'
  },
  insurance: {
    label: 'Convênios',
    icon: '💳',
    description: 'Lista de convênios, cobertura e informações de planos'
  },
  scheduling: {
    label: 'Agendamento',
    icon: '📅',
    description: 'Mensagens de coleta de dados e confirmação de agendamento'
  },
  validation: {
    label: 'Validações e Erros',
    icon: '⚠️',
    description: 'Mensagens de erro e validação de dados'
  },
  transfer: {
    label: 'Transferência e Finalização',
    icon: '🔄',
    description: 'Transferência para atendente e mensagens de despedida'
  }
};

export const AVAILABLE_VARIABLES: Record<string, TemplateVariable[]> = {
  units: [
    { name: 'unidade_nome', description: 'Nome da unidade', example: 'Unidade Vieiralves' },
    { name: 'endereco', description: 'Endereço completo', example: 'Rua Rio Içá, 850' },
    { name: 'bairro', description: 'Bairro da unidade', example: 'Nossa Sra. das Graças' },
    { name: 'cidade', description: 'Cidade da unidade', example: 'Manaus' },
    { name: 'horario_atendimento', description: 'Horários de funcionamento', example: 'Seg-Sex: 8h-18h' },
    { name: 'telefone_unidade', description: 'Telefone da unidade', example: '(92) 3234-5678' },
    { name: 'email_unidade', description: 'Email da unidade', example: 'contato@clinica.com' },
    { name: 'maps_url', description: 'URL do Google Maps', example: 'https://maps.google.com/...' },
    { name: 'estacionamento', description: 'Informações de estacionamento', example: 'Estacionamento disponível' },
    { name: 'acessibilidade', description: 'Informações de acessibilidade', example: 'Acessível para cadeirantes' }
  ],
  procedures: [
    { name: 'procedimento_nome', description: 'Nome do procedimento', example: 'Acupuntura' },
    { name: 'procedimento_descricao', description: 'Descrição do procedimento', example: 'Técnica de medicina chinesa...' },
    { name: 'procedimento_duracao', description: 'Duração em minutos', example: '60' },
    { name: 'preco_particular', description: 'Preço para particular', example: '150.00' },
    { name: 'informacoes_importantes', description: 'Informações importantes do procedimento', example: 'Requer avaliação prévia' },
    { name: 'pacotes_disponiveis', description: 'Lista de pacotes disponíveis (formatada)', example: '• Pacote de 10 sessões: R$ 1600.00...' },
    { name: 'convenios_aceitos', description: 'Lista de convênios aceitos (formatada)', example: '• BRADESCO\n• SULAMÉRICA...' },
    { name: 'tem_pacotes', description: 'Se tem pacotes disponíveis (true/false)', example: 'true' },
    { name: 'tem_convenios', description: 'Se tem convênios aceitos (true/false)', example: 'true' },
    { name: 'total_convenios', description: 'Total de convênios aceitos', example: '15' }
  ],
  insurance: [
    { name: 'convenio_nome', description: 'Nome do convênio', example: 'Bradesco' },
    { name: 'convenio_display', description: 'Nome de exibição do convênio', example: 'Bradesco Saúde' },
    { name: 'preco_convenio', description: 'Preço com convênio', example: '120.00' },
    { name: 'desconto_percentual', description: 'Percentual de desconto', example: '20' },
    { name: 'tem_desconto', description: 'Se tem desconto (true/false)', example: 'true' }
  ],
  scheduling: [
    { name: 'nome', description: 'Nome do paciente', example: 'João Silva' },
    { name: 'email', description: 'Email do paciente', example: 'joao@email.com' },
    { name: 'data_nascimento', description: 'Data de nascimento', example: '15/05/1990' },
    { name: 'telefone', description: 'Telefone do paciente', example: '(92) 99999-9999' },
    { name: 'convenio', description: 'Convênio do paciente', example: 'Bradesco' },
    { name: 'procedimento', description: 'Procedimento desejado', example: 'Acupuntura' },
    { name: 'data_preferida', description: 'Data preferida', example: '15/12/2024' },
    { name: 'turno', description: 'Turno preferido', example: 'Manhã' }
  ],
  system: [
    { name: 'clinica_nome', description: 'Nome da clínica', example: 'Clínica de Fisioterapia' },
    { name: 'data_atual', description: 'Data atual', example: '21/11/2025' },
    { name: 'hora_atual', description: 'Hora atual', example: '14:30' }
  ]
};

