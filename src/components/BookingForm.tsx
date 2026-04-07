import { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, Phone } from 'lucide-react';
import { MeetingType } from '../types';

interface BookingFormProps {
  meetingType: MeetingType;
  date: Date;
  time: string;
  onSubmit: (data: { name: string; email: string; phone: string }) => void;
  onBack: () => void;
}

export default function BookingForm({ meetingType, date, time, onSubmit, onBack }: BookingFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nameParam = params.get('name');
    const emailParam = params.get('email');
    const phoneParam = params.get('phone') || params.get('numero');

    if (nameParam) setName(nameParam);
    if (emailParam) setEmail(emailParam);
    if (phoneParam) setPhone(phoneParam);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, email, phone });
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalhes da Reunião</h3>
        <div className="space-y-3">
          <div className="flex items-center text-gray-700">
            <User className="w-5 h-5 mr-3 text-gray-400" />
            <span>{meetingType.title}</span>
          </div>
          <div className="flex items-center text-gray-700">
            <Clock className="w-5 h-5 mr-3 text-gray-400" />
            <span>{meetingType.duration} minutos</span>
          </div>
          <div className="flex items-center text-gray-700 capitalize">
            <Calendar className="w-5 h-5 mr-3 text-gray-400" />
            <span>{formatDate(date)} às {time}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Suas Informações</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Nome Completo *
            </label>
            <input
              type="text"
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-opacity-10 outline-none transition-all"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              E-mail *
            </label>
            <input
              type="email"
              id="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-opacity-10 outline-none transition-all"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Telefone/WhatsApp *
            </label>
            <input
              type="tel"
              id="phone"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-opacity-10 outline-none transition-all"
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 px-4 py-2 rounded text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Voltar
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 rounded text-sm bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            Confirmar
          </button>
        </div>
      </form>
    </div>
  );
}
