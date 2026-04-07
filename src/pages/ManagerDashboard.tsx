import { useState, useEffect } from 'react';
import { Users, Settings, LogOut, LayoutDashboard, UserCog, Clock, Calendar } from 'lucide-react';
import { UserProfile } from '../types';
import { userProfileApi } from '../lib/userApi';
import AttendantsManagement from '../components/manager/AttendantsManagement';
import ManagerStats from '../components/manager/ManagerStats';
import AvailabilityConfiguration from '../components/manager/AvailabilityConfiguration';
import BookingsCalendar from '../components/manager/BookingsCalendar';

interface ManagerDashboardProps {
  onLogout: () => void;
}

type ManagerView = 'dashboard' | 'attendants' | 'availability' | 'calendar' | 'all-users';

export default function ManagerDashboard({ onLogout }: ManagerDashboardProps) {
  const [currentView, setCurrentView] = useState<ManagerView>('dashboard');
  const [attendants, setAttendants] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [user, attendantsList, usersList] = await Promise.all([
        userProfileApi.getCurrentUser(),
        userProfileApi.getAttendants(),
        userProfileApi.getAll()
      ]);

      setCurrentUser(user);
      setAttendants(attendantsList);
      setAllUsers(usersList);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAttendant = async (userId: string, updates: Partial<UserProfile>) => {
    try {
      if (updates.dailyLimit !== undefined) {
        await userProfileApi.updateDailyLimit(userId, updates.dailyLimit);
      }
      if (updates.isActive !== undefined) {
        await userProfileApi.toggleActive(userId, updates.isActive);
      }
      if (updates.gender !== undefined) {
        await userProfileApi.updateGender(userId, updates.gender);
      }
      await loadData();
    } catch (err) {
      console.error('Error updating attendant:', err);
      alert('Erro ao atualizar atendente. Por favor, tente novamente.');
    }
  };

  const handleCreateAttendant = async (email: string, password: string, fullName: string) => {
    await userProfileApi.createAttendant(email, password, fullName);
    // Recarrega a lista para mostrar o novo atendente imediatamente
    await loadData();
    // Mostra alerta de sucesso com as credenciais
    alert(`Atendente criado com sucesso!\n\nEmail: ${email}\nSenha: ${password}\n\nGuarde estas credenciais para fornecer ao atendente.`);
  };

  const navigation = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'calendar' as const, label: 'Calendário', icon: Calendar },
    { id: 'attendants' as const, label: 'Atendentes', icon: Users },
    { id: 'availability' as const, label: 'Disponibilidade', icon: Clock },
    { id: 'all-users' as const, label: 'Todos os Usuários', icon: Settings }
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
                <UserCog className="w-6 h-6 text-gray-900" />
                <h1 className="text-xl font-bold text-gray-900">Manager Admin</h1>
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
                <p className="text-xs text-gray-500">Manager Admin</p>
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
        {currentView === 'dashboard' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Visão Geral do Sistema</h2>
            <ManagerStats attendants={attendants} />
          </div>
        )}

        {currentView === 'calendar' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Calendário de Reuniões</h2>
            <BookingsCalendar />
          </div>
        )}

        {currentView === 'attendants' && (
          <AttendantsManagement
            attendants={attendants}
            onUpdateAttendant={handleUpdateAttendant}
            onCreateAttendant={handleCreateAttendant}
          />
        )}

        {currentView === 'availability' && (
          <AvailabilityConfiguration />
        )}

        {currentView === 'all-users' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Todos os Usuários do Sistema</h2>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-600 mb-1">Total de Usuários</p>
                <p className="text-3xl font-bold text-gray-900">{allUsers.length}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-600 mb-1">Atendentes</p>
                <p className="text-3xl font-bold text-blue-600">
                  {allUsers.filter(u => u.role === 'attendant').length}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-600 mb-1">Managers</p>
                <p className="text-3xl font-bold text-green-600">
                  {allUsers.filter(u => u.role === 'manager').length}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Nome
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        E-mail
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Senha
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Função
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Limite Diário
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Google
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Criado em
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {allUsers.map((user) => {
                      const roleColors = {
                        admin: 'bg-orange-100 text-orange-800',
                        manager: 'bg-purple-100 text-purple-800',
                        attendant: 'bg-blue-100 text-blue-800'
                      };

                      const roleLabels = {
                        admin: 'Admin',
                        manager: 'Manager',
                        attendant: 'Atendente'
                      };

                      return (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{user.fullName}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {user.temporaryPassword ? (
                              <code className="px-2 py-1 bg-gray-900 text-white rounded font-mono text-xs">
                                {user.temporaryPassword}
                              </code>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${roleColors[user.role]}`}>
                              {roleLabels[user.role]}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {user.isActive ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Ativo
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Inativo
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {user.role === 'attendant' ? (
                              <span className="text-sm font-medium text-gray-900">
                                {user.dailyLimit || 0}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {user.googleConnected ? (
                              <div className="flex flex-col items-center">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Conectado
                                </span>
                                {user.googleEmail && (
                                  <span className="text-xs text-gray-500 mt-1">{user.googleEmail}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(user.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
