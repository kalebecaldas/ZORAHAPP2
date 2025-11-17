export const CLINIC_DATA = {
  name: 'Clínica de Fisioterapia e Acupuntura',
  address: 'Rua Rio Içá, 850 - Nossa Senhora das Graças, Manaus - AM',
  phone: '(92) 3584-2864',
  locations: [
    {
      name: 'Unidade Vieiralves',
      address: 'Rua Rio Içá, 850 - Nossa Senhora das Graças, Manaus - AM',
      phone: '(92) 3584-2864',
      mapUrl: 'https://maps.app.goo.gl/3FkWaZd1V3MB9TLP9',
      procedures: {
        particular: [
          { name: 'Fisioterapia Ortopédica', price: 90 },
          { name: 'Fisioterapia Neurológica', price: 100 },
          { name: 'Fisioterapia Respiratória', price: 100 },
          { name: 'Fisioterapia Pélvica', price: 220, requiresEvaluation: true },
          { name: 'Consulta Ortopedista', price: 400 },
          { name: 'Avaliação Acupuntura', price: 200, isEvaluation: true },
          { name: 'Acupuntura', price: 180 },
          { name: 'Avaliação Fisioterapia Pélvica', price: 250, isEvaluation: true },
          { name: 'RPG', price: 120 },
          { name: 'Pilates 2x na Semana', price: 39 },
          { name: 'Pilates 3x na Semana', price: 56 },
          { name: 'Pilates Sessão Avulsa', price: 70 },
          { name: 'Quiropraxia', price: 120 },
        ],
        packages: [
          { name: 'Fisioterapia Pélvica - 10 sessões', price: 1980, includesEvaluation: true },
          { name: 'Acupuntura - 10 sessões', price: 1620, includesEvaluation: true },
        ]
      }
    },
    {
      name: 'Unidade São José',
      address: 'Av. Autaz Mirim, 5773 - São José Operário, Manaus - AM',
      phone: '(92) XXXX-XXXX',
      mapUrl: 'https://maps.app.goo.gl/CdN3PYDkjkoQXzfRA',
      procedures: {
        particular: [
          { name: 'Fisioterapia Ortopédica', price: 45 },
          { name: 'Fisioterapia Neurológica', price: 60 },
          { name: 'Fisioterapia Respiratória', price: 60 },
          { name: 'Fisioterapia Pós-Operatória', price: 60 },
          { name: 'Acupuntura', price: 60 },
          { name: 'RPG', price: 50 },
          { name: 'Consulta Ortopédica', price: 200 },
          { name: 'Consulta Clínico Geral', price: 200 },
        ],
        packages: [
          { name: 'Fisioterapia Ortopédica - 10 sessões', price: 200 },
          { name: 'Fisioterapia Neurológica - 10 sessões', price: 500 },
          { name: 'Fisioterapia Respiratória - 10 sessões', price: 500 },
          { name: 'Fisioterapia Pós-Operatória - 10 sessões', price: 500 },
          { name: 'Acupuntura - 10 sessões', price: 400 },
          { name: 'RPG - 10 sessões', price: 350 },
        ]
      }
    }
  ],
  insurancePlans: {
    'BRADESCO': [
      'Acupuntura', 'Consulta com Ortopedista', 'Fisioterapia Neurológica',
      'Fisioterapia Ortopédica', 'Fisioterapia Pélvica',
      'Infiltração de ponto gatilho e Agulhamento a seco', 'RPG'
    ],
    'SULAMERICA': [
      'Acupuntura', 'Estimulação Elétrica Transcutânea',
      'Fisioterapia Neurológica', 'Fisioterapia Ortopédica', 'Fisioterapia Pélvica'
    ],
    'MEDISERVICE': [
      'Acupuntura', 'Consulta com Ortopedista', 'Fisioterapia Neurológica',
      'Fisioterapia Ortopédica', 'Fisioterapia Pélvica',
      'Infiltração de ponto gatilho e Agulhamento a seco', 'RPG'
    ],
    'SAÚDE CAIXA': [
      'Acupuntura', 'Consulta com Ortopedista', 'Fisioterapia Neurológica',
      'Fisioterapia Ortopédica', 'Fisioterapia Pélvica', 'Terapias por ondas de Choque'
    ],
    'PETROBRAS': [
      'Fisioterapia Neurológica', 'Fisioterapia Ortopédica', 'Fisioterapia Pélvica', 'RPG'
    ],
    'GEAP': [
      'Consulta com Ortopedista', 'Fisioterapia Neurológica', 'Fisioterapia Ortopédica'
    ],
    'PRO SOCIAL': [
      'Acupuntura', 'Consulta Ortopédica', 'Fisioterapia Neurológica',
      'Fisioterapia Ortopédica', 'Fisioterapia Pélvica', 'Fisioterapia Respiratória',
      'Infiltração de ponto gatilho e Agulhamento a seco', 'RPG'
    ],
    'POSTAL SAÚDE': [
      'Acupuntura', 'Consulta com Ortopedista', 'Fisioterapia Neurológica',
      'Fisioterapia Ortopédica', 'Fisioterapia Pélvica', 'RPG'
    ],
    'CONAB': [
      'Acupuntura', 'Consulta com Ortopedista', 'Estimulação elétrica transcutânea (TENS)',
      'Fisioterapia Neurológica', 'Fisioterapia Ortopédica', 'Fisioterapia Pélvica',
      'Fisioterapia Respiratória', 'Infiltração de ponto gatilho', 'RPG'
    ],
    'AFFEAM': [
      'Acupuntura', 'Consulta Ortopédica', 'Fisioterapia Neurológica',
      'Fisioterapia Ortopédica', 'Fisioterapia Pélvica', 'Fisioterapia Respiratória'
    ],
    'AMBEP': [
      'Acupuntura', 'Fisioterapia Neurológica', 'Fisioterapia Ortopédica',
      'Fisioterapia Pélvica', 'Fisioterapia Respiratória', 'RPG'
    ],
    'GAMA': [
      'Acupuntura', 'Consulta Ortopédica', 'Fisioterapia Neurológica',
      'Fisioterapia Ortopédica', 'Fisioterapia Respiratória'
    ],
    'LIFE': [
      'Acupuntura', 'Fisioterapia Neurológica', 'Fisioterapia Ortopédica',
      'Fisioterapia Pélvica', 'Fisioterapia Respiratória', 'RPG'
    ],
    'NOTREDAME': [
      'Acupuntura', 'Fisioterapia Neurológica', 'Fisioterapia Ortopédica',
      'Fisioterapia Pélvica', 'RPG'
    ],
    'OAB': [
      'Acupuntura', 'Consulta Ortopédica', 'Fisioterapia Neurológica',
      'Fisioterapia Ortopédica', 'Fisioterapia Respiratória', 'RPG'
    ],
    'ADEPOL': ['DESCONTO disponível'],
    'BEM CARE': ['DESCONTO disponível'],
    'BEMOL': ['DESCONTO disponível'],
    'CAPESAUDE': ['Acupuntura'],
    'CASEMBRAPA': [
      'Fisioterapia Neurológica', 'Fisioterapia Ortopédica',
      'Fisioterapia Pélvica', 'RPG'
    ],
    'CLUBSAUDE': ['DESCONTO disponível'],
    'CULTURAL': [
      'Acupuntura', 'Fisioterapia Neurológica', 'Fisioterapia Ortopédica',
      'Fisioterapia Pélvica', 'Fisioterapia Respiratória', 'RPG'
    ],
    'EVIDA': [
      'Acupuntura', 'Consulta Ortopédica', 'Fisioterapia Neurológica',
      'Fisioterapia Ortopédica', 'Fisioterapia Respiratória', 'RPG'
    ],
    'FOGAS': [
      'Acupuntura', 'Fisioterapia Neurológica', 'Fisioterapia Ortopédica',
      'Fisioterapia Respiratória', 'RPG'
    ],
    'FUSEX': [
      'Acupuntura', 'Consulta Ortopédica', 'Fisioterapia Neurológica',
      'Fisioterapia Ortopédica', 'Fisioterapia Pélvica', 'Quiropraxia', 'RPG'
    ],
    'PLAN-ASSITE': [
      'Acupuntura', 'Consulta Ortopédica', 'Fisioterapia Pélvica',
      'Fisioterapia Neurológica', 'Fisioterapia Ortopédica', 'RPG'
    ],
    'PRO-SAUDE': ['DESCONTO disponível'],
    'VITA': ['DESCONTO disponível']
  },
  businessHours: {
    weekdays: '08:00 - 18:00',
    saturday: '08:00 - 12:00',
    sunday: 'Fechado'
  }
}
