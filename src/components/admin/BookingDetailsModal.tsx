import { X, Calendar, Clock, User, Mail, MessageSquare, Video, XCircle } from 'lucide-react';
import { Booking } from '../../types';

interface BookingDetailsModalProps {
  booking: Booking;
  onClose: () => void;
  onCancel: (bookingId: string) => void;
}

export default function BookingDetailsModal({ booking, onClose, onCancel }: BookingDetailsModalProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const handleCancel = () => {
    if (confirm(`Tem certeza que deseja cancelar a reunião com ${booking.clientName}?`)) {
      onCancel(booking.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Detalhes da Reunião</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            booking.status === 'confirmed'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {booking.status === 'confirmed' ? 'Confirmado' : 'Cancelado'}
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Cliente</p>
                <p className="text-lg font-semibold text-gray-900">{booking.clientName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">E-mail</p>
                <p className="text-gray-900">{booking.clientEmail}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Data</p>
                <p className="text-gray-900 capitalize">{formatDate(booking.date)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Horário e Duração</p>
                <p className="text-gray-900">{booking.time} - {booking.meetingType}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Motivo da Reunião</p>
                <p className="text-gray-900">{booking.reason}</p>
              </div>
            </div>

            {booking.meetLink && (
              <div className="flex items-start gap-3">
                <Video className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-2">Link do Google Meet</p>
                  <a
                    href={booking.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 break-all"
                  >
                    {booking.meetLink}
                  </a>
                </div>
              </div>
            )}
          </div>

          {booking.status === 'confirmed' && (
            <div className="pt-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <XCircle className="w-4 h-4" />
                Cancelar Reunião
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
