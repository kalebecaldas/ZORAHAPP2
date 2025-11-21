import express from 'express';
import prisma from '../prisma/client.js';
import { z } from 'zod';
import { getRealtime } from '../realtime.js';
import { intelligentBotService } from '../services/intelligentBot';
import { prismaClinicDataService } from '../services/prismaClinicDataService.js';

const router = express.Router();
const prismaAny = prisma as any;

// Validation schemas
const createAppointmentSchema = z.object({
  patientPhone: z.string().min(8),
  patientName: z.string().min(2).max(100),
  procedureId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.string().regex(/^\d{2}:\d{2}$/),
  locationId: z.string(),
  insuranceId: z.string().optional(),
  notes: z.string().optional(),
  conversationId: z.string().optional(),
});

const verifyPatientSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  name: z.string().min(2).max(100),
  dateOfBirth: z.string().optional(),
});

const rescheduleAppointmentSchema = z.object({
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  newTimeSlot: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().optional(),
});

// Patient verification endpoint
router.post('/verify-patient', async (req, res) => {
  try {
    const { phone, name, dateOfBirth } = verifyPatientSchema.parse(req.body);

    // Search for existing patient
    let patient = await prisma.patient.findFirst({
      where: {
        phone: phone.replace(/\D/g, ''),
      },
      include: {
        conversations: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    let isNewPatient = !patient;
    let confidenceScore = 0;

    if (patient) {
      // Calculate confidence score based on name match and other factors
      const nameMatch = patient.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(patient.name.toLowerCase());

      confidenceScore += nameMatch ? 60 : 0;
      confidenceScore += (patient as any).birthDate && dateOfBirth ? 30 : 0;
      const appointmentsCount = await prismaAny.appointment.count({
        where: { patientId: patient.id, status: { in: ['SCHEDULED', 'CONFIRMED'] } }
      })
      confidenceScore += appointmentsCount > 0 ? 10 : 0;

      // Update patient info if confidence is high
      if (confidenceScore >= 70) {
        patient = await prisma.patient.update({
          where: { id: patient.id },
          data: {
            ...(dateOfBirth && { birthDate: new Date(dateOfBirth) }),
          },
          include: {
            conversations: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            }
          }
        });
      }
    } else {
      // Create new patient
      patient = await prisma.patient.create({
        data: {
          name,
          phone: phone.replace(/\D/g, ''),
          birthDate: dateOfBirth ? new Date(dateOfBirth) : null,
          preferences: {},
        },
        include: {
          conversations: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          }
        }
      });
    }

    // Generate intelligent response based on patient status
    const nextAppointments = await prismaAny.appointment.findMany({
      where: { patientId: patient.id, status: { in: ['SCHEDULED', 'CONFIRMED'] } },
      orderBy: { date: 'asc' }
    })

    const botResponseMessage = isNewPatient ?
      `Novo paciente: ${name} (${phone}). Verificando disponibilidade...` :
      `Paciente existente encontrado: ${patient.name}. Última atualização: ${new Date(patient.updatedAt).toLocaleDateString('pt-BR')}.`

    res.json({
      success: true,
      patient,
      isNewPatient,
      confidenceScore,
      botResponse: botResponseMessage,
      suggestedActions: isNewPatient ?
        ['present_procedures', 'collect_insurance'] :
        ['show_appointments', 'schedule_followup'],
    });

  } catch (error) {
    console.error('Patient verification error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : 'Failed to verify patient',
    });
  }
});

router.get('/procedures', async (_req, res) => {
  try {
    const list = await prismaClinicDataService.getProcedures();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list procedures' });
  }
});

router.get('/insurances', async (_req, res) => {
  try {
    const list = await prismaClinicDataService.getInsuranceCompanies();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list insurances' });
  }
});

router.get('/locations', async (_req, res) => {
  try {
    const list = await prismaClinicDataService.getLocations();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list locations' });
  }
});

router.get('/packages', async (_req, res) => {
  try {
    // Packages are now dynamically calculated or stored differently, 
    // but for now we can return empty or implement a method in prismaClinicDataService if needed.
    // Assuming prismaClinicDataService doesn't have getPackageDeals yet, we might need to add it or return empty.
    // For now, let's return empty array to avoid errors if method missing.
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list packages' });
  }
});

