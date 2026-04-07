import { Calendar, Clock, User, Mail, ExternalLink } from 'lucide-react';
import { Booking } from '../../types';

interface AttendantBookingsListProps {
  bookings: Booking[];
}

export default function AttendantBookingsList({ bookings }: AttendantBookingsListProps) {
  const today = new Date().toISOString().split('T')[0];
  const upcomingBookings = bookings
    .filter(b => b.date >= today && b.status === 'confirmed')
    .sort((a, b) => {
      if (a.date === b.date) {
        return a.time.localeCompare(b.time);
      }
      return a.date.localeCompare(b.date);
    });

  const pastBookings = bookings
    .filter(b => b.date < today || b.status !== 'confirmed')
    .sort((a, b) => {
      if (a.date === b.date) {
        return b.time.localeCompare(a.time);
      }
      return b.date.localeCompare(a.date);
    });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg mb-1">{booking.clientName}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(booking.date)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{booking.time}</span>
            </div>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          booking.status === 'confirmed'
            ? 'bg-green-100 text-green-800'
            : booking.status === 'cancelled'
            ? 'bg-red-100 text-red-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {booking.status === 'confirmed' ? 'Confirmado' : booking.status === 'cancelled' ? 'Cancelado' : 'Completo'}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-start gap-2">
          <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
          <span className="text-sm text-gray-600">{booking.clientEmail}</span>
        </div>
        <div className="flex items-start gap-2">
          <User className="w-4 h-4 text-gray-400 mt-0.5" />
          <span className="text-sm text-gray-600">{booking.reason}</span>
        </div>
      </div>

      {booking.meetLink && booking.status === 'confirmed' && (
        <a
          href={booking.meetLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <ExternalLink className="w-4 h-4" />
          Entrar na Reunião
        </a>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Próximos Agendamentos ({upcomingBookings.length})
        </h3>
        {upcomingBookings.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Nenhum agendamento futuro</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {upcomingBookings.map(booking => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Histórico ({pastBookings.length})
        </h3>
        {pastBookings.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Nenhum agendamento no histórico</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {pastBookings.slice(0, 10).map(booking => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
