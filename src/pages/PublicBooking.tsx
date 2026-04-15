import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Clock, User, Mail, Phone, Users, AlertCircle, CheckCircle, X } from 'lucide-react';
import { availabilityApi } from '../lib/availabilityApi';
import { supabase } from '../lib/supabase';
import { AvailabilitySettings } from '../types';
import Calendar from '../components/Calendar';
import TimeSlotPicker from '../components/TimeSlotPicker';
import BookingSuccess from '../components/BookingSuccess';

type BookingStep = 'client-info' | 'calendar' | 'success';

interface Toast {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
}

const STANDARD_MEETING_DURATION = 30;

const standardMeetingType = {
  id: 'standard',
  title: 'Reunião de 30 minutos',
  duration: STANDARD_MEETING_DURATION,
  description: 'Conversa rápida para discutir suas necessidades',
  color: 'bg-gray-900'
};

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-right duration-300 ${
            toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : toast.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : toast.type === 'warning' ? (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-sm font-medium flex-1">{toast.message}</p>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-current opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function PublicBooking() {
  const [step, setStep] = useState<BookingStep>('client-info');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientGender, setClientGender] = useState<'male' | 'female' | ''>('');

  const [bookingData, setBookingData] = useState<{
    name: string;
    email: string;
    phone: string;
    meetLink: string;
  } | null>(null);

  const [availabilitySettings, setAvailabilitySettings] = useState<AvailabilitySettings | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingMeet, setIsCreatingMeet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).substring(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const settings = await availabilityApi.getSettings();
      setAvailabilitySettings(settings);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erro ao carregar dados. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setIsLoading(true);

    try {
      if (!availabilitySettings) {
        setAvailableSlots([]);
        setIsLoading(false);
        return;
      }

      const dateStr = date.toISOString().split('T')[0];

      const { data: attendants, error: attendantsError } = await supabase
        .from('profiles')
        .select('id, daily_limit, is_active, gender, google_connected')
        .eq('role', 'attendant')
        .eq('is_active', true)
        .eq('gender', clientGender)
        .eq('google_connected', true);

      if (attendantsError) {
        throw attendantsError;
      }

      if (!attendants || attendants.length === 0) {
        setAvailableSlots([]);
        setIsLoading(false);
        return;
      }

      const totalCapacity = attendants.reduce((sum, att) => sum + (att.daily_limit || 0), 0);

      const { count: totalBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('date', dateStr)
        .eq('status', 'confirmed');

      if (bookingsError) {
        throw bookingsError;
      }

      const confirmedBookings = totalBookings || 0;

      if (confirmedBookings >= totalCapacity) {
        setAvailableSlots([]);
        setIsLoading(false);
        return;
      }

      const allSlots = availabilityApi.generateTimeSlots(
        availabilitySettings.startTime,
        availabilitySettings.endTime,
        availabilitySettings.slotDuration
      );

      setAvailableSlots(allSlots);
    } catch (err) {
      console.error('Error loading slots:', err);
      setAvailableSlots([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeSelect = async (time: string) => {
    if (!selectedDate || !clientGender) return;

    setSelectedTime(time);
    setIsCreatingMeet(true);

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];

      const { data: attendants } = await supabase
        .from('profiles')
        .select('id, daily_limit, is_active, gender, google_connected')
        .eq('role', 'attendant')
        .eq('is_active', true)
        .eq('gender', clientGender)
        .eq('google_connected', true);

      if (!attendants || attendants.length === 0) {
        addToast('warning', 'Desculpe, não há atendentes com Google conectado disponíveis no momento. Por favor, tente mais tarde.');
        setIsCreatingMeet(false);
        return;
      }

      const availableAttendants = [];

      for (const attendant of attendants) {
        const { count } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', attendant.id)
          .eq('date', dateStr)
          .eq('status', 'confirmed');

        const bookingCount = count || 0;

        if (bookingCount < (attendant.daily_limit || 0)) {
          availableAttendants.push(attendant);
        }
      }

      if (availableAttendants.length === 0) {
        addToast('warning', 'Desculpe, todos os atendentes atingiram o limite para esta data. Por favor, escolha outra data.');
        setIsCreatingMeet(false);
        return;
      }

      const randomIndex = Math.floor(Math.random() * availableAttendants.length);
      const selectedAttendant = availableAttendants[randomIndex];

      const [hours, minutes] = time.split(':').map(Number);
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(hours, minutes, 0, 0);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const meetResponse = await fetch(`${supabaseUrl}/functions/v1/create-google-meet-event`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendantId: selectedAttendant.id,
          clientName,
          clientEmail,
          startTime: startDateTime.toISOString(),
          duration: STANDARD_MEETING_DURATION,
          meetingType: 'Reunião de 30 minutos',
        }),
      });

      const meetResult = await meetResponse.json();

      if (!meetResult.success || !meetResult.meetLink) {
        const errorMsg = meetResult.error || 'Falha ao criar link do Google Meet';
        addToast('error', errorMsg);
        setIsCreatingMeet(false);
        return;
      }

      const meetLink = meetResult.meetLink;

      const { data: bookingResult, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          client_gender: clientGender,
          meeting_type: 'Reunião de 30 minutos',
          reason: 'Agendamento via sistema',
          date: dateStr,
          time: time,
          meet_link: meetLink,
          status: 'confirmed',
          assigned_to: selectedAttendant.id,
          assignment_date: dateStr
        })
        .select()
        .maybeSingle();

      if (bookingError) throw bookingError;
      if (!bookingResult) throw new Error('Falha ao criar agendamento');

      setBookingData({
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
        meetLink
      });
      setStep('success');

    } catch (err: any) {
      console.error('Error creating booking:', err);
      addToast('error', err.message || 'Erro ao criar agendamento. Por favor, tente novamente.');
    } finally {
      setIsCreatingMeet(false);
    }
  };

  const handleNewBooking = () => {
    setStep('client-info');
    setSelectedDate(null);
    setSelectedTime(null);
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setClientGender('');
    setBookingData(null);
    loadData();
  };

  const handleClientInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (clientName && clientEmail && clientPhone && clientGender) {
      setStep('calendar');
    }
  };

  const handleBack = () => {
    if (step === 'calendar') {
      setStep('client-info');
      setSelectedDate(null);
      setSelectedTime(null);
    }
  };

  const isDayAvailable = (date: Date): boolean => {
    if (!availabilitySettings) return false;
    const dayOfWeek = date.getDay();
    return availabilitySettings.daysOfWeek.includes(dayOfWeek);
  };

  if (isLoading && !availabilitySettings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Compromise</h1>
          <p className="text-gray-600 text-lg mb-2">Agende sua reunião em poucos cliques</p>
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>Reuniões de 30 minutos</span>
          </div>
        </div>

        {step !== 'success' && step === 'calendar' && (
          <button
            onClick={handleBack}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-3 h-3 mr-1" />
            Voltar
          </button>
        )}

        {step === 'client-info' && (
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleClientInfoSubmit} className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Suas Informações</h2>

              <div className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Nome Completo *
                    </div>
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-opacity-10 outline-none transition-all"
                    placeholder="Seu nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Sexo *
                    </div>
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setClientGender('male')}
                      className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-lg border-2 transition-all ${
                        clientGender === 'male'
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span className="font-medium">Masculino</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientGender('female')}
                      className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-lg border-2 transition-all ${
                        clientGender === 'female'
                          ? 'border-pink-500 bg-pink-50 text-pink-900'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span className="font-medium">Feminino</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      E-mail *
                    </div>
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-opacity-10 outline-none transition-all"
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Telefone/WhatsApp *
                    </div>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-opacity-10 outline-none transition-all"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!clientName || !clientEmail || !clientPhone || !clientGender}
                className="w-full mt-6 px-6 py-3 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Continuar para Agendamento
              </button>
            </form>
          </div>
        )}

        {step === 'calendar' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2 text-center">
              Escolha Data e Horário
            </h2>
            <p className="text-gray-600 text-center mb-8">
              Selecione uma data disponível e depois escolha um horário
            </p>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                  1. Selecione uma Data
                </h3>
                <Calendar
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  isDayAvailable={isDayAvailable}
                />
                {selectedDate && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">
                      Data selecionada: {selectedDate.toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                  2. Selecione um Horário
                </h3>
                {!selectedDate ? (
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">
                      Escolha uma data primeiro
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Os horários disponíveis aparecerão aqui
                    </p>
                  </div>
                ) : isLoading ? (
                  <div className="flex flex-col justify-center items-center py-8">
                    <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-sm text-gray-600">Carregando horários...</p>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="bg-amber-50 rounded-lg border border-amber-200 p-6 text-center">
                    <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                    <p className="text-amber-800 font-medium mb-1">Sem horários disponíveis</p>
                    <p className="text-sm text-amber-700">
                      Não há atendentes disponíveis para esta data. Por favor, escolha outra data.
                    </p>
                  </div>
                ) : (
                  <TimeSlotPicker
                    slots={availableSlots}
                    selectedTime={selectedTime}
                    onTimeSelect={handleTimeSelect}
                    date={selectedDate}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {isCreatingMeet && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
              <div className="w-16 h-16 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Criando sua reunião...</h3>
              <p className="text-gray-600 text-sm">Gerando o link do Google Meet e confirmando o agendamento</p>
            </div>
          </div>
        )}

        {step === 'success' && bookingData && selectedDate && selectedTime && (
          <BookingSuccess
            meetingType={standardMeetingType}
            date={selectedDate}
            time={selectedTime}
            clientName={bookingData.name}
            meetLink={bookingData.meetLink}
            onNewBooking={handleNewBooking}
          />
        )}
      </div>
    </div>
  );
}