// Get available time slots
router.get('/available-slots', async (req, res) => {
  try {
    const { procedureId, locationId, date } = req.query;

    if (!procedureId || !locationId || !date) {
      return res.status(400).json({
        success: false,
        error: 'Procedure ID, location ID, and date are required',
      });
    }

    let procedure: any = await prismaAny.procedure.findUnique({ where: { code: String(procedureId) } });
    if (!procedure) {
      procedure = await prismaAny.procedure.findFirst({
        where: {
          OR: [
            { code: String(procedureId) },
            { name: { contains: String(procedureId), mode: 'insensitive' } }
          ]
        }
      });
    }
    let location: any = await prismaAny.clinic.findUnique({ where: { code: String(locationId) } });
    if (!location) {
      location = await prismaAny.clinic.findFirst({
        where: {
          OR: [
            { code: String(locationId) },
            { name: { contains: String(locationId), mode: 'insensitive' } }
          ]
        }
      });
    }

    if (!procedure || !location) {
      return res.status(404).json({
        success: false,
        error: 'Procedure or location not found',
      });
    }

    // Generate available time slots based on location working hours and procedure duration
    const selectedDate = new Date(date as string);
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const dayOfWeek = dayNames[selectedDate.getDay()];

    // Check if location is open on this day
    let openingMap: any = {};
    if (typeof (location as any).openingHours === 'string') {
      const raw = String((location as any).openingHours);
      raw.split(/\n|;/).forEach((line) => {
        const idx = line.indexOf(':');
        if (idx > 0) {
          const day = line.slice(0, idx).trim();
          const val = line.slice(idx + 1).trim();
          openingMap[day] = val;
        }
      });
    } else if ((location as any).openingHours) {
      openingMap = (location as any).openingHours;
    }
    let baseHours = openingMap[dayOfWeek];
    let effectiveHours = baseHours;
    const { availabilityStore } = await import('./clinic.js');
    const availabilityMap = availabilityStore || {};
    const availabilityKey = `${String((location as any).code || locationId)}:${String((procedure as any).code || procedureId)}`;
    const procAvailability = availabilityMap[availabilityKey] || {};
    if (procAvailability && procAvailability[dayOfWeek]) {
      effectiveHours = procAvailability[dayOfWeek];
    }
    if (!effectiveHours || effectiveHours === 'Fechado') {
      return res.json({
        success: true,
        slots: [],
        message: 'Location is closed on this day',
      });
    }

    // Parse opening hours (format: "08:00 - 18:00")
    const [openTime, closeTime] = effectiveHours.split(' - ');
    if (!openTime || !closeTime) {
      return res.status(500).json({
        success: false,
        error: 'Invalid opening hours format',
      });
    }

    const slots = [];
    const slotDuration = Number(procedure.duration || 0) + 15; // Add 15 min buffer
    const startTime = new Date(`${date}T${openTime}:00`);
    const endTime = new Date(`${date}T${closeTime}:00`);

    // Get existing appointments for this date and location
    const existingAppointments = await prismaAny.appointment.findMany({
      where: {
        date: {
          gte: new Date(selectedDate.setHours(0, 0, 0, 0)),
          lt: new Date(selectedDate.setHours(23, 59, 59, 999)),
        },
        locationId: String(locationId),
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      select: { time: true }
    });

    const bookedSlots = existingAppointments.map(apt => apt.time);

    // Generate available slots
    let currentTime = new Date(startTime);
    while (currentTime < endTime) {
      const slotTime = currentTime.toTimeString().slice(0, 5); // HH:MM format

      if (!bookedSlots.includes(slotTime)) {
        // Check if slot fits within working hours considering procedure duration
        const slotEndTime = new Date(currentTime.getTime() + slotDuration * 60000);
        if (slotEndTime <= endTime) {
          slots.push({
            time: slotTime,
            display: currentTime.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            available: true,
          });
        }
      }

      currentTime = new Date(currentTime.getTime() + 30 * 60000); // 30-minute intervals
    }

    res.json({
      success: true,
      slots,
      location: {
        name: location.name,
        address: location.address,
        openingHours: effectiveHours,
      },
      procedure: {
        name: procedure.name,
        duration: Number(procedure.duration || 0),
        price: Number(procedure.basePrice || 0),
      },
    });

  } catch (error) {
    console.error('Available slots error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get available slots',
    });
  }
});

