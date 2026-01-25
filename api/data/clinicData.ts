// Comprehensive clinic data for intelligent bot responses
export interface Procedure {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  insuranceAccepted: string[];
  requiresEvaluation: boolean;
  duration: number; // in minutes
  categories: string[];
  specialNotes?: string;
  availability?: { [day: string]: string };
  priceByLocation?: Record<string, number>;
}

export interface InsuranceCompany {
  id: string;
  name: string;
  displayName: string;
  procedures: string[]; // procedure IDs
  coveragePercentage: number; // 0-100
  copayment: number; // fixed copayment amount
  requiresPreAuthorization: boolean;
  contactInfo: {
    phone: string;
    email?: string;
    website?: string;
  };
  discount?: boolean;
  notes?: string;
}

export interface ClinicLocation {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  openingHours: {
    [key: string]: string; // day: hours
  };
  coordinates: {
    lat: number;
    lng: number;
  };
  specialties: string[];
  parkingAvailable: boolean;
  accessibility: string[];
  mapUrl?: string;
}

export interface AppointmentSlot {
  id: string;
  locationId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // minutes
  available: boolean;
  procedureId?: string;
}

// Clinic procedures database
export const procedures: Procedure[] = [
  {
    id: 'fisioterapia-pelvica',
    name: 'Fisioterapia Pélvica',
    description: 'Tratamento especializado para disfunções do assoalho pélvico',
    basePrice: 220,
    insuranceAccepted: ['unimed', 'bradesco', 'amil'],
    requiresEvaluation: true,
    duration: 40,
    categories: ['fisioterapia', 'especializada'],
    specialNotes: 'Requer avaliação específica e prévia autorização do convênio'
  },
  {
    id: 'acupuntura',
    name: 'Acupuntura',
    description: 'Tratamento com acupuntura para dor e equilíbrio energético',
    basePrice: 180,
    insuranceAccepted: ['unimed', 'bradesco', 'sulamerica'],
    requiresEvaluation: true,
    duration: 30,
    categories: ['acupuntura', 'tradicional'],
    specialNotes: 'Requer avaliação prévia e indicação médica',
    priceByLocation: { 'sao-jose': 60 }
  },
  {
    id: 'pilates-solo',
    name: 'Pilates no Solo',
    description: 'Exercícios de pilates sem equipamentos para fortalecimento muscular',
    basePrice: 120,
    insuranceAccepted: ['unimed', 'bradesco', 'amil', 'hapvida'],
    requiresEvaluation: false,
    duration: 50,
    categories: ['pilates', 'fortalecimento']
  },
  {
    id: 'pilates-aparelhos',
    name: 'Pilates em Aparelhos',
    description: 'Pilates com equipamentos especializados para reabilitação',
    basePrice: 200,
    insuranceAccepted: ['unimed', 'bradesco', 'sulamerica'],
    requiresEvaluation: true,
    duration: 50,
    categories: ['pilates', 'reabilitação']
  },
  {
    id: 'rpg',
    name: 'RPG - Reeducação Postural Global',
    description: 'Método de tratamento para correção postural e alívio de dores',
    basePrice: 120,
    insuranceAccepted: ['unimed', 'bradesco', 'amil'],
    requiresEvaluation: true,
    duration: 30,
    categories: ['postura', 'reeducação'],
    priceByLocation: { 'sao-jose': 50 }
  },
  {
    id: 'ventosaterapia',
    name: 'Ventosaterapia',
    description: 'Terapia com ventosas para alívio de tensões musculares',
    basePrice: 100,
    insuranceAccepted: ['unimed', 'bradesco'],
    requiresEvaluation: false,
    duration: 30,
    categories: ['terapia-complementar']
  },
  {
    id: 'liberacao-miofascial',
    name: 'Liberação Miofascial',
    description: 'Técnica para liberação de tensões na fáscia muscular',
    basePrice: 160,
    insuranceAccepted: ['unimed', 'bradesco', 'sulamerica', 'amil'],
    requiresEvaluation: false,
    duration: 45,
    categories: ['fisioterapia', 'miofascial']
  },
  {
    id: 'crioterapia',
    name: 'Crioterapia',
    description: 'Tratamento com gelo para controle de inflamação e dor',
    basePrice: 80,
    insuranceAccepted: ['unimed', 'bradesco', 'sulamerica', 'amil', 'hapvida'],
    requiresEvaluation: false,
    duration: 20,
    categories: ['terapia-complementar']
  },
  {
    id: 'eletroterapia',
    name: 'Eletroterapia',
    description: 'Uso de correntes elétricas para tratamento de dores e lesões',
    basePrice: 90,
    insuranceAccepted: ['unimed', 'bradesco', 'sulamerica', 'amil', 'hapvida'],
    requiresEvaluation: false,
    duration: 25,
    categories: ['fisioterapia', 'eletroterapia']
  },
  {
    id: 'consulta-ortopedista',
    name: 'Consulta com Ortopedista',
    description: 'Avaliação médica ortopédica',
    basePrice: 400,
    insuranceAccepted: ['unimed', 'bradesco'],
    requiresEvaluation: false,
    duration: 30,
    categories: ['consulta'],
    priceByLocation: { 'sao-jose': 200 }
  },
  {
    id: 'consulta-clinico-geral',
    name: 'Consulta Clínico Geral',
    description: 'Consulta com clínico geral',
    basePrice: 200,
    insuranceAccepted: ['particular'],
    requiresEvaluation: false,
    duration: 30,
    categories: ['consulta'],
    priceByLocation: { 'sao-jose': 200 }
  },
  {
    id: 'fisioterapia-neurologica',
    name: 'Fisioterapia Neurológica',
    description: 'Tratamento para disfunções neurológicas',
    basePrice: 100,
    insuranceAccepted: ['unimed', 'bradesco', 'sulamerica'],
    requiresEvaluation: true,
    duration: 40,
    categories: ['fisioterapia'],
    priceByLocation: { 'sao-jose': 60 }
  },
  {
    id: 'fisioterapia-ortopedica',
    name: 'Fisioterapia Ortopédica',
    description: 'Reabilitação ortopédica',
    basePrice: 90,
    insuranceAccepted: ['unimed', 'bradesco', 'sulamerica'],
    requiresEvaluation: true,
    duration: 30,
    categories: ['fisioterapia'],
    priceByLocation: { 'sao-jose': 45 }
  },
  {
    id: 'fisioterapia-respiratoria',
    name: 'Fisioterapia Respiratória',
    description: 'Tratamento de função respiratória',
    basePrice: 100,
    insuranceAccepted: ['bradesco'],
    requiresEvaluation: true,
    duration: 30,
    categories: ['fisioterapia'],
    priceByLocation: { 'sao-jose': 60 }
  },
  {
    id: 'fisioterapia-pos-operatoria',
    name: 'Fisioterapia Pós Operatória',
    description: 'Reabilitação pós-operatória',
    basePrice: 60,
    insuranceAccepted: ['particular'],
    requiresEvaluation: true,
    duration: 30,
    categories: ['fisioterapia']
  },
  {
    id: 'avaliacao-acupuntura',
    name: 'Avaliação Acupuntura',
    description: 'Avaliação inicial para acupuntura',
    basePrice: 200,
    insuranceAccepted: ['particular'],
    requiresEvaluation: false,
    duration: 30,
    categories: ['acupuntura']
  },
  {
    id: 'avaliacao-fisio-pelvica',
    name: 'Avaliação Fisioterapia Pélvica',
    description: 'Avaliação inicial para fisioterapia pélvica',
    basePrice: 250,
    insuranceAccepted: ['particular'],
    requiresEvaluation: false,
    duration: 30,
    categories: ['fisioterapia']
  },
  {
    id: 'pilates-2x',
    name: 'Pilates 2x na Semana',
    description: 'Plano de pilates duas vezes por semana',
    basePrice: 39,
    insuranceAccepted: ['particular'],
    requiresEvaluation: false,
    duration: 50,
    categories: ['pilates']
  },
  {
    id: 'pilates-3x',
    name: 'Pilates 3x na Semana',
    description: 'Plano de pilates três vezes por semana',
    basePrice: 56,
    insuranceAccepted: ['particular'],
    requiresEvaluation: false,
    duration: 50,
    categories: ['pilates']
  },
  {
    id: 'pilates-avulsa',
    name: 'Pilates Sessão Avulsa',
    description: 'Sessão única de pilates',
    basePrice: 70,
    insuranceAccepted: ['particular'],
    requiresEvaluation: false,
    duration: 50,
    categories: ['pilates']
  },
  {
    id: 'quiropraxia',
    name: 'Quiropraxia',
    description: 'Técnicas de ajuste articular',
    basePrice: 120,
    insuranceAccepted: ['fusex'],
    requiresEvaluation: false,
    duration: 60,
    categories: ['terapia-complementar'],
    availability: {
      'Quarta': '14:00 - 17:00',
      'Sábado': '09:00 - 12:00'
    }
  },
  {
    id: 'tens',
    name: 'Estimulação Elétrica Transcutânea (TENS)',
    description: 'Terapia com estimulação transcutânea',
    basePrice: 80,
    insuranceAccepted: ['sulamerica', 'conab'],
    requiresEvaluation: false,
    duration: 20,
    categories: ['terapia-complementar']
  },
  {
    id: 'ondas-de-choque',
    name: 'Terapias por Ondas de Choque',
    description: 'Terapia por ondas para dor e inflamação',
    basePrice: 0,
    insuranceAccepted: ['saude-caixa'],
    requiresEvaluation: true,
    duration: 30,
    categories: ['terapia-complementar']
  },
  {
    id: 'infiltracao-ponto-gatilho',
    name: 'Infiltração de Ponto Gatilho',
    description: 'Infiltração para alívio de pontos gatilho',
    basePrice: 0,
    insuranceAccepted: ['mediservice', 'pro-social', 'conab'],
    requiresEvaluation: true,
    duration: 30,
    categories: ['terapia-complementar']
  },
  {
    id: 'agulhamento-seco',
    name: 'Agulhamento a Seco',
    description: 'Técnica de agulhamento seco',
    basePrice: 0,
    insuranceAccepted: ['mediservice', 'pro-social'],
    requiresEvaluation: true,
    duration: 30,
    categories: ['terapia-complementar']
  },
];

