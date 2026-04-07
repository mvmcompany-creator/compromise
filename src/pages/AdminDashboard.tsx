import { useState, useMemo, useEffect } from 'react';
import { Calendar, CalendarClock, LogOut, Settings, LayoutDashboard, Link as LinkIcon } from 'lucide-react';
import { Booking, WorkingHours, BlockedTime } from '../types';
import { bookingApi, workingHoursApi, blockedTimesApi } from '../lib/api';
import StatCard from '../components/admin/StatCard';
import BookingsTable from '../components/admin/BookingsTable';
import AvailabilitySettings from '../components/admin/AvailabilitySettings';
import CalendarView from '../components/admin/CalendarView';
import BookingDetailsModal from '../components/admin/BookingDetailsModal';

interface AdminDashboardProps {
  onLogout: () => void;
}

type AdminView = 'dashboard' | 'bookings' | 'availability' | 'integrations';

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [bookingsData, workingHoursData, blockedTimesData] = await Promise.all([
        bookingApi.getAll(),
        workingHoursApi.getAll(),
        blockedTimesApi.getAll()
      ]);

      setBookings(bookingsData);
      setWorkingHours(workingHoursData);
      setBlockedTimes(blockedTimesData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = bookings.filter(b => b.date === today && b.status === 'confirmed').length;

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

    const weekBookings = bookings.filter(b => b.date >= startOfWeekStr && b.status === 'confirmed').length;

    const upcomingBookings = bookings
      .filter(b => b.status === 'confirmed' && b.date >= today)
      .sort((a, b) => {
        if (a.date === b.date) {
          return a.time.localeCompare(b.time);
        }
        return a.date.localeCompare(b.date);
      });

    const nextBooking = upcomingBookings[0];

    return { todayBookings, weekBookings, nextBooking };
  }, [bookings]);

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await bookingApi.cancel(bookingId);
      setBookings(prev =>
        prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' as const } : b)
      );
    } catch (err) {
      console.error('Error cancelling booking:', err);
      alert('Erro ao cancelar agendamento. Por favor, tente novamente.');
    }
  };

  const handleRescheduleBooking = (bookingId: string) => {
    alert('Funcionalidade de remarcação será implementada na integração completa');
  };

  const handleAddBlockedTime = async (blockedTime: Omit<BlockedTime, 'id'>) => {
    try {
      const newBlock = await blockedTimesApi.create(blockedTime);
      setBlockedTimes(prev => [...prev, newBlock]);
    } catch (err) {
      console.error('Error adding blocked time:', err);
      alert('Erro ao adicionar bloqueio. Por favor, tente novamente.');
    }
  };

  const handleRemoveBlockedTime = async (id: string) => {
    try {
      await blockedTimesApi.delete(id);
      setBlockedTimes(prev => prev.filter(bt => bt.id !== id));
    } catch (err) {
      console.error('Error removing blocked time:', err);
      alert('Erro ao remover bloqueio. Por favor, tente novamente.');
    }
  };

  const handleUpdateWorkingHours = async (updatedHours: WorkingHours[]) => {
    try {
      const updates = updatedHours.map(hour =>
        workingHoursApi.update(hour.id, {
          dayOfWeek: hour.dayOfWeek,
          startTime: hour.startTime,
          endTime: hour.endTime,
          enabled: hour.enabled
        })
      );
      await Promise.all(updates);
      setWorkingHours(updatedHours);
    } catch (err) {
      console.error('Error updating working hours:', err);
      alert('Erro ao atualizar horários. Por favor, tente novamente.');
    }
  };

  const formatNextBooking = () => {
    if (!stats.nextBooking) return 'Nenhuma';

    const date = new Date(stats.nextBooking.date);
    const dateStr = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    }).format(date);

    return `${dateStr} às ${stats.nextBooking.time}`;
  };

  const navigation = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'bookings' as const, label: 'Agendamentos', icon: Calendar },
    { id: 'availability' as const, label: 'Disponibilidade', icon: CalendarClock },
    { id: 'integrations' as const, label: 'Integrações', icon: LinkIcon }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold text-gray-900">Compromise Admin</h1>
              <div className="flex gap-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentView(item.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        currentView === item.id
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando...</p>
            </div>
          </div>
        ) : currentView === 'dashboard' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Visão Geral</h2>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <StatCard
                title="Reuniões Hoje"
                value={stats.todayBookings}
                icon={Calendar}
                iconColor="text-blue-600"
                iconBg="bg-blue-100"
              />
              <StatCard
                title="Total da Semana"
                value={stats.weekBookings}
                icon={CalendarClock}
                iconColor="text-green-600"
                iconBg="bg-green-100"
              />
              <StatCard
                title="Próxima Reunião"
                value={formatNextBooking()}
                icon={Calendar}
                iconColor="text-purple-600"
                iconBg="bg-purple-100"
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Próximos Agendamentos</h3>
              <BookingsTable
                bookings={bookings
                  .filter(b => b.status === 'confirmed' && b.date >= new Date().toISOString().split('T')[0])
                  .slice(0, 5)}
                onCancel={handleCancelBooking}
                onReschedule={handleRescheduleBooking}
              />
            </div>
          </div>
        )}

        {!isLoading && currentView === 'bookings' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Todos os Agendamentos</h2>

            <div className="mb-6">
              <CalendarView
                bookings={bookings}
                onBookingClick={setSelectedBooking}
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Lista Completa</h3>
              <BookingsTable
                bookings={bookings}
                onCancel={handleCancelBooking}
                onReschedule={handleRescheduleBooking}
              />
            </div>
          </div>
        )}

        {!isLoading && currentView === 'availability' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Gestão de Disponibilidade</h2>
            <AvailabilitySettings
              workingHours={workingHours}
              blockedTimes={blockedTimes}
              onUpdateWorkingHours={handleUpdateWorkingHours}
              onAddBlockedTime={handleAddBlockedTime}
              onRemoveBlockedTime={handleRemoveBlockedTime}
            />
          </div>
        )}

        {!isLoading && currentView === 'integrations' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Integrações</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <div className="max-w-2xl">
                <div className="flex items-start gap-4 mb-6">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <LinkIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Google Calendar
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Conecte sua conta do Google para sincronizar automaticamente os agendamentos
                      e gerar links do Google Meet para todas as reuniões.
                    </p>
                    <button className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">
                      Conectar Google Calendar
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mt-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Recursos da Integração:</h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Sincronização automática de agendamentos</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Geração automática de links do Google Meet</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Verificação de conflitos de horário em tempo real</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Envio automático de convites por e-mail</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onCancel={handleCancelBooking}
        />
      )}
    </div>
  );
}
