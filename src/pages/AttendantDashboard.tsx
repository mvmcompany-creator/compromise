import { useState, useEffect } from 'react';
import { Calendar, LogOut, Link as LinkIcon, User } from 'lucide-react';
import { UserProfile, Booking } from '../types';
import { userProfileApi } from '../lib/userApi';
import { bookingApi } from '../lib/api';
import AttendantStats from '../components/attendant/AttendantStats';
import AttendantBookingsList from '../components/attendant/AttendantBookingsList';
import GoogleConnectButton from '../components/attendant/GoogleConnectButton';
import { googleAuthService } from '../lib/googleAuth';

interface AttendantDashboardProps {
  onLogout: () => void;
}

type AttendantView = 'dashboard' | 'bookings' | 'settings';

export default function AttendantDashboard({ onLogout }: AttendantDashboardProps) {
  const [currentView, setCurrentView] = useState<AttendantView>('dashboard');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [user, bookings] = await Promise.all([
        userProfileApi.getCurrentUser(),
        bookingApi.getMyBookings()
      ]);

      setCurrentUser(user);
      setMyBookings(bookings);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      await googleAuthService.signInWithGoogle();
    } catch (err) {
      console.error('Error connecting to Google:', err);
      alert('Erro ao conectar com Google. Por favor, tente novamente.');
    }
  };

  const handleGoogleDisconnect = async () => {
    try {
      await googleAuthService.disconnectGoogle();
      await loadData();
    } catch (err) {
      console.error('Error disconnecting Google:', err);
      alert('Erro ao desconectar Google. Por favor, tente novamente.');
    }
  };

  const navigation = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: Calendar },
    { id: 'bookings' as const, label: 'Meus Agendamentos', icon: Calendar },
    { id: 'settings' as const, label: 'Configurações', icon: LinkIcon }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <User className="w-6 h-6 text-gray-900" />
                <h1 className="text-xl font-bold text-gray-900">Painel do Atendente</h1>
              </div>
              <div className="flex gap-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentView(item.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
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
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{currentUser?.fullName}</p>
                <p className="text-xs text-gray-500">Atendente</p>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {currentView === 'dashboard' && currentUser && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Meu Dashboard</h2>
            <AttendantStats
              user={currentUser}
              bookings={myBookings}
            />
          </div>
        )}

        {currentView === 'bookings' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Meus Agendamentos</h2>
            <AttendantBookingsList bookings={myBookings} />
          </div>
        )}

        {currentView === 'settings' && currentUser && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Configurações</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Integração com Google Meet</h3>
              <p className="text-gray-600 mb-4">
                Conecte sua conta do Google para que o sistema possa gerar links de reunião automaticamente usando sua conta.
              </p>

              <GoogleConnectButton
                isConnected={currentUser.googleConnected}
                googleEmail={currentUser.googleEmail}
                onConnect={handleGoogleConnect}
                onDisconnect={handleGoogleDisconnect}
              />

              {!currentUser.googleConnected && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Opcional:</strong> Conecte sua conta do Google para sincronizar agendamentos automaticamente com seu Google Calendar.
                  </p>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">Limite Diário</h4>
                <p className="text-gray-600">
                  Você pode atender até <strong>{currentUser.dailyLimit || 0}</strong> clientes por dia.
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Este limite é definido pelo Manager Admin.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
