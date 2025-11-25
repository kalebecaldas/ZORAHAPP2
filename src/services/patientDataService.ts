import { PrismaClient } from '@prisma/client';

// Use singleton pattern to avoid multiple Prisma instances
let prismaInstance: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

const prisma = getPrisma();

/**
 * Patient Data Service
 * Centralized service for managing patient data operations
 * Provides easy access to patient information and validation
 */

export interface PatientInfo {
  id: string;
  name: string;
  phone: string;
  cpf?: string | null;
  email?: string | null;
  birthDate?: Date | null;
  insuranceCompany?: string | null;
  insuranceNumber?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Search for a patient by phone number
 * Returns patient info if found, null otherwise
 */
export async function findPatientByPhone(phone: string): Promise<PatientInfo | null> {
  try {
    // Normalize phone number (remove non-digits)
    const normalizedPhone = phone.replace(/\D/g, '');
    
    console.log(`🔍 findPatientByPhone - Original phone: "${phone}", Normalized: "${normalizedPhone}"`);
    
    // Search in database
    const patient = await prisma.patient.findUnique({
      where: { phone: normalizedPhone }
    });
    
    if (!patient) {
      console.log(`🔍 findPatientByPhone - No patient found for normalized phone: "${normalizedPhone}"`);
      return null;
    }
    
    console.log(`🔍 findPatientByPhone - ✅ Patient found: ${patient.name} (${patient.id}), phone in DB: "${patient.phone}"`);
    
    return {
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      cpf: patient.cpf,
      email: patient.email,
      birthDate: patient.birthDate,
      insuranceCompany: patient.insuranceCompany,
      insuranceNumber: patient.insuranceNumber,
      address: patient.address,
      emergencyContact: patient.emergencyContact,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt
    };
  } catch (error) {
    console.error('❌ Error finding patient by phone:', error);
    return null;
  }
}

/**
 * Search for a patient by CPF
 * Returns patient info if found, null otherwise
 */
export async function findPatientByCPF(cpf: string): Promise<PatientInfo | null> {
  try {
    // Normalize CPF (remove non-digits)
    const normalizedCPF = cpf.replace(/\D/g, '');
    
    // Search in database
    const patient = await prisma.patient.findUnique({
      where: { cpf: normalizedCPF }
    });
    
    if (!patient) {
      return null;
    }
    
    return {
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      cpf: patient.cpf,
      email: patient.email,
      birthDate: patient.birthDate,
      insuranceCompany: patient.insuranceCompany,
      insuranceNumber: patient.insuranceNumber,
      address: patient.address,
      emergencyContact: patient.emergencyContact,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt
    };
  } catch (error) {
    console.error('Error finding patient by CPF:', error);
    return null;
  }
}

/**
 * Create a new patient
 * Returns the created patient info
 */
export async function createPatient(data: {
  name: string;
  phone: string;
  cpf?: string | null;
  email?: string | null;
  birthDate?: Date | null;
  insuranceCompany?: string | null;
  insuranceNumber?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
}): Promise<PatientInfo | null> {
  try {
    // Normalize phone and CPF
    const normalizedPhone = data.phone.replace(/\D/g, '');
    const normalizedCPF = data.cpf ? data.cpf.replace(/\D/g, '') : null;
    
    // Check if patient already exists
    if (normalizedPhone) {
      const existing = await findPatientByPhone(normalizedPhone);
      if (existing) {
        console.log(`⚠️ Patient already exists with phone: ${normalizedPhone}`);
        return existing;
      }
    }
    
    if (normalizedCPF) {
      const existing = await findPatientByCPF(normalizedCPF);
      if (existing) {
        console.log(`⚠️ Patient already exists with CPF: ${normalizedCPF}`);
        return existing;
      }
    }
    
    // Validate required fields
    if (!data.name || data.name.trim().length < 2) {
      console.error('❌ Cannot create patient: name is required and must be at least 2 characters');
      return null;
    }
    
    if (!normalizedPhone || normalizedPhone.length < 10) {
      console.error('❌ Cannot create patient: phone is required and must be valid');
      return null;
    }
    
    console.log(`🔧 Creating patient with data:`, {
      name: data.name,
      phone: normalizedPhone,
      cpf: normalizedCPF || 'null',
      email: data.email || 'null',
      insuranceCompany: data.insuranceCompany || 'null'
    });
    
    // Create new patient
    const insuranceCompanyValue = data.insuranceCompany?.trim() || null;
    console.log(`🔧 createPatient - Insurance company value before save: "${insuranceCompanyValue}"`);
    
    const patient = await prisma.patient.create({
      data: {
        name: data.name.trim(),
        phone: normalizedPhone,
        cpf: normalizedCPF,
        email: data.email?.trim() || null,
        birthDate: data.birthDate || null,
        insuranceCompany: insuranceCompanyValue,
        insuranceNumber: data.insuranceNumber?.trim() || null,
        address: data.address?.trim() || null,
        emergencyContact: data.emergencyContact?.trim() || null,
        preferences: {} // Initialize preferences as empty object
      }
    });
    
    console.log(`✅ Patient created successfully:`, {
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      insuranceCompany: patient.insuranceCompany,
      createdAt: patient.createdAt
    });
    
    // Verify patient was saved by fetching it back
    const verifyPatient = await prisma.patient.findUnique({
      where: { id: patient.id }
    });
    
    if (!verifyPatient) {
      console.error('❌ Patient was not saved correctly - verification failed');
      return null;
    }
    
    console.log(`✅ Patient verified in database: ${verifyPatient.name} (${verifyPatient.id})`);
    
    return {
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      cpf: patient.cpf,
      email: patient.email,
      birthDate: patient.birthDate,
      insuranceCompany: patient.insuranceCompany,
      insuranceNumber: patient.insuranceNumber,
      address: patient.address,
      emergencyContact: patient.emergencyContact,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt
    };
  } catch (error: any) {
    console.error('❌ Error creating patient:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    return null;
  }
}

/**
 * Update patient information
 */
export async function updatePatient(
  patientId: string,
  data: Partial<{
    name: string;
    phone: string;
    cpf: string | null;
    email: string | null;
    birthDate: Date | null;
    insuranceCompany: string | null;
    insuranceNumber: string | null;
    address: string | null;
    emergencyContact: string | null;
  }>
): Promise<PatientInfo | null> {
  try {
    // Normalize phone and CPF if provided
    const updateData: any = { ...data };
    if (updateData.phone) {
      updateData.phone = updateData.phone.replace(/\D/g, '');
    }
    if (updateData.cpf) {
      updateData.cpf = updateData.cpf.replace(/\D/g, '');
    }
    
    const patient = await prisma.patient.update({
      where: { id: patientId },
      data: updateData
    });
    
    return {
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      cpf: patient.cpf,
      email: patient.email,
      birthDate: patient.birthDate,
      insuranceCompany: patient.insuranceCompany,
      insuranceNumber: patient.insuranceNumber,
      address: patient.address,
      emergencyContact: patient.emergencyContact,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt
    };
  } catch (error) {
    console.error('Error updating patient:', error);
    return null;
  }
}

/**
 * Get patient by ID
 */
export async function getPatientById(patientId: string): Promise<PatientInfo | null> {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });
    