// Insurance companies database
export const insuranceCompanies: InsuranceCompany[] = [
  {
    id: 'unimed',
    name: 'Unimed',
    displayName: 'Unimed',
    procedures: ['fisioterapia-pelvica', 'acupuntura', 'pilates-solo', 'pilates-aparelhos', 'rpg', 'ventosaterapia', 'liberacao-miofascial', 'crioterapia', 'eletroterapia','fisioterapia-neurologica','fisioterapia-ortopedica'],
    coveragePercentage: 80,
    copayment: 0,
    requiresPreAuthorization: true,
    contactInfo: {
      phone: '0800 701 1516',
      website: 'https://www.unimed.coop.br'
    }
  },
  {
    id: 'bradesco',
    name: 'Bradesco Saúde',
    displayName: 'Bradesco',
    procedures: ['acupuntura', 'pilates-solo', 'rpg', 'ventosaterapia', 'liberacao-miofascial', 'crioterapia', 'eletroterapia','fisioterapia-neurologica','fisioterapia-ortopedica','fisioterapia-pelvica','fisioterapia-respiratoria'],
    coveragePercentage: 70,
    copayment: 50,
    requiresPreAuthorization: false,
    contactInfo: {
      phone: '0800 701 1515',
      website: 'https://www.bradescosaude.com.br'
    }
  },
  {
    id: 'sulamerica',
    name: 'SulAmérica',
    displayName: 'SulAmérica',
    procedures: ['acupuntura', 'pilates-aparelhos', 'liberacao-miofascial', 'crioterapia', 'eletroterapia','tens','fisioterapia-neurologica','fisioterapia-ortopedica','fisioterapia-pelvica'],
    coveragePercentage: 75,
    copayment: 45,
    requiresPreAuthorization: true,
    contactInfo: {
      phone: '0800 727 2121',
      website: 'https://www.sulamerica.com.br'
    }
  },
  {
    id: 'amil',
    name: 'Amil',
    displayName: 'Amil',
    procedures: ['fisioterapia-pelvica', 'pilates-solo', 'rpg', 'liberacao-miofascial', 'crioterapia', 'eletroterapia','fisioterapia-ortopedica'],
    coveragePercentage: 85,
    copayment: 30,
    requiresPreAuthorization: false,
    contactInfo: {
      phone: '0800 701 1515',
      website: 'https://www.amil.com.br'
    }
  },
  {
    id: 'hapvida',
    name: 'Hapvida',
    displayName: 'Hapvida',
    procedures: ['pilates-solo', 'crioterapia', 'eletroterapia','fisioterapia-ortopedica'],
    coveragePercentage: 60,
    copayment: 72,
    requiresPreAuthorization: false,
    contactInfo: {
      phone: '0800 707 1515',
      website: 'https://www.hapvida.com.br'
    }
  },
  {
    id: 'mediservice',
    name: 'Mediservice',
    displayName: 'Mediservice',
    procedures: ['acupuntura','consulta-ortopedista','fisioterapia-neurologica','fisioterapia-ortopedica','fisioterapia-pelvica','infiltracao-ponto-gatilho','agulhamento-seco','rpg'],
    coveragePercentage: 70,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' }
  },
  {
    id: 'saude-caixa',
    name: 'Saúde Caixa',
    displayName: 'Saúde Caixa',
    procedures: ['acupuntura','consulta-ortopedista','fisioterapia-neurologica','fisioterapia-ortopedica','fisioterapia-pelvica','ondas-de-choque'],
    coveragePercentage: 70,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' }
  },
  {
    id: 'petrobras',
    name: 'Petrobras',
    displayName: 'Petrobras',
    procedures: ['fisioterapia-neurologica','fisioterapia-ortopedica','fisioterapia-pelvica','rpg'],
    coveragePercentage: 70,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' }
  },
  {
    id: 'geap',
    name: 'GEAP',
    displayName: 'GEAP',
    procedures: ['consulta-ortopedista','fisioterapia-neurologica','fisioterapia-ortopedica'],
    coveragePercentage: 70,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' }
  },
  {
    id: 'pro-social',
    name: 'Pro Social',
    displayName: 'Pro Social',
    procedures: ['acupuntura','consulta-ortopedista','fisioterapia-neurologica','fisioterapia-ortopedica','fisioterapia-pelvica','fisioterapia-respiratoria','infiltracao-ponto-gatilho','agulhamento-seco','rpg'],
    coveragePercentage: 70,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' }
  },
  {
    id: 'postal-saude',
    name: 'Postal Saúde',
    displayName: 'Postal Saúde',
    procedures: ['acupuntura','consulta-ortopedista','fisioterapia-neurologica','fisioterapia-ortopedica','fisioterapia-pelvica','rpg'],
    coveragePercentage: 70,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' }
  },
  {
    id: 'conab',
    name: 'CONAB',
    displayName: 'CONAB',
    procedures: ['acupuntura','consulta-ortopedista','tens','fisioterapia-neurologica','fisioterapia-ortopedica','fisioterapia-pelvica','fisioterapia-respiratoria','infiltracao-ponto-gatilho','rpg'],
    coveragePercentage: 70,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' }
  },
  {
    id: 'affeam',
    name: 'AFFEAM',
    displayName: 'AFFEAM',
    procedures: ['acupuntura','consulta-ortopedista','fisioterapia-neurologica','fisioterapia-ortopedica','fisioterapia-pelvica','fisioterapia-respiratoria'],
    coveragePercentage: 70,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' }
  },
  {
    id: 'ambep',
    name: 'AMBEP',
    displayName: 'AMBEP',
    procedures: ['acupuntura','fisioterapia-neurologica','fisioterapia-ortopedica','fisioterapia-pelvica','fisioterapia-respiratoria','rpg'],
    coveragePercentage: 70,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' }
  },
  {
    id: 'gama',
    name: 'GAMA',
    displayName: 'GAMA',
    procedures: ['acupuntura','consulta-ortopedista','fisioterapia-neurologica','fisioterapia-ortopedica','fisioterapia-respiratoria'],
    coveragePercentage: 70,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' }
  },
  {
    id: 'life',
    name: 'LIFE',
    displayName: 'LIFE',
    procedures: ['acupuntura','fisioterapia-neurologica','fisioterapia-ortopedica','fisioterapia-pelvica','fisioterapia-respiratoria','rpg'],
    coveragePercentage: 70,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' }
  },
  {
    id: 'notredame',
    name: 'NotreDame',
    displayName: 'Notredame',
    procedures: ['acupuntura','fisioterapia-neurologica','fisioterapia-ortopedica','fisioterapia-pelvica','rpg'],
    coveragePercentage: 70,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' }
  },
  {
    id: 'oab',
    name: 'OAB',
    displayName: 'OAB',
    procedures: ['acupuntura','consulta-ortopedista','fisioterapia-neurologica','fisioterapia-ortopedica','fisioterapia-respiratoria','rpg'],
    coveragePercentage: 70,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' }
  },
  {
    id: 'capesaude',
    name: 'CAPESAUDE',
    displayName: 'CAPESAUDE',
    procedures: ['acupuntura'],
    coveragePercentage: 70,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' }
  },
  {
    id: 'casembrapa',
    name: 'CASEMBRAPA',
    displayName: 'CASEMBRAPA',
    procedures: ['fisioterapia-neurologica','fisioterapia-ortopedica','fisioterapia-pelvica','rpg'],
    coveragePercentage: 70,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' }
  },
  {
    id: 'clubsaude',
    name: 'CLUBSAUDE',
    displayName: 'CLUBSAUDE',
    procedures: ['acupuntura'],
    coveragePercentage: 70,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' },
    discount: true,
    notes: 'Convênio com desconto'
  },
  {
    id: 'cultural',
    name: 'CULTURAL',
    displayName: 'Cultural',
    procedures: ['acupuntura','fisioterapia-neurologica','fisioterapia-ortopedica','fisioterapia-pelvica','fisioterapia-respiratoria','rpg'],
    coveragePercentage: 70,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' }
  },
  {
    id: 'evida',
    name: 'EVIDA',
    displayName: 'Evida',
    procedures: ['acupuntura','consulta-ortopedista','fisioterapia-neurologica','fisioterapia-ortopedica','fisioterapia-respiratoria','rpg'],
    coveragePercentage: 70,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' }
  },
  {
    id: 'fogas',
    name: 'FOGAS',
    displayName: 'Fogas',
    procedures: ['acupuntura','fisioterapia-neurologica','fisioterapia-ortopedica','fisioterapia-respiratoria'],
    coveragePercentage: 70,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' }
  },
  {
    id: 'fusex',
    name: 'FUSEX',
    displayName: 'FUSEX',
    procedures: ['acupuntura','consulta-ortopedista','fisioterapia-neurologica','fisioterapia-ortopedica','fisioterapia-pelvica','quiropraxia','rpg'],
    coveragePercentage: 70,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' }
  },
  {
    id: 'plan-assite',
    name: 'PLAN-ASSITE',
    displayName: 'Plan-Assite',
    procedures: ['acupuntura','consulta-ortopedista','fisioterapia-pelvica','fisioterapia-neurologica','fisioterapia-ortopedica','rpg'],
    coveragePercentage: 70,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' }
  }
  ,
  {
    id: 'adepol',
    name: 'ADEPOL',
    displayName: 'ADEPOL',
    procedures: ['acupuntura','fisioterapia-neurologica','fisioterapia-ortopedica','rpg'],
    coveragePercentage: 0,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' },
    discount: true,
    notes: 'Convênio com desconto'
  },
  {
    id: 'bem-care',
    name: 'Bem Care',
    displayName: 'Bem Care',
    procedures: ['acupuntura','fisioterapia-ortopedica','fisioterapia-neurologica'],
    coveragePercentage: 0,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' },
    discount: true,
    notes: 'Convênio com desconto'
  },
  {
    id: 'bemol',
    name: 'Bemol',
    displayName: 'Bemol',
    procedures: ['acupuntura','fisioterapia-ortopedica','fisioterapia-neurologica'],
    coveragePercentage: 0,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' },
    discount: true,
    notes: 'Convênio com desconto'
  },
  {
    id: 'pro-saude',
    name: 'Pro-Saúde',
    displayName: 'Pro-Saúde',
    procedures: ['acupuntura','fisioterapia-ortopedica','fisioterapia-neurologica','fisioterapia-pelvica','rpg'],
    coveragePercentage: 0,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' },
    discount: true,
    notes: 'Convênio com desconto'
  },
  {
    id: 'vita',
    name: 'VITA',
    displayName: 'VITA',
    procedures: ['acupuntura','fisioterapia-ortopedica','fisioterapia-neurologica','fisioterapia-pelvica','fisioterapia-respiratoria','rpg'],
    coveragePercentage: 0,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' },
    discount: true,
    notes: 'Convênio com desconto'
  }
  ,
  {
    id: 'particular-vieiralves',
    name: 'Convênio Particular Vieiralves',
    displayName: 'Convênio Particular Vieiralves',
    procedures: ['fisioterapia-ortopedica','fisioterapia-neurologica','fisioterapia-respiratoria','fisioterapia-pelvica','consulta-ortopedista','avaliacao-acupuntura','acupuntura','avaliacao-fisio-pelvica','rpg','pilates-2x','pilates-3x','pilates-avulsa','quiropraxia','consulta-clinico-geral','fisioterapia-pos-operatoria'],
    coveragePercentage: 100,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' }
  },
  {
    id: 'particular-sao-jose',
    name: 'Convênio Particular São José',
    displayName: 'Convênio Particular São José',
    procedures: ['fisioterapia-ortopedica','fisioterapia-neurologica','fisioterapia-respiratoria','fisioterapia-pelvica','consulta-ortopedista','avaliacao-acupuntura','acupuntura','avaliacao-fisio-pelvica','rpg','pilates-2x','pilates-3x','pilates-avulsa','quiropraxia','consulta-clinico-geral','fisioterapia-pos-operatoria'],
    coveragePercentage: 100,
    copayment: 0,
    requiresPreAuthorization: false,
    contactInfo: { phone: '' }
  }
];

