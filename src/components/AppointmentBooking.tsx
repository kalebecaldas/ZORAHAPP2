import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, MapPin, User, Phone, CreditCard, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConversationStore } from '../stores/conversationStore';
import { intelligentBotService } from '../services/intelligentBot';
import { clinicData } from '../data/clinicData';

interface AppointmentBookingProps {
  conversationId: string;
  onComplete?: (appointment: any) => void;
  onCancel?: () => void;
}

interface PatientInfo {
  name: string;
  phone: string;
  dateOfBirth?: string;
  isNew?: boolean;
  confidenceScore?: number;
}

interface BookingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export const AppointmentBooking: React.FC<AppointmentBookingProps> = ({
  conversationId,
  onComplete,
  onCancel,
}) => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [selectedProcedure, setSelectedProcedure] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [selectedInsurance, setSelectedInsurance] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);

  const [steps, setSteps] = useState<BookingStep[]>([
    { id: 'patient', title: 'Verificação do Paciente', description: 'Confirme suas informações', completed: false },
    { id: 'procedure', title: 'Procedimento', description: 'Escolha o procedimento', completed: false },
    { id: 'location', title: 'Localização', description: 'Selecione a unidade', completed: false },
    { id: 'datetime', title: 'Data e Horário', description: 'Escolha data e hora', completed: false },
    { id: 'insurance', title: 'Convênio', description: 'Informe seu plano (opcional)', completed: false },
    { id: 'confirm', title: 'Confirmação', description: 'Revise e confirme', completed: false },
  ]);

  // Verify patient mutation
  const verifyPatientMutation = useMutation({
    mutationFn: async (data: { phone: string; name: string; dateOfBirth?: string }) => {
      const response = await fetch('/api/appointments/verify-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, conversationId }),
      });
      if (!response.ok) throw new Error('Failed to verify patient');
      return response.json();
    },
    onSuccess: (data) => {
      setPatientInfo({
        name: data.patient.name,
        phone: data.patient.phone,
        dateOfBirth: data.patient.dateOfBirth,
        isNew: data.isNewPatient,
        confidenceScore: data.confidenceScore,
      });
      
      // Update steps based on patient status
      if (!data.isNewPatient) {
        setSteps(prev => prev.map(step => 
          step.id === 'patient' ? { ...step, completed: true } : step
        ));
        setCurrentStep(1);
      }
      
      // Send bot response
      if (data.botResponse) {
        intelligentBotService.sendMessage({
          conversationId,
          message: data.botResponse,
          context: { patient: data.patient, isNewPatient: data.isNewPatient },
        });
      }
    },
  });

  // Get available slots
  const { data: availableSlots } = useQuery({
    queryKey: ['available-slots', selectedProcedure, selectedLocation, selectedDate],
    queryFn: async () => {
      if (!selectedProcedure || !selectedLocation || !selectedDate) return null;
      
      const response = await fetch(
        `/api/appointments/available-slots?procedureId=${selectedProcedure}&locationId=${selectedLocation}&date=${format(selectedDate, 'yyyy-MM-dd')}`
      );
      if (!response.ok) throw new Error('Failed to get available slots');
      return response.json();
    },
    enabled: !!selectedProcedure && !!selectedLocation && !!selectedDate,
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      if (!patientInfo || !selectedProcedure || !selectedLocation || !selectedDate || !selectedTimeSlot) {
        throw new Error('Missing required information');
      }

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientPhone: patientInfo.phone,
          patientName: patientInfo.name,
          procedureId: selectedProcedure,
          date: format(selectedDate, 'yyyy-MM-dd'),
          timeSlot: selectedTimeSlot,
          locationId: selectedLocation,
          insuranceId: selectedInsurance || undefined,
          notes,
          conversationId,
        }),
      });
      if (!response.ok) throw new Error('Failed to create appointment');
      return response.json();
    },
    onSuccess: (data) => {
      setSteps(prev => prev.map(step => ({ ...step, completed: true })));
      onComplete?.(data.appointment);
      
      // Send success message via bot
      intelligentBotService.sendMessage({
        conversationId,
        message: data.confirmationMessage,
        context: { appointment: data.appointment },
      });
    },
  });

  // Generate calendar days
  const generateCalendarDays = () => {
    const today = new Date();
    const startDate = today;
    const endDate = addDays(today, 30); // Next 30 days
    
    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  const calendarDays = generateCalendarDays();

  // Handle patient verification
  const handlePatientVerification = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    setIsVerifying(true);
    await verifyPatientMutation.mutateAsync({
      phone: formData.get('phone') as string,
      name: formData.get('name') as string,
      dateOfBirth: formData.get('dateOfBirth') as string,
    });
    setIsVerifying(false);
  };

  // Progress to next step
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setSteps(prev => prev.map((step, index) => 
        index === currentStep ? { ...step, completed: true } : step
      ));
      setCurrentStep(currentStep + 1);
    }
  };

  // Go to previous step
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Patient Verification
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Verificação do Paciente</h3>
              <p className="text-gray-600">Por favor, confirme suas informações para agendamento</p>
            </div>

            <form onSubmit={handlePatientVerification} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="inline w-4 h-4 mr-2" />
                  Telefone
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  defaultValue={patientInfo?.phone || ''}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="inline w-4 h-4 mr-2" />
                  Nome Completo
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={patientInfo?.name || ''}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Seu nome completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline w-4 h-4 mr-2" />
                  Data de Nascimento (opcional)
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  defaultValue={patientInfo?.dateOfBirth || ''}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={verifyPatientMutation.isPending || isVerifying}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {verifyPatientMutation.isPending || isVerifying ? (
                  <Loader2 className="inline w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="inline w-5 h-5 mr-2" />
                )}
                Verificar Paciente
              </button>
            </form>

            {patientInfo && (
              <div className={`p-4 rounded-lg ${patientInfo.isNew ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
                <div className="flex items-center">
                  {patientInfo.isNew ? (
                    <AlertCircle className="w-5 h-5 text-green-600 mr-2" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {patientInfo.isNew ? 'Novo Paciente' : 'Paciente Existente'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {patientInfo.name} - Confiança: {patientInfo.confidenceScore}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        );

      case 1: // Procedure Selection
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Escolha o Procedimento</h3>
              <p className="text-gray-600">Selecione o procedimento desejado</p>
            </div>

            <div className="grid gap-4">
              {clinicData.procedures.map((procedure) => (
                <div
                  key={procedure.id}
                  onClick={() => setSelectedProcedure(procedure.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedProcedure === procedure.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{procedure.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{procedure.description}</p>
                      <div className="flex items-center mt-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-1" />
                        {procedure.duration} min
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">R$ {procedure.price.toFixed(2)}</p>
                      {procedure.requiresPreparation && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                          Requer preparação
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );

      case 2: // Location Selection
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Escolha a Unidade</h3>
              <p className="text-gray-600">Selecione o local mais conveniente para você</p>
            </div>

            <div className="grid gap-4">
              {clinicData.locations.map((location) => (
                <div
                  key={location.id}
                  onClick={() => setSelectedLocation(location.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedLocation === location.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start">
                    <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{location.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{location.address}</p>
                      <div className="mt-2 text-sm text-gray-500">
                        <p>Telefone: {location.phone}</p>
                        <p>Horário: Seg-Sex 8h-18h, Sáb 8h-12h</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );

      case 3: // Date and Time Selection
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Escolha Data e Horário</h3>
              <p className="text-gray-600">Selecione a data e horário mais convenientes</p>
            </div>

            {/* Calendar */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-7 gap-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
                {calendarDays.map((day) => (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    disabled={isBefore(day, startOfDay(new Date()))}
                    className={`p-2 text-sm rounded-lg transition-colors ${
                      selectedDate && isSameDay(selectedDate, day)
                        ? 'bg-blue-600 text-white'
                        : isBefore(day, startOfDay(new Date()))
                        ? 'text-gray-300 cursor-not-allowed'
                        : isToday(day)
                        ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {format(day, 'd')}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slots */}
            {selectedDate && availableSlots && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">
                  Horários disponíveis para {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
                </h4>
                
                {availableSlots.slots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.slots.map((slot: any) => (
                      <button
                        key={slot.time}
                        onClick={() => setSelectedTimeSlot(slot.time)}
                        className={`p-3 text-sm border rounded-lg transition-colors ${
                          selectedTimeSlot === slot.time
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {slot.display}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Nenhum horário disponível para esta data.</p>
                )}
              </div>
            )}
          </motion.div>
        );

      case 4: // Insurance Selection
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Convênio (Opcional)</h3>
              <p className="text-gray-600">Selecione seu plano de saúde se tiver convênio</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setSelectedInsurance('')}
                className={`w-full p-4 border rounded-lg text-left transition-colors ${
                  selectedInsurance === ''
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <CreditCard className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Particular</p>
                    <p className="text-sm text-gray-600">Sem convênio médico</p>
                  </div>
                </div>
              </button>

              {clinicData.insuranceCompanies.map((insurance) => (
                <button
                  key={insurance.id}
                  onClick={() => setSelectedInsurance(insurance.id)}
                  className={`w-full p-4 border rounded-lg text-left transition-colors ${
                    selectedInsurance === insurance.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CreditCard className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{insurance.name}</p>
                        <p className="text-sm text-gray-600">{insurance.description}</p>
                      </div>
                    </div>
                    {selectedInsurance === insurance.id && (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="inline w-4 h-4 mr-2" />
                Observações (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Alguma observação importante para o atendimento..."
              />
            </div>
          </motion.div>
        );

      case 5: // Confirmation
        const selectedProcedureData = clinicData.procedures.find(p => p.id === selectedProcedure);
        const selectedLocationData = clinicData.locations.find(l => l.id === selectedLocation);
        const selectedInsuranceData = clinicData.insuranceCompanies.find(i => i.id === selectedInsurance);

        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Confirmação do Agendamento</h3>
              <p className="text-gray-600">Revise os detalhes antes de confirmar</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
              <div className="flex items-center">
                <User className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">{patientInfo?.name}</p>
                  <p className="text-sm text-gray-600">{patientInfo?.phone}</p>
                </div>
              </div>

              <div className="flex items-center">
                <FileText className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">{selectedProcedureData?.name}</p>
                  <p className="text-sm text-gray-600">{selectedProcedureData?.description}</p>
                </div>
              </div>

              <div className="flex items-center">
                <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">{selectedLocationData?.name}</p>
                  <p className="text-sm text-gray-600">{selectedLocationData?.address}</p>
                </div>
              </div>

              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedDate && format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                  <p className="text-sm text-gray-600">às {selectedTimeSlot}</p>
                </div>
              </div>

              <div className="flex items-center">
                <CreditCard className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedInsuranceData ? selectedInsuranceData.name : 'Particular'}
                  </p>
                  {selectedProcedureData && (
                    <p className="text-sm text-gray-600">
                      Valor: R$ {selectedProcedureData.price.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>

              {notes && (
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                  <div>
                    <p className="font-medium text-gray-900">Observações</p>
                    <p className="text-sm text-gray-600">{notes}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-1" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Importante:</p>
                  <ul className="mt-1 space-y-1">
                    <li>• Chegue 15 minutos antes do horário agendado</li>
                    <li>• Traga documento de identidade</li>
                    <li>• Trague seu plano de saúde (se aplicável)</li>
                    <li>• Para cancelar ou reagendar, envie CANCELAR ou REAGENDAR</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    index <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className="text-sm font-medium text-gray-900">{step.title}</p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-4 ${
                    index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {renderStepContent()}
        </div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={prevStep}
          disabled={currentStep === 0}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Anterior
        </button>

        <div className="space-x-4">
          <button
            onClick={onCancel}
            className="px-6 py-3 border border-red-300 rounded-lg text-red-700 hover:bg-red-50 transition-colors"
          >
            Cancelar
          </button>

          {currentStep === steps.length - 1 ? (
            <button
              onClick={() => createAppointmentMutation.mutate()}
              disabled={createAppointmentMutation.isPending}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createAppointmentMutation.isPending ? (
                <Loader2 className="inline w-5 h-5 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="inline w-5 h-5 mr-2" />
              )}
              Confirmar Agendamento
            </button>
          ) : (
            <button
              onClick={nextStep}
              disabled={
                (currentStep === 0 && !patientInfo) ||
                (currentStep === 1 && !selectedProcedure) ||
                (currentStep === 2 && !selectedLocation) ||
                (currentStep === 3 && (!selectedDate || !selectedTimeSlot))
              }
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Próximo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};