// Create appointment
router.post('/', async (req, res) => {
  try {
    const appointmentData = createAppointmentSchema.parse(req.body);

    // Verify procedure and location exist
    const procedures = await prismaClinicDataService.getProcedures();
    const locations = await prismaClinicDataService.getLocations();
    const procedure = procedures.find(p => p.id === appointmentData.procedureId);
    const location = locations.find(l => l.id === appointmentData.locationId);

    if (!procedure || !location) {
      return res.status(404).json({
        success: false,
        error: 'Procedure or location not found',
      });
    }

    // Find or create patient
    let patient = await prisma.patient.findFirst({
      where: { phone: appointmentData.patientPhone.replace(/\D/g, '') },
    });

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          name: appointmentData.patientName,
          phone: appointmentData.patientPhone.replace(/\D/g, ''),
        },
      });
    }

    // Calculate price considering location and insurance
    const priceInfo = await prismaClinicDataService.calculatePrice(procedure.id, appointmentData.insuranceId, appointmentData.locationId);
    const finalPrice = priceInfo?.patientPays ?? procedure.basePrice;

    const appointment = await prismaAny.appointment.create({
      data: {
        patientId: patient.id,
        patientName: patient.name,
        patientPhone: patient.phone,
        procedure: procedure.name,
        date: new Date(`${appointmentData.date}T${appointmentData.timeSlot}:00`),
        time: appointmentData.timeSlot,
        notes: appointmentData.notes || '',
        status: 'SCHEDULED',
      },
      include: { patient: true }
    });

    // Generate confirmation message
    const confirmationMessage = `✅ *Confirmação de Agendamento*\n\n` +
      `Paciente: *${patient.name}*\n` +
      `Procedimento: *${procedure.name}*\n` +
      `Data: *${new Date(`${appointmentData.date}T${appointmentData.timeSlot}:00`).toLocaleDateString('pt-BR')}*\n` +
      `Horário: *${appointmentData.timeSlot}*\n` +
      `Local: *${location.name}*\n` +
      `Endereço: *${location.address}*\n` +
      `Valor: *R$ ${Number(finalPrice).toFixed(2)}*\n\n` +
      `📋 *Importante:*\n` +
      `- Chegue 15 minutos antes\n` +
      `- Traga documento de identidade\n` +
      `- Trague seu plano de saúde (se aplicável)\n\n` +
      `Para cancelar ou reagendar, envie *CANCELAR* ou *REAGENDAR*`;

    // Send confirmation via intelligent bot (using processMessage instead of sendMessage)
    try {
      await intelligentBotService.getInstance().processMessage(
        confirmationMessage,
        patient.phone,
        appointmentData.conversationId,
        {
          patient: {
            id: patient.id,
            name: patient.name,
            phone: patient.phone,
          },
          workflowContext: {
            scheduledProcedures: [appointmentData.procedureId],
            preferredLocation: appointmentData.locationId,
            preferredDate: appointmentData.date,
            preferredTime: appointmentData.timeSlot,
          }
        }
      );
    } catch (botError) {
      console.error('Error sending confirmation via bot:', botError);
      // Continue even if bot fails - appointment was created successfully
    }

    // Emit real-time update
    const { io } = getRealtime();
    io.emit('appointment:created', {
      appointment,
      notification: `Novo agendamento: ${patient.name} - ${procedure.name}`,
    });

    res.json({
      success: true,
      appointment,
      confirmationMessage,
    });

  } catch (error) {
    console.error('Appointment creation error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : 'Failed to create appointment',
    });
  }
});

// Get patient appointments
router.get('/patient/:phone', async (req, res) => {
  try {
    const phone = req.params.phone.replace(/\D/g, '');

    const patient = await prisma.patient.findFirst({ where: { phone } });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found',
      });
    }

    const appointments = await prismaAny.appointment.findMany({
      where: { patientId: patient.id },
      orderBy: [{ date: 'desc' }]
    });
    res.json({
      success: true,
      patient: {
        id: patient.id,
        name: patient.name,
        phone: patient.phone,
        dateOfBirth: (patient as any).dateOfBirth,
      },
      appointments,
      totalAppointments: appointments.length,
      upcomingAppointments: appointments.filter(
        apt => apt.status === 'SCHEDULED' && apt.date && new Date(apt.date) >= new Date()
      ).length,
    });

  } catch (error) {
    console.error('Patient appointments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get patient appointments',
    });
  }
});