// Clinic locations database
export const clinicLocations: ClinicLocation[] = [
  {
    id: 'vieiralves',
    name: 'Clínica Vieiralves',
    address: 'Rua Rio Içá, 850',
    neighborhood: 'Nossa Sra. das Graças',
    city: 'Manaus',
    state: 'AM',
    zipCode: '69053-100',
    phone: '(92) 3234-5678',
    email: 'vieiralves@clinicafisioterapia.com.br',
    openingHours: {
      'Segunda': '08:00 - 18:00',
      'Terça': '08:00 - 18:00',
      'Quarta': '08:00 - 18:00',
      'Quinta': '08:00 - 18:00',
      'Sexta': '08:00 - 18:00',
      'Sábado': '08:00 - 12:00',
      'Domingo': 'Fechado'
    },
    coordinates: { lat: -3.1195, lng: -60.0217 },
    specialties: ['Fisioterapia Ortopédica', 'Fisioterapia Pélvica', 'Acupuntura', 'Pilates'],
    parkingAvailable: true,
    accessibility: ['Acesso para cadeirantes', 'Elevador', 'Banheiro adaptado'],
    mapUrl: 'https://maps.app.goo.gl/3FkWaZd1V3MB9TLP9'
  },
  {
    id: 'sao-jose',
    name: 'Clínica São José',
    address: 'Av. Autaz Mirim, 5773',
    neighborhood: 'São José Operário',
    city: 'Manaus',
    state: 'AM',
    zipCode: '69085-000',
    phone: '(92) 3234-5679',
    email: 'saojose@clinicafisioterapia.com.br',
    openingHours: {
      'Segunda': '07:00 - 19:00',
      'Terça': '07:00 - 19:00',
      'Quarta': '07:00 - 19:00',
      'Quinta': '07:00 - 19:00',
      'Sexta': '07:00 - 19:00',
      'Sábado': '08:00 - 14:00',
      'Domingo': 'Fechado'
    },
    coordinates: { lat: -3.1008, lng: -60.0219 },
    specialties: ['Fisioterapia Ortopédica', 'RPG', 'Pilates', 'Acupuntura'],
    parkingAvailable: false,
    accessibility: ['Acesso para cadeirantes', 'Rampa de acesso'],
    mapUrl: 'https://maps.app.goo.gl/CdN3PYDkjkoQXzfRA'
  }
];

