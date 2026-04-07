import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { UserProfile, Booking } from '../../types';
import { userProfileApi } from '../../lib/userApi';

interface AttendantStatsProps {
  user: UserProfile;
  bookings: Booking[];
}

export default function AttendantStats({ user, bookings }: AttendantStatsProps) {
  const [todayStats, setTodayStats] = useState({
    totalToday: 0,
    dailyLimit: 0,
    remaining: 0
  });

  useEffect(() => {
    loadTodayStats();
  }, [user.id]);

  const loadTodayStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    const stats = await userProfileApi.getAttendantStats(user.id, today);
    setTodayStats(stats);
  };

  const today = new Date().toISOString().split('T')[0];
  const upcomingBookings = bookings.filter(b => b.date >= today && b.status === 'confirmed');
  const completedBookings = bookings.filter(b => b.status === 'completed');

  const nextBooking = upcomingBookings
    .sort((a, b) => {
      if (a.date === b.date) {
        return a.time.localeCompare(b.time);
      }
      return a.date.localeCompare(b.date);
    })[0];

  const formatNextBooking = () => {
    if (!nextBooking) return 'Nenhuma';

    const date = new Date(nextBooking.date);
    const dateStr = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    }).format(date);

    return `${dateStr} às ${nextBooking.time}`;
  };

  const stats = [
    {
      title: 'Atendimentos Hoje',
      value: todayStats.totalToday,
      subtitle: `de ${todayStats.dailyLimit} possíveis`,
      icon: Calendar,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100'
    },
    {
      title: 'Vagas Restantes Hoje',
      value: todayStats.remaining,
      subtitle: 'disponíveis',
      icon: Clock,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100'
    },
    {
      title: 'Próximos Agendamentos',
      value: upcomingBookings.length,
      subtitle: formatNextBooking(),
      icon: TrendingUp,
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-100'
    },
    {
      title: 'Total Completados',
      value: completedBookings.length,
      subtitle: 'reuniões realizadas',
      icon: CheckCircle,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100'
    }
  ];

  const progressPercentage = todayStats.dailyLimit > 0
    ? (todayStats.totalToday / todayStats.dailyLimit) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">{stat.title}</h3>
                <div className={`p-2 rounded-lg ${stat.iconBg}`}>
                  <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.subtitle}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Progresso do Dia</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Atendimentos realizados</span>
            <span className="font-semibold text-gray-900">
              {todayStats.totalToday} / {todayStats.dailyLimit}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                progressPercentage >= 100
                  ? 'bg-green-600'
                  : progressPercentage >= 75
                  ? 'bg-blue-600'
                  : progressPercentage >= 50
                  ? 'bg-yellow-600'
                  : 'bg-gray-600'
              }`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {progressPercentage >= 100
              ? 'Limite diário atingido! Parabéns!'
              : `Faltam ${todayStats.remaining} agendamentos para atingir seu limite diário`}
          </p>
        </div>
      </div>

      {nextBooking && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Próxima Reunião</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">Cliente:</span>
              <span className="font-semibold text-blue-900">{nextBooking.clientName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">Data:</span>
              <span className="font-semibold text-blue-900">{formatNextBooking()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">Motivo:</span>
              <span className="font-semibold text-blue-900">{nextBooking.reason}</span>
            </div>
            {nextBooking.meetLink && (
              <div className="mt-4">
                <a
                  href={nextBooking.meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Entrar na Reunião
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
