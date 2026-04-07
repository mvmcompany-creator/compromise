import { Users, UserCheck, UserX, Calendar } from 'lucide-react';
import { UserProfile } from '../../types';

interface ManagerStatsProps {
  attendants: UserProfile[];
}

export default function ManagerStats({ attendants }: ManagerStatsProps) {
  const totalAttendants = attendants.length;
  const activeAttendants = attendants.filter(a => a.isActive).length;
  const inactiveAttendants = attendants.filter(a => !a.isActive).length;
  const connectedToGoogle = attendants.filter(a => a.googleConnected).length;
  const totalDailyCapacity = attendants
    .filter(a => a.isActive && a.googleConnected)
    .reduce((sum, a) => sum + (a.dailyLimit || 0), 0);

  const stats = [
    {
      title: 'Total de Atendentes',
      value: totalAttendants,
      icon: Users,
      iconColor: 'text-gray-600',
      iconBg: 'bg-gray-100'
    },
    {
      title: 'Atendentes Ativos',
      value: activeAttendants,
      icon: UserCheck,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100'
    },
    {
      title: 'Atendentes Inativos',
      value: inactiveAttendants,
      icon: UserX,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100'
    },
    {
      title: 'Conectados ao Google',
      value: connectedToGoogle,
      icon: Calendar,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100'
    }
  ];

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
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Capacidade do Sistema</h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Capacidade Diária Total</span>
              <span className="text-2xl font-bold text-blue-600">{totalDailyCapacity}</span>
            </div>
            <p className="text-sm text-gray-500">
              Número máximo de agendamentos que o sistema pode processar por dia
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Status dos Atendentes</h4>
            <div className="space-y-2">
              {attendants.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum atendente cadastrado ainda.</p>
              ) : (
                attendants.slice(0, 5).map((attendant) => (
                  <div key={attendant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        attendant.isActive && attendant.googleConnected
                          ? 'bg-green-500'
                          : attendant.isActive
                          ? 'bg-yellow-500'
                          : 'bg-gray-400'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{attendant.fullName}</p>
                        <p className="text-xs text-gray-500">
                          {attendant.googleConnected ? attendant.googleEmail : 'Google não conectado'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {attendant.dailyLimit || 0} / dia
                      </p>
                      <p className="text-xs text-gray-500">
                        {attendant.isActive ? 'Ativo' : 'Inativo'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