// Package deals and promotions
export const packageDeals = [
  {
    id: 'avaliacao-pacote-10',
    name: 'Avaliação + 10 Sessões',
    description: 'Avaliação com desconto ao contratar pacote de 10 sessões',
    originalPrice: 280, // 100 + 180*10
    packagePrice: 1800, // 100 + 170*10
    savings: 100,
    sessions: 11,
    validProcedures: ['fisioterapia-ortopedica', 'fisioterapia-pelvica', 'rpg', 'pilates-aparelhos']
  },
  {
    id: 'pacote-5-sessoes',
    name: 'Pacote 5 Sessões',
    description: 'Economize contratando 5 sessões',
    originalPrice: 900, // 180*5
    packagePrice: 810, // 162*5
    savings: 90,
    sessions: 5,
    validProcedures: ['fisioterapia-ortopedica', 'acupuntura', 'liberacao-miofascial']
  },
  {
    id: 'sj-ortopedica-5',
    name: 'São José • Fisioterapia Ortopédica',
    description: 'Pacote de Fisioterapia Ortopédica na unidade São José',
    originalPrice: 225, // 45*5
    packagePrice: 200,
    savings: 25,
    sessions: 5,
    validProcedures: ['fisioterapia-ortopedica'],
    applicableLocations: ['sao-jose']
  },
  {
    id: 'sj-neurologica-10',
    name: 'São José • Fisioterapia Neurológica',
    description: 'Pacote de Fisioterapia Neurológica na unidade São José',
    originalPrice: 600, // 60*10
    packagePrice: 500,
    savings: 100,
    sessions: 10,
    validProcedures: ['fisioterapia-neurologica'],
    applicableLocations: ['sao-jose']
  },
  {
    id: 'sj-respiratoria-10',
    name: 'São José • Fisioterapia Respiratória',
    description: 'Pacote de Fisioterapia Respiratória na unidade São José',
    originalPrice: 600, // 60*10
    packagePrice: 500,
    savings: 100,
    sessions: 10,
    validProcedures: ['fisioterapia-respiratoria'],
    applicableLocations: ['sao-jose']
  },
  {
    id: 'sj-pos-operatoria-10',
    name: 'São José • Fisioterapia Pós Operatória',
    description: 'Pacote de Fisioterapia Pós Operatória na unidade São José',
    originalPrice: 600, // 60*10
    packagePrice: 500,
    savings: 100,
    sessions: 10,
    validProcedures: ['fisioterapia-pos-operatoria'],
    applicableLocations: ['sao-jose']
  },
  {
    id: 'sj-acupuntura-10',
    name: 'São José • Acupuntura',
    description: 'Pacote de Acupuntura na unidade São José',
    originalPrice: 600, // 60*10
    packagePrice: 400,
    savings: 200,
    sessions: 10,
    validProcedures: ['acupuntura'],
    applicableLocations: ['sao-jose']
  },
  {
    id: 'sj-rpg-10',
    name: 'São José • RPG',
    description: 'Pacote de RPG na unidade São José',
    originalPrice: 500, // 50*10
    packagePrice: 350,
    savings: 150,
    sessions: 10,
    validProcedures: ['rpg'],
    applicableLocations: ['sao-jose']
  }
];

