import { PrismaClient } from '@prisma/client';
import { clinicData } from '../data/clinicData';

const prisma = new PrismaClient();

/**
 * Appointment Data Service
 * Centralized service for managing appointment operations
 * Integrates with clinicData.ts for business hours and availability
 */

export interface AppointmentInfo {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  procedure: string;
  date: Date;
  time: string;
  notes?: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AvailableSlot {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  available: boolean;
}

/**
 * Get business hours for a specific day
 */
function getBusinessHours(dayOfWeek: number): { open: string; close: string } | null {
  // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  if (dayOfWeek === 0) {
    // Sunday - closed
    return null;
  }
  
  if (dayOfWeek === 6) {
    // Saturday
    return {
      open: clinicData.businessHours.saturday.split(' - ')[0] || '07:30',
      close: clinicData.businessHours.saturday.split(' - ')[1] || '12:00'
    };
  }
  
  // Weekdays (Monday to Friday)
  return {
    open: clinicData.businessHours.weekdays.split(' - ')[0] || '07:30',
    close: clinicData.businessHours.weekdays.split(' - ')[1] || '19:30'
  };
}

/**
 * Check if a date/time is within business hours
 */
function isWithinBusinessHours(date: Date, time: string): boolean {
  const dayOfWeek = date.getDay();
  const hours = getBusinessHours(dayOfWeek);
  
  if (!hours) {
    return false; // Closed on this day
  }
  
  const [timeHour, timeMinute] = time.split(':').map(Number);
  const [openHour, openMinute] = hours.open.split(':').map(Number);
  const [closeHour, closeMinute] = hours.close.split(':').map(Number);
  
  const appointmentTime = timeHour * 60 + timeMinute;
  const openTime = openHour * 60 + openMinute;
  const closeTime = closeHour * 60 + closeMinute;
  
  return appointmentTime >= openTime && appointmentTime <= closeTime;
}

/**
 * Generate available dates for the next N days
 */
export async function generateAvailableDates(
  daysAhead: number = 7,
  clinicCode?: string
): Promise<string[]> {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 1; i <= daysAhead; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    const dayOfWeek = date.getDay();
    const hours = getBusinessHours(dayOfWeek);
    
    // Only include days when clinic is open
    if (hours) {
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      dates.push(dateStr);
    }
  }
  
  return dates;
}

/**
 * Generate available time slots for a specific date
 */
export async function generateAvailableTimeSlots(
  date: string, // YYYY-MM-DD
  procedureDuration: number = 30, // minutes
  clinicCode?: string
): Promise<AvailableSlot[]> {
  const appointmentDate = new Date(date);
  const dayOfWeek = appointmentDate.getDay();
  const hours = getBusinessHours(dayOfWeek);
  
  if (!hours) {
    return []; // Clinic is closed
  }
  
  const slots: AvailableSlot[] = [];
  const [openHour, openMinute] = hours.open.split(':').map(Number);
  const [closeHour, closeMinute] = hours.close.split(':').map(Number);
  
  // Generate slots every 30 minutes
  let currentHour = openHour;
  let currentMinute = openMinute;
  
  while (currentHour < closeHour || (currentHour === closeHour && currentMinute <= closeMinute)) {
    const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    
    // Check if this slot is available (not conflicting with existing appointments)
    const isAvailable = await checkSlotAvailability(date, timeStr, procedureDuration);
    
    slots.push({
      date,
      time: timeStr,
      available: isAvailable
    });
    
    // Move to next slot (30 minutes later)
    currentMinute += 30;
    if (currentMinute >= 60) {
      currentMinute = 0;
      currentHour += 1;
    }
  }
  
  return slots;
}

/**
 * Check if a specific time slot is available
 */
export async function checkSlotAvailability(
  date: string, // YYYY-MM-DD
  time: string, // HH:MM
  procedureDuration: number = 30
): Promise<boolean> {
  try {
    const appointmentDate = new Date(date);
    
    // Check if within business hours
    if (!isWithinBusinessHours(appointmentDate, time)) {
      return false;
    }
    
    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      return false;
    }
    
    // Calculate end time
    const [hour, minute] = time.split(':').map(Number);
    const startTime = new Date(appointmentDate);
    startTime.setHours(hour, minute, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + procedureDuration);
    
    // Check for conflicting appointments
    const conflicts = await prisma.appointment.findMany({
      where: {
        date: {
          gte: startTime,
          lt: endTime
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED']
        }
      }
    });
    
    // For now, allow only one appointment per slot
    // In the future, you could check clinic capacity
    return conflicts.length === 0;
    
  } catch (error) {
    console.error('Error checking slot availability:', error);
    return false;
  }
}

/**
 * Create a new appointment
 */
