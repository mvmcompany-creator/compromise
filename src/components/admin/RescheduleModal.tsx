import { useState } from 'react';
import { X, Calendar, Clock, AlertCircle } from 'lucide-react';
import { Booking } from '../../types';
import { availabilityApi } from '../../lib/availabilityApi';
import { bookingApi } from '../../lib/api';
import { supabase } from '../../lib/supabase';

interface RescheduleModalProps {
  booking: Booking;
  onClose: () => void;
  onRescheduled: (bookingId: string, newDate: string, newTime: string, newMeetLink?: string) => void;
}

export default function RescheduleModal({ booking, onClose, onRescheduled }: RescheduleModalProps) {
  const [newDate, setNewDate] = useState(booking.date);
  const [newTime, setNewTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slotsLoaded, setSlotsLoaded] = useState(false);

  const handleDateChange = async (date: string) => {
    setNewDate(date);
    setNewTime('');
    setSlotsLoaded(false);
    setAvailableSlots([]);
    setError(null);
  };

  const handleLoadSlots = async () => {
    if (!newDate) return;
    setIsLoadingSlots(true);
    setError(null);
    try {
      const settings = await availabilityApi.getSettings();
      if (!settings) {
        setAvailableSlots([]);
        setSlotsLoaded(true);
        return;
      }

      const dateObj = new Date(newDate + 'T12:00:00');
      const dayOfWeek = dateObj.getDay();

      if (!settings.daysOfWeek.includes(dayOfWeek)) {
        setError('Esta data não está disponível para agendamento.');
        setSlotsLoaded(true);
        setIsLoadingSlots(false);
        return;
      }

      const { data: attendant } = await supabase
        .from('profiles')
        .select('id, daily_limit, google_connected')
        .eq('id', booking.assignedTo)
        .maybeSingle();

      if (!attendant || !attendant.google_connected) {
        setError('O atendente desta reunião não possui Google conectado. Não é possível remarcar.');
        setSlotsLoaded(true);
        setIsLoadingSlots(false);
        return;
      }

      const { count: existingBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', booking.assignedTo)
        .eq('date', newDate)
        .eq('status', 'confirmed')
        .neq('id', booking.id);

      const bookedCount = existingBookings || 0;
      if (bookedCount >= (attendant.daily_limit || 0)) {
        setError('O atendente já atingiu o limite de agendamentos nesta data.');
        setSlotsLoaded(true);
        setIsLoadingSlots(false);
        return;
      }

      const slots = availabilityApi.generateTimeSlots(
        settings.startTime,
        settings.endTime,
        settings.slotDuration
      );

      setAvailableSlots(slots);
      setSlotsLoaded(true);
    } catch (err) {
      console.error('Error loading slots:', err);
      setError('Erro ao carregar horários disponíveis.');
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleConfirm = async () => {
    if (!newDate || !newTime) return;
    setIsSubmitting(true);
    setError(null);

    try {
      let newMeetLink: string | undefined;

      if (booking.assignedTo) {
        const { data: attendant } = await supabase
          .from('profiles')
          .select('google_connected')
          .eq('id', booking.assignedTo)
          .maybeSingle();

        if (attendant?.google_connected) {
          const [hours, minutes] = newTime.split(':').map(Number);
          const startDateTime = new Date(newDate + 'T12:00:00');
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
              attendantId: booking.assignedTo,
              clientName: booking.clientName,
              clientEmail: booking.clientEmail,
              startTime: startDateTime.toISOString(),
              duration: 30,
              meetingType: 'Reunião de 30 minutos (Remarcada)',
            }),
          });

          const meetResult = await meetResponse.json();
          if (meetResult.success && meetResult.meetLink) {
            newMeetLink = meetResult.meetLink;
          }
        }
      }

      await bookingApi.reschedule(booking.id, newDate, newTime, newMeetLink);
      onRescheduled(booking.id, newDate, newTime, newMeetLink);
      onClose();
    } catch (err: any) {
      console.error('Error rescheduling booking:', err);
      setError('Erro ao remarcar o agendamento. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Remarcar Agendamento</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Agendamento atual</p>
            <p className="font-semibold text-gray-900">{booking.clientName}</p>
            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(booking.date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {booking.time}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nova Data
            </label>
            <input
              type="date"
              value={newDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-opacity-10 outline-none transition-all"
            />
          </div>

          {newDate && !slotsLoaded && (
            <button
              onClick={handleLoadSlots}
              disabled={isLoadingSlots}
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoadingSlots ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  Carregando horários...
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  Verificar horários disponíveis
                </>
              )}
            </button>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {slotsLoaded && availableSlots.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Novo Horário
              </label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setNewTime(slot)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                      newTime === slot
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          )}

          {slotsLoaded && availableSlots.length === 0 && !error && (
            <div className="text-center text-sm text-gray-500 py-2">
              Nenhum horário disponível para esta data.
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!newDate || !newTime || isSubmitting}
            className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Remarcando...
              </>
            ) : (
              'Confirmar Remarcação'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
