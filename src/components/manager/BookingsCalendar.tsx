import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Mail, Phone, Clock, Video } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Booking, UserProfile } from '../../types';

interface BookingWithAttendant extends Booking {
  attendant: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  clientPhone?: string;
}

export default function BookingsCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<BookingWithAttendant[]>([]);
  const [attendants, setAttendants] = useState<UserProfile[]>([]);
  const [selectedAttendant, setSelectedAttendant] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithAttendant | null>(null);

  useEffect(() => {
    loadData();
  }, [currentDate, selectedAttendant]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const { data: attendantsData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'attendant')
        .order('full_name');

      if (attendantsData) {
        setAttendants(attendantsData.map(a => ({
          id: a.id,
          email: a.email,
          fullName: a.full_name,
          role: a.role,
          isActive: a.is_active,
          dailyLimit: a.daily_limit,
          googleConnected: a.google_connected || false,
          googleEmail: a.google_email,
          createdAt: a.created_at,
          updatedAt: a.updated_at
        })));
      }

      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const startStr = startOfMonth.toISOString().split('T')[0];
      const endStr = endOfMonth.toISOString().split('T')[0];

      let query = supabase
        .from('bookings')
        .select(`
          *,
          profiles:assigned_to (
            id,
            full_name,
            email
          )
        `)
        .gte('date', startStr)
        .lte('date', endStr)
        .eq('status', 'confirmed')
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (selectedAttendant !== 'all') {
        query = query.eq('assigned_to', selectedAttendant);
      }

      const { data: bookingsData } = await query;

      if (bookingsData) {
        setBookings(bookingsData.map(b => ({
          id: b.id,
          clientName: b.client_name,
          clientEmail: b.client_email,
          clientPhone: b.client_phone,
          meetingTypeId: b.meeting_type,
          meetingType: b.meeting_type,
          date: b.date,
          time: b.time,
          reason: b.reason || '',
          status: b.status,
          meetLink: b.meet_link,
          createdAt: b.created_at,
          assignedTo: b.assigned_to,
          assignmentDate: b.assignment_date,
          attendant: b.profiles ? {
            id: b.profiles.id,
            fullName: b.profiles.full_name,
            email: b.profiles.email
          } : null
        })));
      }
    } catch (err) {
      console.error('Error loading calendar data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getBookingsForDate = (date: Date | null) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter(b => b.date === dateStr);
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getAttendantColor = (attendantId: string) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-cyan-100 text-cyan-800 border-cyan-200',
    ];
    const index = attendants.findIndex(a => a.id === attendantId);
    return colors[index % colors.length];
  };

  const days = getDaysInMonth();
  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-gray-900 capitalize">{monthName}</h3>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filtrar por atendente:</label>
            <select
              value={selectedAttendant}
              onChange={(e) => setSelectedAttendant(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="all">Todos os Atendentes</option>
              {attendants.map(attendant => (
                <option key={attendant.id} value={attendant.id}>
                  {attendant.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="text-center font-semibold text-sm text-gray-700 py-2">
              {day}
            </div>
          ))}

          {days.map((date, index) => {
            const dayBookings = getBookingsForDate(date);
            const isToday = date && date.toDateString() === new Date().toDateString();

            return (
              <div
                key={index}
                className={`min-h-32 border border-gray-200 rounded-lg p-2 ${
                  !date ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                } ${isToday ? 'ring-2 ring-gray-900' : ''}`}
              >
                {date && (
                  <>
                    <div className={`text-sm font-semibold mb-2 ${isToday ? 'text-gray-900' : 'text-gray-600'}`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayBookings.map(booking => (
                        <button
                          key={booking.id}
                          onClick={() => setSelectedBooking(booking)}
                          className={`w-full text-left px-2 py-1 rounded text-xs border ${
                            booking.attendant ? getAttendantColor(booking.attendant.id) : 'bg-gray-100 text-gray-800'
                          } hover:opacity-80 transition-opacity`}
                        >
                          <div className="font-medium truncate">{booking.time}</div>
                          <div className="truncate">{booking.clientName}</div>
                          {booking.attendant && (
                            <div className="truncate text-xs opacity-75">{booking.attendant.fullName}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Legenda de Cores:</h4>
          <div className="flex flex-wrap gap-3">
            {attendants.map(attendant => (
              <div key={attendant.id} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border ${getAttendantColor(attendant.id)}`}></div>
                <span className="text-sm text-gray-600">{attendant.fullName}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Detalhes da Reunião</h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CalendarIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Data e Horário</p>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedBooking.date).toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })} às {selectedBooking.time}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Tipo de Reunião</p>
                  <p className="font-medium text-gray-900">{selectedBooking.meetingType}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Cliente</p>
                  <p className="font-medium text-gray-900">{selectedBooking.clientName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Email do Cliente</p>
                  <p className="font-medium text-gray-900">{selectedBooking.clientEmail}</p>
                </div>
              </div>

              {selectedBooking.clientPhone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Telefone do Cliente</p>
                    <p className="font-medium text-gray-900">{selectedBooking.clientPhone}</p>
                  </div>
                </div>
              )}

              {selectedBooking.attendant && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Atendente Designado</p>
                    <p className="font-medium text-gray-900">{selectedBooking.attendant.fullName}</p>
                    <p className="text-sm text-gray-500">{selectedBooking.attendant.email}</p>
                  </div>
                </div>
              )}

              {selectedBooking.reason && (
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Motivo</p>
                    <p className="font-medium text-gray-900">{selectedBooking.reason}</p>
                  </div>
                </div>
              )}

              {selectedBooking.meetLink && (
                <div className="flex items-start gap-3">
                  <Video className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Link da Reunião</p>
                    <a
                      href={selectedBooking.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:text-blue-800 break-all"
                    >
                      {selectedBooking.meetLink}
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => setSelectedBooking(null)}
                className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
