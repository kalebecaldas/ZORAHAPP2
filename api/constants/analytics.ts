/**
 * Close categories that count as conversion: appointment was booked at close.
 * Product rule: every conversion is an appointment (convênio or particular).
 */
export const APPOINTMENT_CLOSE_CATEGORIES = [
  'AGENDAMENTO',
  'AGENDAMENTO_PARTICULAR',
] as const

export type AppointmentCloseCategory = (typeof APPOINTMENT_CLOSE_CATEGORIES)[number]

export function isAppointmentCloseCategory(
  category: string | null | undefined
): boolean {
  return (
    category === 'AGENDAMENTO' || category === 'AGENDAMENTO_PARTICULAR'
  )
}
