import { CheckCircle, Calendar, Clock, Video, X, AlertCircle, ExternalLink } from 'lucide-react';
import { MeetingType } from '../types';

interface BookingSuccessProps {
  meetingType: MeetingType;
  date: Date;
  time: string;
  clientName: string;
  meetLink: string;
  onNewBooking: () => void;
}

export default function BookingSuccess({
  meetingType,
  date,
  time,
  clientName,
  meetLink,
  onNewBooking
}: BookingSuccessProps) {

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <button
              onClick={onNewBooking}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Reunião Confirmada!
          </h2>
          <p className="text-gray-600 mb-6">
            Obrigado, {clientName}! Sua reunião foi agendada com sucesso.
          </p>

          <div className="bg-amber-50 border-l-4 border-amber-500 rounded p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 mb-3">
                  Ação obrigatória: preencha o Formulário de Aplicação do DSM antes da reunião.
                </p>
                <a
                  href="https://form.typeform.com/to/k7QUgwq9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Preencher formulário
                </a>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Detalhes da Reunião</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <Calendar className="w-5 h-5 mr-3 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-500">Data e Hora</p>
                  <p className="text-gray-900 font-medium capitalize">
                    {formatDate(date)} às {time}
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <Clock className="w-5 h-5 mr-3 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-500">Duração</p>
                  <p className="text-gray-900 font-medium">{meetingType.duration} minutos</p>
                </div>
              </div>
              <div className="flex items-start">
                <Video className="w-5 h-5 mr-3 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-2">Link do Google Meet</p>
                  <a
                    href={meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium break-all underline"
                  >
                    {meetLink}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onNewBooking}
            className="w-full px-6 py-3 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Agendar Nova Reunião
          </button>
        </div>
      </div>
    </div>
  );
}