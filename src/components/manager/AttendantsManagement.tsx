import { useState } from 'react';
import { UserCheck, UserX, CreditCard as Edit3, Save, X, UserPlus } from 'lucide-react';
import { UserProfile } from '../../types';

interface AttendantsManagementProps {
  attendants: UserProfile[];
  onUpdateAttendant: (userId: string, updates: Partial<UserProfile>) => void;
  onCreateAttendant: (email: string, password: string, fullName: string) => void;
}

interface EditingAttendant {
  id: string;
  fullName: string;
  email: string;
  dailyLimit: number;
  isActive: boolean;
  gender?: 'male' | 'female';
}

export default function AttendantsManagement({ attendants, onUpdateAttendant, onCreateAttendant }: AttendantsManagementProps) {
  const [editingAttendant, setEditingAttendant] = useState<EditingAttendant | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAttendant, setNewAttendant] = useState({ email: '', password: '', fullName: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleStartEdit = (attendant: UserProfile) => {
    setEditingAttendant({
      id: attendant.id,
      fullName: attendant.fullName,
      email: attendant.email,
      dailyLimit: attendant.dailyLimit || 0,
      isActive: attendant.isActive,
      gender: attendant.gender
    });
  };

  const handleSaveEdit = () => {
    if (!editingAttendant) return;

    onUpdateAttendant(editingAttendant.id, {
      dailyLimit: editingAttendant.dailyLimit,
      isActive: editingAttendant.isActive,
      gender: editingAttendant.gender
    });
    setEditingAttendant(null);
  };

  const handleCancelEdit = () => {
    setEditingAttendant(null);
  };

  const handleCreateAttendant = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newAttendant.password.length < 6) {
      setCreateError('A senha deve ter no mínimo 6 caracteres!');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      await onCreateAttendant(newAttendant.email, newAttendant.password, newAttendant.fullName);
      // Sucesso - limpa o formulário e fecha
      setNewAttendant({ email: '', password: '', fullName: '' });
      setShowCreateForm(false);
      setCreateError(null);
    } catch (error: any) {
      // Erro - mantém o formulário aberto e exibe a mensagem
      setCreateError(error.message || 'Erro ao criar atendente. Por favor, tente novamente.');
    } finally {
      setIsCreating(false);
    }
  };

  const totalActiveAttendants = attendants.filter(a => a.isActive).length;
  const totalConnectedToGoogle = attendants.filter(a => a.googleConnected).length;
  const totalDailyCapacity = attendants
    .filter(a => a.isActive)
    .reduce((sum, a) => sum + (a.dailyLimit || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Gerenciar Atendentes</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Criar Atendente
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-lg border-2 border-gray-900 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Criar Nova Conta de Atendente</h3>

          {createError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium">{createError}</p>
            </div>
          )}

          <form onSubmit={handleCreateAttendant} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={newAttendant.fullName}
                  onChange={(e) => setNewAttendant({ ...newAttendant, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Nome do atendente"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  value={newAttendant.email}
                  onChange={(e) => setNewAttendant({ ...newAttendant, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha de Acesso
              </label>
              <input
                type="text"
                required
                minLength={6}
                value={newAttendant.password}
                onChange={(e) => setNewAttendant({ ...newAttendant, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Mínimo 6 caracteres"
              />
              <p className="text-xs text-gray-500 mt-1">
                O atendente usará esta senha para fazer login no sistema
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isCreating}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreating && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                {isCreating ? 'Criando...' : 'Criar Conta'}
              </button>
              <button
                type="button"
                disabled={isCreating}
                onClick={() => {
                  setShowCreateForm(false);
                  setNewAttendant({ email: '', password: '', fullName: '' });
                  setCreateError(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Total de Atendentes</p>
          <p className="text-3xl font-bold text-gray-900">{attendants.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Ativos</p>
          <p className="text-3xl font-bold text-green-600">{totalActiveAttendants}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Capacidade Diária Total</p>
          <p className="text-3xl font-bold text-blue-600">{totalDailyCapacity}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Atendente
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  E-mail
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Sexo
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Senha
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Limite Diário
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Google Calendar
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {attendants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Nenhum atendente cadastrado ainda.
                  </td>
                </tr>
              ) : (
                attendants.map((attendant) => (
                  <tr key={attendant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{attendant.fullName}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {attendant.email}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {attendant.gender === 'male' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Masculino
                        </span>
                      ) : attendant.gender === 'female' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                          Feminino
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Não definido</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {attendant.temporaryPassword ? (
                        <div className="flex flex-col items-center gap-1">
                          <code className="px-3 py-1 bg-gray-900 text-white rounded font-mono text-sm">
                            {attendant.temporaryPassword}
                          </code>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-50 text-blue-700">
                        {attendant.dailyLimit || 0} calls/dia
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {attendant.googleConnected ? (
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Conectado
                          </span>
                          {attendant.googleEmail && (
                            <span className="text-xs text-gray-500 mt-1">{attendant.googleEmail}</span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Aguardando
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {attendant.isActive ? (
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
                      <button
                        onClick={() => handleStartEdit(attendant)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                      >
                        <Edit3 className="w-4 h-4" />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingAttendant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-gray-900 text-white px-6 py-4 rounded-t-xl">
              <h3 className="text-lg font-bold">Editar Configurações do Atendente</h3>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Nome do Atendente
                </label>
                <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="font-medium text-gray-900">{editingAttendant.fullName}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  E-mail
                </label>
                <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-700">{editingAttendant.email}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sexo do Atendente
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingAttendant({
                      ...editingAttendant,
                      gender: 'male'
                    })}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                      editingAttendant.gender === 'male'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Masculino
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingAttendant({
                      ...editingAttendant,
                      gender: 'female'
                    })}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                      editingAttendant.gender === 'female'
                        ? 'bg-pink-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Feminino
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  O sistema distribuirá clientes do mesmo sexo para este atendente
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quantidade de Calls/Clientes por Dia
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingAttendant({
                      ...editingAttendant,
                      dailyLimit: Math.max(0, editingAttendant.dailyLimit - 1)
                    })}
                    className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg font-bold text-gray-700 transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={editingAttendant.dailyLimit}
                    onChange={(e) => setEditingAttendant({
                      ...editingAttendant,
                      dailyLimit: Math.max(0, Math.min(50, parseInt(e.target.value) || 0))
                    })}
                    className="flex-1 px-4 py-3 text-center text-2xl font-bold border-2 border-gray-900 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setEditingAttendant({
                      ...editingAttendant,
                      dailyLimit: Math.min(50, editingAttendant.dailyLimit + 1)
                    })}
                    className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg font-bold text-gray-700 transition-colors"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Este é o limite máximo de agendamentos que este atendente receberá por dia
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status do Atendente
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingAttendant({
                      ...editingAttendant,
                      isActive: true
                    })}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                      editingAttendant.isActive
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <UserCheck className="w-5 h-5" />
                    Ativo
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingAttendant({
                      ...editingAttendant,
                      isActive: false
                    })}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                      !editingAttendant.isActive
                        ? 'bg-red-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <UserX className="w-5 h-5" />
                    Inativo
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Atendentes inativos não recebem novos agendamentos
                </p>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex gap-3">
              <button
                onClick={handleCancelEdit}
                className="flex-1 px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-lg"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Como funciona a distribuição</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Os agendamentos são distribuídos automaticamente entre atendentes ativos</li>
          <li>• <strong>Clientes masculinos são atendidos por atendentes masculinos</strong></li>
          <li>• <strong>Clientes femininas são atendidas por atendentes femininas</strong></li>
          <li>• Apenas atendentes com status "Ativo" e limite diário maior que 0 recebem agendamentos</li>
          <li>• Quando um atendente atinge o limite diário, ele é removido da distribuição daquele dia</li>
          <li>• Conectar o Google Calendar é opcional para sincronização automática</li>
        </ul>
      </div>
    </div>
  );
}
