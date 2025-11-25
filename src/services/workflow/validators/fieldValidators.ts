import { ValidationResult } from '../core/types';

/**
 * Validates a CPF (Brazilian tax ID)
 */
function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false; // All same digits
  
  // Validate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let checkDigit = 11 - (sum % 11);
  if (checkDigit >= 10) checkDigit = 0;
  if (checkDigit !== parseInt(cleaned.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  checkDigit = 11 - (sum % 11);
  if (checkDigit >= 10) checkDigit = 0;
  if (checkDigit !== parseInt(cleaned.charAt(10))) return false;
  
  return true;
}

/**
 * Validates an email address
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates a birth date in DD/MM/YYYY format
 */
function validateBirthDate(date: string): boolean {
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = date.match(dateRegex);
  
  if (!match) return false;
  
  const day = parseInt(match[1]);
  const month = parseInt(match[2]);
  const year = parseInt(match[3]);
  
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > new Date().getFullYear()) return false;
  
  // Check valid date
  const dateObj = new Date(year, month - 1, day);
  if (dateObj.getMonth() + 1 !== month || dateObj.getDate() !== day) return false;
  
  // Check age (must be at least 1 year old and not in the future)
  const age = new Date().getFullYear() - year;
  if (age < 1 || age > 150) return false;
  
  return true;
}

/**
 * Validates a phone number (Brazilian format)
 */
function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  
  // Brazilian phones: 10 digits (landline) or 11 digits (mobile with 9)
  // Can also have country code: 5511999999999
  if (cleaned.length === 10 || cleaned.length === 11) return true;
  if (cleaned.length === 13 && cleaned.startsWith('55')) return true;
  
  return false;
}

/**
 * Validates a person's name
 */
function validateName(name: string): boolean {
  const trimmed = name.trim();
  
  // Must have at least 2 characters and contain at least one space (first + last name)
  if (trimmed.length < 2) return false;
  
  // Must contain at least 2 words
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 2) return false;
  
  // Each word must have at least 2 characters
  if (words.some(w => w.length < 2)) return false;
  
  // Must contain only letters, spaces, and common name characters
  if (!/^[a-záàâãéèêíïóôõöúçñA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s'-]+$/.test(trimmed)) return false;
  
  return true;
}

/**
 * Validates a preferred date for scheduling
 */
function validatePreferredDate(date: string): boolean {
  // Accept DD/MM/YYYY or "hoje", "amanhã", etc.
  const lowerDate = date.toLowerCase().trim();
  
  const validKeywords = ['hoje', 'amanhã', 'amanha', 'segunda', 'terça', 'terca', 
                         'quarta', 'quinta', 'sexta', 'sábado', 'sabado', 'domingo'];
  
  if (validKeywords.includes(lowerDate)) return true;
  
  return validateBirthDate(date);
}

/**
 * Validates a shift preference (morning, afternoon, evening)
 */
function validateShift(shift: string): boolean {
  const normalized = shift.toLowerCase().trim();
  
  const validShifts = [
    'manhã', 'manha', 'matutino', 'de manhã', 'de manha',
    'tarde', 'vespertino', 'de tarde',
    'noite', 'noturno', 'de noite'
  ];
  
  return validShifts.some(s => normalized.includes(s));
}

/**
 * Main validation function that routes to specific validators
 */
export async function validateField(field: string, value: string): Promise<ValidationResult> {
  const trimmedValue = value.trim();
  
  if (!trimmedValue) {
    return {
      valid: false,
      error: 'Por favor, forneça um valor válido.'
    };
  }
  
  switch (field) {
    case 'name':
      if (!validateName(trimmedValue)) {
        return {
          valid: false,
          error: '❌ Nome inválido. Por favor, informe seu nome completo (nome e sobrenome).'
        };
      }
      return {
        valid: true,
        normalizedValue: trimmedValue
          .split(/\s+/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')
      };
    
    case 'cpf':
      const cleanedCPF = trimmedValue.replace(/\D/g, '');
      if (!validateCPF(cleanedCPF)) {
        return {
          valid: false,
          error: '❌ CPF inválido. Por favor, informe um CPF válido (11 dígitos).'
        };
      }
      // Format: 123.456.789-01
      return {
        valid: true,
        normalizedValue: cleanedCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
      };
    
    case 'birth_date':
      if (!validateBirthDate(trimmedValue)) {
        return {
          valid: false,
          error: '❌ Data de nascimento inválida. Use o formato DD/MM/AAAA (ex: 15/08/1990).'
        };
      }
      return {
        valid: true,
        normalizedValue: trimmedValue
      };
    
    case 'email':
      if (!validateEmail(trimmedValue)) {
        return {
          valid: false,
          error: '❌ E-mail inválido. Por favor, informe um e-mail válido (ex: seu@email.com).'
        };
      }
      return {
        valid: true,
        normalizedValue: trimmedValue.toLowerCase()
      };
    
    case 'phone':
      const cleanedPhone = trimmedValue.replace(/\D/g, '');
      if (!validatePhone(cleanedPhone)) {
        return {
          valid: false,
          error: '❌ Telefone inválido. Informe um telefone válido com DDD (ex: 11999999999).'
        };
      }
      return {
        valid: true,
        normalizedValue: cleanedPhone
      };
    
    case 'insurance':
      // Insurance is free text, just check it's not too short
      if (trimmedValue.length < 2) {
        return {
          valid: false,
          error: '❌ Convênio inválido. Digite o nome do convênio ou "particular".'
        };
      }
      // Use insurance normalizer to correct typos
      const insuranceNormalizer = await import('../../insuranceNormalizer');
      const normalizedInsurance = insuranceNormalizer.normalizeInsurance(trimmedValue);
      
      return {
        valid: true,
        normalizedValue: normalizedInsurance
      };
    
    case 'preferred_date':
      if (!validatePreferredDate(trimmedValue)) {
        return {
          valid: false,
          error: '❌ Data inválida. Use DD/MM/AAAA ou palavras como "hoje", "amanhã", "segunda".'
        };
      }
      return {
        valid: true,
        normalizedValue: trimmedValue
      };
    
    case 'preferred_shift':
      if (!validateShift(trimmedValue)) {
        return {
          valid: false,
          error: '❌ Turno inválido. Escolha: manhã, tarde ou noite.'
        };
      }
      // Normalize to standard format
      const normalized = trimmedValue.toLowerCase();
      let normalizedShift = '';
      if (normalized.includes('manh')) normalizedShift = 'Manhã';
      else if (normalized.includes('tard')) normalizedShift = 'Tarde';
      else if (normalized.includes('noit')) normalizedShift = 'Noite';
      
      return {
        valid: true,
        normalizedValue: normalizedShift
      };
    
    case 'procedure_1':
    case 'procedure_2':
    case 'procedure_3':
      // Procedures are free text, just check minimum length
      if (trimmedValue.length < 3) {
        return {
          valid: false,
          error: '❌ Procedimento inválido. Digite o nome do procedimento desejado.'
        };
      }
      return {
        valid: true,
        normalizedValue: trimmedValue
      };
    
    default:
      // Generic validation - just check it's not empty
      return {
        valid: true,
        normalizedValue: trimmedValue
      };
  }
}

export { validateCPF, validateEmail, validateBirthDate, validatePhone, validateName };