    if (!patient) {
      return null;
    }
    
    return {
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      cpf: patient.cpf,
      email: patient.email,
      birthDate: patient.birthDate,
      insuranceCompany: patient.insuranceCompany,
      insuranceNumber: patient.insuranceNumber,
      address: patient.address,
      emergencyContact: patient.emergencyContact,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt
    };
  } catch (error) {
    console.error('Error getting patient by ID:', error);
    return null;
  }
}

/**
 * Format patient info for display
 */
export function formatPatientInfo(patient: PatientInfo | null): string {
  if (!patient) {
    return 'Paciente não encontrado.';
  }
  
  let info = `👤 **${patient.name}**\n\n`;
  
  if (patient.phone) {
    info += `📱 Telefone: ${patient.phone}\n`;
  }
  
  if (patient.cpf) {
    info += `📄 CPF: ${patient.cpf}\n`;
  }
  
  if (patient.email) {
    info += `📧 E-mail: ${patient.email}\n`;
  }
  
  if (patient.birthDate) {
    const birthDate = new Date(patient.birthDate);
    info += `🎂 Data de Nascimento: ${birthDate.toLocaleDateString('pt-BR')}\n`;
  }
  
  if (patient.insuranceCompany) {
    info += `💳 Convênio: ${patient.insuranceCompany}\n`;
    if (patient.insuranceNumber) {
      info += `🔢 Número do Convênio: ${patient.insuranceNumber}\n`;
    }
  }
  
  if (patient.address) {
    info += `📍 Endereço: ${patient.address}\n`;
  }
  
  if (patient.emergencyContact) {
    info += `🚨 Contato de Emergência: ${patient.emergencyContact}\n`;
  }
  
  return info;
}

/**
 * Check if patient exists (by phone or CPF)
 */
export async function patientExists(phone?: string, cpf?: string): Promise<boolean> {
  if (phone) {
    const patient = await findPatientByPhone(phone);
    if (patient) return true;
  }
  
  if (cpf) {
    const patient = await findPatientByCPF(cpf);
    if (patient) return true;
  }
  
  return false;
}