// Bot workflow templates
export const botWorkflowTemplates = [
  {
    id: 'boas-vindas-informacoes',
    name: 'Boas-vindas e Informações',
    description: 'Fluxo inicial de boas-vindas com informações sobre a clínica',
    nodes: [
      {
        id: 'start',
        type: 'START',
        content: { text: 'Olá! Seja bem-vindo à Clínica de Fisioterapia. Como posso ajudar você hoje?' },
        position: { x: 0, y: 0 },
        connections: ['menu-principal']
      },
      {
        id: 'menu-principal',
        type: 'MESSAGE',
        content: { 
          text: 'Escolha uma opção:\n1️⃣ Informações sobre procedimentos\n2️⃣ Valores e convênios\n3️⃣ Agendar consulta\n4️⃣ Falar com atendente',
          options: ['1', '2', '3', '4']
        },
        position: { x: 200, y: 0 },
        connections: ['condicao-opcao']
      },
      {
        id: 'condicao-opcao',
        type: 'CONDITION',
        content: { condition: 'message.includes("1") || message.toLowerCase().includes("procedimento")' },
        position: { x: 400, y: 0 },
        connections: ['info-procedimentos']
      },
      {
        id: 'info-procedimentos',
        type: 'GPT_RESPONSE',
        content: { 
          systemPrompt: 'Forneça informações sobre procedimentos disponíveis na clínica, mencionando fisioterapia ortopédica, fisioterapia neurológica, fisioterapia respiratória, fisioterapia pélvica, acupuntura, pilates e RPG.'
        },
        position: { x: 600, y: -100 },
        connections: ['agendar-pergunta']
      },
      {
        id: 'agendar-pergunta',
        type: 'MESSAGE',
        content: { 
          text: 'Gostaria de agendar uma consulta? Digite SIM para continuar ou MENU para voltar ao menu principal.',
          options: ['SIM', 'MENU']
        },
        position: { x: 800, y: -100 },
        connections: ['condicao-agendamento']
      },
      {
        id: 'condicao-agendamento',
        type: 'CONDITION',
        content: { condition: 'message.toLowerCase().includes("sim")' },
        position: { x: 1000, y: -100 },
        connections: ['inicio-agendamento']
      }
    ]
  },
  {
    id: 'fluxo-agendamento',
    name: 'Fluxo de Agendamento Completo',
    description: 'Fluxo completo de agendamento com verificação de paciente',
    nodes: [
      {
        id: 'inicio-agendamento',
        type: 'START',
        content: { text: 'Vou te ajudar a agendar sua consulta.' },
        position: { x: 0, y: 0 },
        connections: ['verificar-paciente']
      },
      {
        id: 'verificar-paciente',
        type: 'DATA_COLLECTION',
        content: { 
          field: 'phone',
          prompt: 'Para verificar seu cadastro, por favor, confirme seu número de telefone com DDD (ex: 11999999999):'
        },
        position: { x: 200, y: 0 },
        connections: ['buscar-paciente']
      },
      {
        id: 'buscar-paciente',
        type: 'ACTION',
        content: { action: 'search_patient_by_phone' },
        position: { x: 400, y: 0 },
        connections: ['condicao-paciente-encontrado']
      },
      {
        id: 'condicao-paciente-encontrado',
        type: 'CONDITION',
        content: { condition: 'patient_found' },
        position: { x: 600, y: 0 },
        connections: ['saudacao-paciente-existente']
      },
      {
        id: 'saudacao-paciente-existente',
        type: 'GPT_RESPONSE',
        content: { 
          systemPrompt: 'Saudação personalizada para paciente existente, mencionando nome e convênio.'
        },
        position: { x: 800, y: -100 },
        connections: ['escolher-procedimento']
      },
      {
        id: 'escolher-procedimento',
        type: 'MESSAGE',
        content: { 
          text: 'Qual procedimento gostaria de agendar?\n1️⃣ Fisioterapia Ortopédica\n2️⃣ Acupuntura\n3️⃣ Pilates\n4️⃣ RPG\n5️⃣ Outro',
          options: ['1', '2', '3', '4', '5']
        },
        position: { x: 1000, y: -100 },
        connections: ['condicao-procedimento']
      }
    ]
  }
];

