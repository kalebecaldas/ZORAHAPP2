export const clinicData = {
  name: 'Clínica de Fisioterapia',
  specialties: [
    'Fisioterapia Pélvica',
    'RPG - Reeducação Postural Global',
    'Acupuntura',
    'Pilates'
  ],
  businessHours: {
    weekdays: '08:00 - 19:00',
    saturday: '08:00 - 13:00',
    sunday: 'Fechado'
  },
  insurance: [
    'Amil',
    'Bradesco Saúde',
    'Unimed',
    'SulAmérica',
    'NotreDame Intermédica',
    'Hapvida',
    'Outros'
  ],
  insuranceCompanies: [
    { id: 'amil', name: 'Amil', description: 'Uma das maiores operadoras de saúde do Brasil' },
    { id: 'bradesco', name: 'Bradesco Saúde', description: 'Plano de saúde do Grupo Bradesco' },
    { id: 'unimed', name: 'Unimed', description: 'Cooperativa médica presente em todo Brasil' },
    { id: 'sulamerica', name: 'SulAmérica', description: 'Uma das líderes em seguros e saúde' },
    { id: 'notredame', name: 'NotreDame Intermédica', description: 'Referência em planos de saúde' },
    { id: 'hapvida', name: 'Hapvida', description: 'Grupo de saúde com forte presença nacional' },
    { id: 'outros', name: 'Outros', description: 'Outras operadoras de saúde' }
  ],
  procedures: [
    {
      id: 'fisioterapiaPelve',
      name: 'Fisioterapia Pélvica',
      description: 'Tratamento especializado para disfunções do assoalho pélvico',
      duration: 60,
      price: 200.00,
      requiresEvaluation: true,
      evaluationPrice: 250.00,
      sessionPrice: 200.00,
      requiresPreparation: false
    },
    {
      id: 'rpg',
      name: 'RPG - Reeducação Postural Global',
      description: 'Método de reeducação postural para correção de desvios',
      duration: 45,
      price: 180.00,
      requiresEvaluation: true,
      evaluationPrice: 250.00,
      sessionPrice: 180.00,
      requiresPreparation: false
    },
    {
      id: 'acupuntura',
      name: 'Acupuntura',
      description: 'Técnica milenar para tratamento de dores e desequilíbrios',
      duration: 30,
      price: 150.00,
      requiresEvaluation: true,
      evaluationPrice: 250.00,
      sessionPrice: 150.00,
      requiresPreparation: false
    },
    {
      id: 'pilates',
      name: 'Pilates',
      description: 'Método de exercícios para fortalecimento e flexibilidade',
      duration: 50,
      price: 120.00,
      requiresEvaluation: true,
      evaluationPrice: 250.00,
      sessionPrice: 120.00,
      requiresPreparation: false
    }
  ],
  locations: [
    {
      id: 'principal',
      name: 'Sede Principal - Centro',
      address: 'Rua Principal, 123 - Centro',
      phone: '(11) 1234-5678'
    },
    {
      id: 'jardins',
      name: 'Unidade II - Jardins',
      address: 'Rua dos Jardins, 456 - Jardins',
      phone: '(11) 2345-6789'
    },
    {
      id: 'pinheiros',
      name: 'Unidade III - Pinheiros',
      address: 'Rua Pinheiros, 789 - Pinheiros',
      phone: '(11) 3456-7890'
    }
  ]
};