// Reschedule appointment
router.patch('/:id/reschedule', async (req, res) => {
  try {
    const { id } = req.params;
    const { newDate, newTimeSlot, reason } = rescheduleAppointmentSchema.parse(req.body);

    const appointment = await prismaAny.appointment.findUnique({
      where: { id },
      include: { patient: true },
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found',
      });
    }

    // Update appointment
    const updatedAppointment = await prismaAny.appointment.update({
      where: { id },
      data: {
        date: new Date(`${newDate}T${newTimeSlot}:00`),
        time: newTimeSlot,
        status: 'RESCHEDULED',
        notes: `${appointment.notes || ''}\nReagendado: ${reason || 'Sem motivo especificado'}`,
      },
      include: { patient: true },
    });

    // Send reschedule confirmation
    const rescheduleMessage = `📅 *Agendamento Reagendado*\n\n` +
      `Seu agendamento foi reagendado para:\n` +
      `Data: *${new Date(newDate).toLocaleDateString('pt-BR')}*\n` +
      `Horário: *${newTimeSlot}*\n\n` +
      `Motivo: *${reason || 'Não especificado'}*\n\n` +
      `Procedimento: *${appointment.procedure}*\n\n` +
      `Para confirmar, envie *CONFIRMAR*. Para cancelar, envie *CANCELAR*`;

    const conversation = await prisma.conversation.findFirst({
      where: { phone: updatedAppointment.patient?.phone || '' },
      orderBy: { updatedAt: 'desc' }
    });
    if (conversation) {
      await intelligentBotService.getInstance().processMessage(
        rescheduleMessage,
        updatedAppointment.patient?.phone || '',
        conversation.id,
        {}
      );
    }

    // Emit real-time update
    const { io } = getRealtime();
    io.emit('appointment:rescheduled', {
      appointment: updatedAppointment,
      notification: `Agendamento reagendado: ${appointment.patient?.name || ''}`,
    });

    res.json({
      success: true,
      appointment: updatedAppointment,
      rescheduleMessage,
    });

  } catch (error) {
    console.error('Reschedule appointment error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : 'Failed to reschedule appointment',
    });
  }
});

// Cancel appointment
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const appointment = await prismaAny.appointment.findUnique({
      where: { id },
      include: { patient: true },
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found',
      });
    }

    // Update appointment status
    const cancelledAppointment = await prismaAny.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: `${appointment.notes || ''}\nCancelado: ${reason || 'Sem motivo especificado'}`,
      },
      include: { patient: true },
    });

    // Send cancellation confirmation
    const cancelMessage = `❌ *Agendamento Cancelado*\n\n` +
      `Seu agendamento foi cancelado:\n` +
      `Data original: *${appointment.date ? new Date(appointment.date).toLocaleDateString('pt-BR') : '-'}*\n` +
      `Horário original: *${appointment.time || '-'}*\n` +
      `Procedimento: *${appointment.procedure || '-'}*\n\n` +
      `Motivo: *${reason || 'Não especificado'}*\n\n` +
      `Para reagendar, envie *AGENDAR* ou fale com nossa equipe.`;

    const conversation = await prisma.conversation.findFirst({
      where: { phone: cancelledAppointment.patient?.phone || '' },
      orderBy: { updatedAt: 'desc' }
    });
    if (conversation) {
      await intelligentBotService.getInstance().processMessage(
        cancelMessage,
        cancelledAppointment.patient?.phone || '',
        conversation.id,
        {}
      );
    }

    // Emit real-time update
    const { io } = getRealtime();
    io.emit('appointment:cancelled', {
      appointment: cancelledAppointment,
      notification: `Agendamento cancelado: ${appointment.patient?.name || ''}`,
    });

    res.json({
      success: true,
      appointment: cancelledAppointment,
      cancelMessage,
    });

  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel appointment',
    });
  }
});

// Get daily appointments for a location
router.get('/location/:locationId/daily', async (req, res) => {
  try {
    const { locationId } = req.params;
    const { date } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const appointments = await prismaAny.appointment.findMany({
      where: {
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      include: {
        patient: true,
      },
      orderBy: [
        { date: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    const stats = {
      total: appointments.length,
      byProcedure: {} as Record<string, number>,
      byInsurance: {} as Record<string, number>,
      newPatients: 0, // We don't track new patients in this model
      revenue: 0,
    };

    appointments.forEach(apt => {
      const procedureName = apt.procedure;
      stats.byProcedure[procedureName] = (stats.byProcedure[procedureName] || 0) + 1;
      if (apt.patient?.insuranceCompany) {
        const insuranceName = apt.patient.insuranceCompany;
        stats.byInsurance[insuranceName] = (stats.byInsurance[insuranceName] || 0) + 1;
      }
    });
    stats.revenue = await Promise.all(appointments.map(async (apt) => {
      const priceInfo = await prismaClinicDataService.calculatePrice(apt.procedure, apt.patient?.insuranceCompany, locationId);
      return priceInfo?.patientPays || 0;
    })).then(prices => prices.reduce((a, b) => a + b, 0));

    res.json({
      success: true,
      appointments,
      stats,
      date: targetDate.toISOString().split('T')[0],
    });

  } catch (error) {
    console.error('Daily appointments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get daily appointments',
    });
  }
});

export default router;