// Export clinic data service
export const clinicDataService = {
  getProcedures: () => procedures,
  getInsuranceCompanies: () => insuranceCompanies,
  getLocations: () => clinicLocations,
  getPackageDeals: () => packageDeals,
  getBotTemplates: () => botWorkflowTemplates,
  
  getProcedureById: (id: string) => procedures.find(p => p.id === id),
  getInsuranceById: (id: string) => insuranceCompanies.find(i => i.id === id),
  getLocationById: (id: string) => clinicLocations.find(l => l.id === id),
  
  getProceduresByInsurance: (insuranceId: string) => 
    procedures.filter(p => p.insuranceAccepted.includes(insuranceId)),
  
  getProceduresByCategory: (category: string) =>
    procedures.filter(p => p.categories.includes(category)),
  
  calculatePrice: (procedureId: string, insuranceId?: string, isPackage?: boolean, locationId?: string) => {
    const procedure = procedures.find(p => p.id === procedureId);
    if (!procedure) return null;
    const base = locationId && procedure.priceByLocation && procedure.priceByLocation[locationId]
      ? procedure.priceByLocation[locationId]
      : procedure.basePrice;
    
    if (insuranceId) {
      const insurance = insuranceCompanies.find(i => i.id === insuranceId);
      if (insurance && insurance.procedures.includes(procedureId)) {
        const coveredAmount = (base * insurance.coveragePercentage) / 100;
        const patientPays = base - coveredAmount + insurance.copayment;
        return {
          basePrice: base,
          coveredAmount,
          patientPays,
          insuranceCoverage: insurance.coveragePercentage,
          copayment: insurance.copayment
        };
      }
    }
    
    if (isPackage) {
      const packageDeal = packageDeals.find(p => p.validProcedures.includes(procedureId));
      if (packageDeal) {
        return {
          basePrice: base,
          packagePrice: packageDeal.packagePrice / packageDeal.sessions,
          savings: packageDeal.savings / packageDeal.sessions
        };
      }
    }
    
    return {
      basePrice: base,
      patientPays: base
    };
  }
};