export async function createAppointment(data: {
  patientId: string;
  patientName: string;
  patientPhone: string;
  procedure: string;
  date: Date | string;
  time: string;
  notes?: string | null;
  status?: string;
}): Promise<AppointmentInfo | null> {
  try {
    // Normalize date
    const appointmentDate = typeof data.date === 'string' ? new Date(data.date) : data.date;
    
    // Validate date/time
    if (!isWithinBusinessHours(appointmentDate, data.time)) {
      console.error('❌ Appointment time is outside business hours');
      return null;
    }
    
    // Check availability
    const dateStr = appointmentDate.toISOString().split('T')[0];
    const isAvailable = await checkSlotAvailability(dateStr, data.time, 30); // Default 30 min
    
    if (!isAvailable) {
      console.error('❌ Time slot is not available');
      return null;
    }
    
    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        patientId: data.patientId,
        patientName: data.patientName,
        patientPhone: data.patientPhone,
        procedure: data.procedure,
        date: appointmentDate,
        time: data.time,
        notes: data.notes || null,
        status: data.status || 'SCHEDULED'
      }
    });
    
    console.log(`✅ Appointment created: ${appointment.id} for ${data.patientName} on ${dateStr} at ${data.time}`);
    
    return {
      id: appointment.id,
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      patientPhone: appointment.patientPhone,
      procedure: appointment.procedure,
      date: appointment.date,
      time: appointment.time,
      notes: appointment.notes,
      status: appointment.status,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt
    };
    
  } catch (error) {
    console.error('Error creating appointment:', error);
    return null;
  }
}

/**
 * Find appointments by patient ID
 */
export async function findAppointmentsByPatient(
  patientId: string,
  status?: string[]
): Promise<AppointmentInfo[]> {
  try {
    const where: any = { patientId };
    
    if (status && status.length > 0) {
      where.status = { in: status };
    }
    
    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { date: 'asc' }
    });
    
    return appointments.map(apt => ({
      id: apt.id,
      patientId: apt.patientId,
      patientName: apt.patientName,
      patientPhone: apt.patientPhone,
      procedure: apt.procedure,
      date: apt.date,
      time: apt.time,
      notes: apt.notes,
      status: apt.status,
      createdAt: apt.createdAt,
      updatedAt: apt.updatedAt
    }));
    
  } catch (error) {
    console.error('Error finding appointments by patient:', error);
    return [];
  }
}

/**
 * Find appointment by ID
 */
export async function findAppointmentById(appointmentId: string): Promise<AppointmentInfo | null> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId }
    });
    
    if (!appointment) {
      return null;
    }
    
    return {
      id: appointment.id,
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      patientPhone: appointment.patientPhone,
      procedure: appointment.procedure,
      date: appointment.date,
      time: appointment.time,
      notes: appointment.notes,
      status: appointment.status,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt
    };
    
  } catch (error) {
    console.error('Error finding appointment by ID:', error);
    return null;
  }
}

/**
 * Update appointment
 */
export async function updateAppointment(
  appointmentId: string,
  data: Partial<{
    procedure: string;
    date: Date | string;
    time: string;
    notes: string | null;
    status: string;
  }>
): Promise<AppointmentInfo | null> {
  try {
    const updateData: any = { ...data };
    
    // Normalize date if provided
    if (updateData.date) {
      updateData.date = typeof updateData.date === 'string' 
        ? new Date(updateData.date) 
        : updateData.date;
      
      // Validate new date/time if both are being updated
      if (updateData.time && !isWithinBusinessHours(updateData.date, updateData.time)) {
        console.error('❌ New appointment time is outside business hours');
        return null;
      }
    }
    
    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: updateData
    });
    
    return {
      id: appointment.id,
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      patientPhone: appointment.patientPhone,
      procedure: appointment.procedure,
      date: appointment.date,
      time: appointment.time,
      notes: appointment.notes,
      status: appointment.status,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt
    };
    
  } catch (error) {
    console.error('Error updating appointment:', error);
    return null;
  }
}

/**
 * Cancel appointment
 */
export async function cancelAppointment(
  appointmentId: string,
  reason?: string
): Promise<boolean> {
  try {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CANCELLED',
        notes: reason ? `${reason}\n\n${new Date().toLocaleString('pt-BR')}` : null
      }
    });
    
    console.log(`✅ Appointment cancelled: ${appointmentId}`);
    return true;
    
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return false;
  }
}

/**
 * Format appointment info for display
 */
export function formatAppointmentInfo(appointment: AppointmentInfo | null): string {
  if (!appointment) {
    return 'Agendamento não encontrado.';
  }
  
  const date = new Date(appointment.date);
  const dateStr = date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  
  let info = `📅 **Agendamento**\n\n`;
  info += `👤 **Paciente:** ${appointment.patientName}\n`;
  info += `📱 **Telefone:** ${appointment.patientPhone}\n`;
  info += `🩺 **Procedimento:** ${appointment.procedure}\n`;
  info += `📆 **Data:** ${dateStr}\n`;
  info += `⏰ **Horário:** ${appointment.time}\n`;
  info += `📊 **Status:** ${appointment.status}\n`;
  
  if (appointment.notes) {
    info += `\n📝 **Observações:**\n${appointment.notes}`;
  }
  
  return info;
}

/**
 * Get procedure duration from clinicData.ts
 */
export function getProcedureDuration(procedureName: string): number {
  const procedure = clinicData.procedures.find(
    p => p.name.toLowerCase().includes(procedureName.toLowerCase()) ||
         p.id.toLowerCase().includes(procedureName.toLowerCase())
  );
  
  return procedure?.duration || 30; // Default 30 minutes
}

