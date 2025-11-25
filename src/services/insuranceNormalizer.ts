import { clinicData } from '../data/clinicData';

/**
 * Insurance Normalizer Service
 * Normalizes and corrects insurance names with typos
 * Maps common misspellings to correct insurance names
 */

/**
 * Normalizes insurance name, correcting common typos
 * Returns the correct insurance name or 'Particular' if not found
 */
export function normalizeInsurance(input: string): string {
  if (!input || typeof input !== 'string') {
    return 'Particular';
  }

  const trimmed = input.trim();

  // FIRST: Check if input is already a normalized value from clinicData
  // This prevents re-normalizing already normalized values
  const allInsurances = [...clinicData.insurance, ...clinicData.discountInsurance];

  // Remove accents for comparison
  const removeAccents = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  // Clean input: normalize whitespace
  const cleanedInput = trimmed.replace(/\s+/g, ' ').trim();
  const trimmedUpper = cleanedInput.toUpperCase();
  const trimmedNoAccents = removeAccents(trimmedUpper);

  // CRITICAL: Check multiple ways to ensure we catch all variations
  // This prevents re-normalizing already normalized values
  const exactMatch = allInsurances.find(ins => {
    const insCleaned = ins.trim().replace(/\s+/g, ' ');
    const insUpper = insCleaned.toUpperCase();
    const insNoAccents = removeAccents(insUpper);

    // Multiple comparison strategies to catch all variations
    return insCleaned === cleanedInput ||           // Exact match (case-sensitive, with normalized spaces)
      ins === trimmed ||                       // Original match
      insUpper === trimmedUpper ||             // Case-insensitive match
      insNoAccents === trimmedNoAccents;      // Accent-insensitive match
  });

  if (exactMatch) {
    console.log(`🔍 normalizeInsurance - Input "${input}" is already normalized, returning: "${exactMatch}"`);
    return exactMatch;
  }

  const normalized = trimmed.toLowerCase();

  // cleanInput already defined above
  const cleanInput = removeAccents(normalized);

  console.log(`🔍 normalizeInsurance - Input: "${input}", Normalized: "${normalized}", Clean: "${cleanInput}"`);

  // Mapping of common typos and variations to correct insurance names
  // IMPORTANT: Order matters - more specific matches should come first
  const insuranceMap: Record<string, string> = {
    // SulAmérica variations (check BEFORE Bradesco to avoid conflicts)
    'sulamerica': 'SULAMÉRICA',
    'sulmerica': 'SULAMÉRICA',
    'sul america': 'SULAMÉRICA',
    'sul-américa': 'SULAMÉRICA',
    'sulamerica saude': 'SULAMÉRICA',
    'sulamerica saúde': 'SULAMÉRICA',

    // Bradesco variations
    'bradesco': 'BRADESCO',
    'badesco': 'BRADESCO',
    'bradisco': 'BRADESCO',
    'bradisco saude': 'BRADESCO',
    'bradesco saude': 'BRADESCO',
    'bradesco saúde': 'BRADESCO',

    // Mediservice variations
    'mediservice': 'MEDISERVICE',
    'medi service': 'MEDISERVICE',
    'medi-service': 'MEDISERVICE',
    'mediservico': 'MEDISERVICE',

    // Saúde Caixa variations (MUST come before Bradesco to avoid conflicts)
    'saude caixa': 'SAÚDE CAIXA',
    'saúde caixa': 'SAÚDE CAIXA',
    'caixa saude': 'SAÚDE CAIXA',
    'caixa saúde': 'SAÚDE CAIXA',
    // NOTE: 'caixa' alone removed - too ambiguous, could match other insurances

    // Petrobras variations
    'petrobras': 'PETROBRAS',
    'petrobrás': 'PETROBRAS',

    // GEAP variations
    'geap': 'GEAP',

    // Pro Social variations
    'pro social': 'PRO SOCIAL',
    'prosocial': 'PRO SOCIAL',
    'pro-social': 'PRO SOCIAL',

    // Postal Saúde variations
    'postal saude': 'POSTAL SAÚDE',
    'postal': 'POSTAL SAÚDE',

    // CONAB variations
    'conab': 'CONAB',

    // AFFEAM variations
    'affeam': 'AFFEAM',

    // AMBEP variations
    'ambep': 'AMBEP',

    // GAMA variations
    'gama': 'GAMA',

    // LIFE variations
    'life': 'LIFE',

    // NotreDame variations
    'notredame': 'NOTREDAME',
    'notre dame': 'NOTREDAME',
    'notre-dame': 'NOTREDAME',
    'notredame intermedica': 'NOTREDAME',

    // OAB variations
    'oab': 'OAB',

    // CAPESAUDE variations
    'capesaude': 'CAPESAUDE',
    'cape saude': 'CAPESAUDE',

    // CASEMBRAPA variations
    'casembrapa': 'CASEMBRAPA',
    'cas embrapa': 'CASEMBRAPA',

    // CULTURAL variations
    'cultural': 'CULTURAL',

    // EVIDA variations
    'evida': 'EVIDA',
    'e vida': 'EVIDA',

    // FOGAS variations
    'fogas': 'FOGAS',

    // FUSEX variations
    'fusex': 'FUSEX',

    // PLAN-ASSITE variations
    'plan-assite': 'PLAN-ASSITE',
    'plan assite': 'PLAN-ASSITE',
    'planassite': 'PLAN-ASSITE',

    // Particular variations
    'particular': 'Particular',
    'particula': 'Particular',
    'particulr': 'Particular',
    'sem convenio': 'Particular',
    'sem convênio': 'Particular',
    'sem plano': 'Particular',
    'pago': 'Particular',
    'pagamento': 'Particular'
  };

  // First, try exact match in map (case-insensitive, accent-insensitive)
  const exactMapMatch = Object.entries(insuranceMap).find(([key]) => {
    const keyClean = removeAccents(key.toLowerCase());
    return keyClean === cleanInput;
  });

  if (exactMapMatch) {
    console.log(`🔍 normalizeInsurance - Exact match found in map: "${exactMapMatch[0]}" -> "${exactMapMatch[1]}"`);
    return exactMapMatch[1];
  }

  // Try matching against clinicData insurance list FIRST (before partial matches)
  // This ensures we use the exact names from clinicData
  // IMPORTANT: Check for multi-word matches first (more specific)
  const matchedFromList = allInsurances.find(ins => {
    const insName = removeAccents(ins.toLowerCase());
    // Exact match first
    if (insName === cleanInput) {
      console.log(`🔍 normalizeInsurance - Exact match in clinicData list: "${ins}"`);
      return true;
    }

    // For multi-word inputs like "saude caixa", check if all words match
    const inputWords = cleanInput.split(/\s+/).filter(w => w.length > 0);
    const insWords = insName.split(/\s+/).filter(w => w.length > 0);

    // If both have multiple words, check if all input words are in insurance name
    if (inputWords.length > 1 && insWords.length > 1) {
      const allWordsMatch = inputWords.every(iw =>
        insWords.some(insw => insw.includes(iw) || iw.includes(insw))
      );
      if (allWordsMatch) {
        console.log(`🔍 normalizeInsurance - Multi-word match in clinicData list: "${ins}" (input: "${cleanInput}")`);
        return true;
      }
    }

    // Then check if input contains insurance name or vice versa
    // But be careful: "caixa" should match "SAÚDE CAIXA", not "BRADESCO"
    // So we check if the longer string contains the shorter one
    // BUT: prioritize multi-word matches over single-word partial matches
    if (insName.length >= cleanInput.length) {
      const contains = insName.includes(cleanInput);
      if (contains && inputWords.length > 1) {
        // Multi-word input - this is likely a match
        console.log(`🔍 normalizeInsurance - Multi-word partial match in clinicData list: "${ins}" (input: "${cleanInput}")`);
        return true;
      }
      return contains;
    } else {
      return cleanInput.includes(insName);
    }
  });

  if (matchedFromList) {
    console.log(`🔍 normalizeInsurance - Matched from clinicData list: ${matchedFromList}`);
    return matchedFromList;
  }

  // Try partial match in map (only if not found in clinicData list)
  // This is for typos and variations
  // IMPORTANT: Sort by key length (longest first) to prioritize more specific matches
  const sortedMapEntries = Object.entries(insuranceMap).sort((a, b) => b[0].length - a[0].length);

  for (const [key, value] of sortedMapEntries) {
    // Normalize the key for comparison (remove accents, lowercase)
    const keyClean = removeAccents(key.toLowerCase());

    // Check if input exactly matches the key (case-insensitive, accent-insensitive)
    if (keyClean === cleanInput) {
      console.log(`🔍 normalizeInsurance - Exact key match found in map: "${key}" -> "${value}" (input: "${cleanInput}")`);
      return value;
    }

    // For partial matches, be very strict to avoid false positives
    // Only match if the key is a significant part of the input
    if (key.length >= 4 && cleanInput.includes(keyClean)) {
      const keyWords = keyClean.split(' ');
      const inputWords = cleanInput.split(' ');

      // If key is multi-word, check if all words are present as complete words
      if (keyWords.length > 1) {
        const allWordsMatch = keyWords.every(kw =>
          inputWords.some(iw => iw === kw || (iw.length >= kw.length && (iw.includes(kw) || kw.includes(iw))))
        );
        if (allWordsMatch) {
          console.log(`🔍 normalizeInsurance - Multi-word partial match found in map: "${key}" -> "${value}" (input: "${cleanInput}")`);
          return value;
        }
      } else {
        // Single word key - must be a complete word match (not just a substring)
        const isCompleteWord = inputWords.some(iw => iw === keyClean);

        // Or if the key is long enough (>= 6 chars) and the input contains it as a significant part
        const isSignificantPart = keyClean.length >= 6 && cleanInput.includes(keyClean);

        if (isCompleteWord || isSignificantPart) {
          console.log(`🔍 normalizeInsurance - Partial match found in map: "${key}" -> "${value}" (input: "${cleanInput}")`);
          return value;
        }
      }
    }
  }

  // Default to Particular if no match found
  console.log(`🔍 normalizeInsurance - No match found, defaulting to Particular`);
  return 'Particular';
}

