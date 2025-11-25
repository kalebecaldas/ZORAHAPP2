import { WorkflowNode, WorkflowExecutionContext, ConnectionMap, NodeExecutionResult } from '../core/types';
import { 
  findPatientByPhone, 
  createPatient, 
  formatPatientInfo,
  patientExists 
} from '../../patientDataService';
import {
  createAppointment,
  generateAvailableDates,
  generateAvailableTimeSlots,
  getProcedureDuration,
  formatAppointmentInfo
} from '../../appointmentDataService';

/**
 * Executes an ACTION node
 * ACTION nodes perform specific actions like database operations
 */
export async function executeActionNode(
  node: WorkflowNode,
  context: WorkflowExecutionContext,
  connections: ConnectionMap
): Promise<NodeExecutionResult> {
  const action = node.content.action || '';
  
  console.log(`🔧 ACTION node ${node.id} - Executing action: "${action}"`);
  
  let nextNodeId: string | undefined;
  let response = '';
  let shouldStop = false;
  
  try {
    switch (action) {
      case 'search_patient_by_phone':
        console.log(`🔧 ACTION search_patient - Searching for phone: "${context.phone}"`);
        const foundPatient = await findPatientByPhone(context.phone);
        const found = !!foundPatient;
        context.userData.patientFound = found;
        
        console.log(`🔧 ACTION search_patient - Search result: found=${found}, patient=${foundPatient ? `${foundPatient.name} (${foundPatient.id})` : 'null'}`);
        
        if (found && foundPatient) {
          context.userData.patientId = foundPatient.id;
          context.userData.patientName = foundPatient.name;
          context.userData.patientInsurance = foundPatient.insuranceCompany || 'Particular';
          
          // Populate collectedData with patient info
          context.userData.collectedData = {
            name: foundPatient.name,
            cpf: foundPatient.cpf || '',
            birth_date: foundPatient.birthDate ? formatDate(foundPatient.birthDate) : '',
            email: foundPatient.email || '',
            phone: foundPatient.phone,
            insurance: foundPatient.insuranceCompany || 'Particular'
          };
          
          console.log(`🔧 ACTION search_patient - ✅ Patient found: ${foundPatient.name} (${foundPatient.id}), phone: ${foundPatient.phone}`);
        } else {
          console.log(`🔧 ACTION search_patient - ❌ Patient not found for phone: ${context.phone}`);
          // Clear any previous patient data
          context.userData.patientId = undefined;
          context.userData.patientName = undefined;
          context.userData.patientInsurance = undefined;
        }
        break;
      
      case 'create_patient_profile':
        const collectedData = context.userData.collectedData || {};
        
        // Parse birth date if provided
        let birthDate: Date | undefined;
        if (collectedData.birth_date) {
          if (typeof collectedData.birth_date === 'string') {
            // Try to parse DD/MM/YYYY format
            const parts = collectedData.birth_date.split('/');
            if (parts.length === 3) {
              birthDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            } else {
              birthDate = new Date(collectedData.birth_date);
            }
          } else if (collectedData.birth_date instanceof Date) {
            birthDate = collectedData.birth_date;
          }
        }
        
        // Validate required data before creating
        if (!collectedData.name || collectedData.name.trim().length < 2) {
          console.error('❌ Cannot create patient: name is missing or invalid');
          response = 'Erro: Nome é obrigatório. Por favor, informe seu nome completo.';
          shouldStop = true;
          break;
        }
        
        if (!context.phone || context.phone.replace(/\D/g, '').length < 10) {
          console.error('❌ Cannot create patient: phone is missing or invalid');
          response = 'Erro: Telefone é obrigatório.';
          shouldStop = true;
          break;
        }
        
        // Ensure insurance is normalized before creating patient
        const { normalizeInsurance } = await import('../../insuranceNormalizer');
        const rawInsurance = collectedData.insurance || 'Particular';
        const normalizedInsuranceForSave = normalizeInsurance(rawInsurance);
        
        console.log(`🔧 ACTION create_patient_profile - Creating patient with data:`, {
          name: collectedData.name,
          phone: context.phone,
          cpf: collectedData.cpf || 'not provided',
          email: collectedData.email || 'not provided',
          insuranceRaw: rawInsurance,
          insuranceNormalized: normalizedInsuranceForSave,
          birth_date: collectedData.birth_date
        });
        
        try {
          const newPatient = await createPatient({
            name: collectedData.name.trim(),
            phone: context.phone,
            cpf: collectedData.cpf || null,
            email: collectedData.email || null,
            birthDate: birthDate || null,
            insuranceCompany: normalizedInsuranceForSave, // Use normalized value
            insuranceNumber: collectedData.insurance_number || null,
            address: collectedData.address || null,
            emergencyContact: collectedData.emergency_contact || null
          });
          
          if (newPatient) {
            context.userData.patientId = newPatient.id;
            context.userData.patientName = newPatient.name;
            
            // IMPORTANT: Use the insurance from the database (which should be normalized)
            const dbInsurance = newPatient.insuranceCompany || 'Particular';
            context.userData.patientInsurance = dbInsurance;
            context.userData.registrationComplete = true;
            
            console.log(`🔧 ACTION create_patient_profile - ✅ Patient created successfully:`, {
              id: newPatient.id,
              name: newPatient.name,
              phone: newPatient.phone,
              cpf: newPatient.cpf,
              email: newPatient.email,
              insuranceFromDB: dbInsurance,
              collectedDataInsurance: collectedData.insurance,
              patientInsuranceSet: context.userData.patientInsurance,
              createdAt: newPatient.createdAt
            });
            
            // Also update collectedData with patient info (use DB value to ensure consistency)
            context.userData.collectedData = {
              ...context.userData.collectedData,
              name: newPatient.name,
              phone: newPatient.phone,
              cpf: newPatient.cpf || '',
              email: newPatient.email || '',
              insurance: dbInsurance // Use DB value, not collectedData.insurance
            };
            
            console.log(`🔧 ACTION create_patient_profile - Updated context with patientId: ${context.userData.patientId}`);
            console.log(`🔧 ACTION create_patient_profile - Context summary:`, {
              patientId: context.userData.patientId,
              patientName: context.userData.patientName,
              patientInsurance: context.userData.patientInsurance,
              collectedDataInsurance: context.userData.collectedData.insurance
            });
          } else {
            console.error('❌ ACTION create_patient_profile - createPatient returned null');
            response = 'Desculpe, não foi possível criar seu cadastro. Por favor, tente novamente ou entre em contato com nossa equipe.';
            shouldStop = true;
          }
        } catch (error: any) {
          console.error('❌ ACTION create_patient_profile - Error creating patient:', error);
          console.error('❌ ACTION create_patient_profile - Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
          response = 'Desculpe, ocorreu um erro ao criar seu cadastro. Por favor, tente novamente ou entre em contato com nossa equipe.';
          shouldStop = true;
        }
        break;
      
      case 'book_appointment':
        const collectedDataForAppt = context.userData.collectedData || {};
        const patientId = context.userData.patientId;
        
        if (!patientId) {
          console.error('❌ Cannot book appointment: patientId not found');
          response = 'Erro: Paciente não encontrado. Por favor, complete o cadastro primeiro.';
          shouldStop = true;
          break;
        }
        
        // Get patient info
        const { getPatientById } = await import('../../patientDataService');
        const patient = await getPatientById(patientId);
        
        if (!patient) {
          console.error('❌ Cannot book appointment: patient not found');
          response = 'Erro: Paciente não encontrado.';
          shouldStop = true;
          break;
        }
        
        // Parse date
        let appointmentDate: Date | null = null;
        if (collectedDataForAppt.preferred_date) {
          const dateStr = collectedDataForAppt.preferred_date;
          if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/').map(Number);
            appointmentDate = new Date(year, month - 1, day);
          } else {
            appointmentDate = new Date(dateStr);
          }
        }
        
        if (!appointmentDate) {
          console.error('❌ Cannot book appointment: date not provided');
          response = 'Erro: Data não fornecida.';
          shouldStop = true;
          break;
        }
        
        // Get procedures
        const procedures = [
          collectedDataForAppt.procedure_1,
          collectedDataForAppt.procedure_2,
          collectedDataForAppt.procedure_3
        ].filter(Boolean);
        
        const procedureNames = procedures.join(', ') || 'Não especificado';
        
        // Get time (preferred_shift or default)
        const time = collectedDataForAppt.preferred_shift || '08:00';
        
        // Get procedure duration (use first procedure)
        const firstProcedure = procedures[0] || '';
        const duration = getProcedureDuration(firstProcedure);
        
        // Create appointment
        const appointment = await createAppointment({
          patientId: patient.id,
          patientName: patient.name,
          patientPhone: patient.phone,
          procedure: procedureNames,
          date: appointmentDate,
          time: time,
          notes: `Procedimentos: ${procedureNames}\nTurno: ${collectedDataForAppt.preferred_shift || 'Não especificado'}`,
          status: 'SCHEDULED'
        });
        
        if (appointment) {
          context.userData.appointmentId = appointment.id;
          context.userData.appointmentCreated = true;
          console.log(`🔧 ACTION book_appointment - ✅ Appointment created: ${appointment.id}`);
        } else {
          console.error('❌ Failed to create appointment');
          response = 'Desculpe, não foi possível criar o agendamento. O horário pode estar indisponível.';
          shouldStop = true;
        }
        break;
      
      case 'generate_available_dates':
        const dates = await generateAvailableDates(7);
        context.userData.availableDates = dates;
        console.log(`🔧 ACTION generate_dates - Generated ${dates.length} dates`);
        break;
      
      case 'generate_available_time_slots':
        const dateForSlots = context.userData.collectedData?.preferred_date || '';
        const procedureForSlots = context.userData.collectedData?.procedure_1 || '';
        const durationForSlots = getProcedureDuration(procedureForSlots);
        
        if (dateForSlots) {
          // Normalize date format (DD/MM/YYYY to YYYY-MM-DD)
          let normalizedDate = dateForSlots;
          if (dateForSlots.includes('/')) {
            const [day, month, year] = dateForSlots.split('/');
            normalizedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          
          const slots = await generateAvailableTimeSlots(normalizedDate, durationForSlots);
          context.userData.availableTimeSlots = slots;
          console.log(`🔧 ACTION generate_time_slots - Generated ${slots.length} slots for ${normalizedDate}`);
        }
        break;
      
      default:
        console.log(`🔧 ACTION - Unknown action: "${action}"`);
    }
    
    // Get next node
    const nodeConnections = connections.get(node.id) || [];
    nextNodeId = nodeConnections[0]?.targetId;
    
  } catch (error: any) {
    console.error(`🔧 ACTION node ${node.id} - Error:`, error);
    response = 'Desculpe, ocorreu um erro. Pode tentar novamente?';
    shouldStop = true;
  }
  
  return {
    nextNodeId,
    response,
    shouldStop,
    autoAdvance: !shouldStop
  };
}

/**
 * Helper function to format date
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR');
}