/**
 * Get insurance ID from insurance name (returns the name itself since there's no separate ID)
 */
export function getInsuranceId(insuranceName: string): string | null {
  const normalized = normalizeInsurance(insuranceName);
  return normalized !== 'Particular' ? normalized : null;
}

/**
 * Get procedures available for a specific insurance
 */
export function getProceduresForInsurance(insuranceName: string): string[] {
  // Normalize the insurance name first to ensure it matches what's in clinicData
  const normalized = normalizeInsurance(insuranceName);

  if (normalized === 'Particular') {
    // For Particular, return all procedures
    return clinicData.procedures.map(proc => proc.name);
  }

  // Filter procedures that include this insurance in their convenios list
  return clinicData.procedures
    .filter(proc => proc.convenios.includes(normalized))
    .map(proc => proc.name);
}

/**
 * Format procedures list for display
 */
export function formatProceduresForInsurance(insuranceName: string): string {
  console.log(`🔍 formatProceduresForInsurance - INPUT: "${insuranceName}" (type: ${typeof insuranceName}, length: ${insuranceName?.length})`);

  const procedures = getProceduresForInsurance(insuranceName);

  // Check if insuranceName is already normalized (exists in clinicData list)
  // Use case-insensitive comparison and also check without accents
  const removeAccents = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  const allInsurances = [...clinicData.insurance, ...clinicData.discountInsurance];
  console.log(`🔍 formatProceduresForInsurance - Available insurances in clinicData:`, allInsurances);

  // Clean input: trim and normalize whitespace
  const cleanedInput = insuranceName.trim().replace(/\s+/g, ' ');
  const inputUpper = cleanedInput.toUpperCase();
  const inputNoAccents = removeAccents(inputUpper);

  console.log(`🔍 formatProceduresForInsurance - Input processed: cleaned="${cleanedInput}", upper="${inputUpper}", noAccents="${inputNoAccents}"`);

  // CRITICAL: Check if input is already normalized BEFORE calling normalizeInsurance
  // This prevents re-normalizing already normalized values
  const isAlreadyNormalized = allInsurances.some(ins => {
    const insCleaned = ins.trim();
    const insUpper = insCleaned.toUpperCase();
    const insNoAccents = removeAccents(insUpper);

    // Multiple comparison strategies to catch all variations
    const matches =
      insCleaned === cleanedInput ||           // Exact match (case-sensitive)
      insUpper === inputUpper ||               // Case-insensitive match
      insNoAccents === inputNoAccents ||      // Accent-insensitive match
      ins === insuranceName;                   // Original match

    if (matches) {
      console.log(`🔍 formatProceduresForInsurance - Found match: "${ins}" matches "${insuranceName}"`);
    }
    return matches;
  });

  console.log(`🔍 formatProceduresForInsurance - isAlreadyNormalized: ${isAlreadyNormalized}`);

  // Only normalize if not already normalized
  let normalizedInsurance: string;
  if (isAlreadyNormalized) {
    // Find the exact match from clinicData to use the correct casing
    const exactMatch = allInsurances.find(ins => {
      const insCleaned = ins.trim();
      const insUpper = insCleaned.toUpperCase();
      const insNoAccents = removeAccents(insUpper);
      return insCleaned === cleanedInput ||
        insUpper === inputUpper ||
        insNoAccents === inputNoAccents ||
        ins === insuranceName;
    });
    normalizedInsurance = exactMatch || cleanedInput;
    console.log(`🔍 formatProceduresForInsurance - Already normalized: "${insuranceName}" -> "${normalizedInsurance}"`);
  } else {
    // Only normalize if NOT already in the list
    // This is a safety check - if it's not in the list, try to normalize
    const beforeNormalize = insuranceName;
    normalizedInsurance = normalizeInsurance(insuranceName);
    console.log(`🔍 formatProceduresForInsurance - Normalized: "${beforeNormalize}" -> "${normalizedInsurance}"`);

    // CRITICAL: Double-check if the normalized result is valid
    // If normalization returned something that's not in the list, something went wrong
    const normalizedIsValid = allInsurances.some(ins => {
      const insCleaned = ins.trim();
      const insUpper = insCleaned.toUpperCase();
      const insNoAccents = removeAccents(insUpper);
      const normCleaned = normalizedInsurance.trim();
      const normUpper = normCleaned.toUpperCase();
      const normNoAccents = removeAccents(normUpper);
      return insCleaned === normCleaned ||
        insUpper === normUpper ||
        insNoAccents === normNoAccents;
    });

    // If normalization failed or returned something invalid, try to find a match manually
    if (!normalizedIsValid) {
      console.log(`⚠️ formatProceduresForInsurance - Normalization returned invalid result: "${normalizedInsurance}", trying to find match manually`);

      // Try to find a match manually by checking if any part of the input matches
      const manualMatch = allInsurances.find(ins => {
        const insCleaned = ins.trim();
        const insUpper = insCleaned.toUpperCase();
        const insNoAccents = removeAccents(insUpper);
        const inputUpper = cleanedInput.toUpperCase();
        const inputNoAccents = removeAccents(inputUpper);

        // Check if input is similar to insurance name
        return insUpper.includes(inputUpper) ||
          inputUpper.includes(insUpper) ||
          insNoAccents.includes(inputNoAccents) ||
          inputNoAccents.includes(insNoAccents);
      });

      if (manualMatch) {
        console.log(`✅ formatProceduresForInsurance - Found manual match: "${manualMatch}"`);
        normalizedInsurance = manualMatch;
      } else {
        console.log(`⚠️ formatProceduresForInsurance - No match found, using original: "${cleanedInput}"`);
        normalizedInsurance = cleanedInput;
      }
    }
  }

  console.log(`🔍 formatProceduresForInsurance - Final insurance used in message: "${normalizedInsurance}"`);

  let message = `🩺 **Procedimentos disponíveis para ${normalizedInsurance}:**\n\n`;

  procedures.forEach((proc, index) => {
    message += `${index + 1}. ${proc}\n`;
  });

  message += `\n💡 Você pode informar quais procedimentos deseja agendar enquanto aguarda o atendimento.`;

  console.log(`🔍 formatProceduresForInsurance - Message generated with insurance: "${normalizedInsurance}"`);

  return message;
}

