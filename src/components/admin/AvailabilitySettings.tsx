import { useState } from 'react';
import { Clock, Plus, Trash2 } from 'lucide-react';
import { WorkingHours, BlockedTime } from '../../types';

interface AvailabilitySettingsProps {
  workingHours: WorkingHours[];
  blockedTimes: BlockedTime[];
  onUpdateWorkingHours: (hours: WorkingHours[]) => void;
  onAddBlockedTime: (blockedTime: Omit<BlockedTime, 'id'>) => void;
  onRemoveBlockedTime: (id: string) => void;
}

export default function AvailabilitySettings({
  workingHours,
  blockedTimes,
  onUpdateWorkingHours,
  onAddBlockedTime,
  onRemoveBlockedTime
}: AvailabilitySettingsProps) {
  const [newBlockDate, setNewBlockDate] = useState('');
  const [newBlockStart, setNewBlockStart] = useState('');
  const [newBlockEnd, setNewBlockEnd] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('');

  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  const handleToggleDay = (dayOfWeek: number) => {
    const updated = workingHours.map(wh =>
      wh.dayOfWeek === dayOfWeek ? { ...wh, enabled: !wh.enabled } : wh
    );
    onUpdateWorkingHours(updated);
  };

  const handleUpdateTime = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    const updated = workingHours.map(wh =>
      wh.dayOfWeek === dayOfWeek ? { ...wh, [field]: value } : wh
    );
    onUpdateWorkingHours(updated);
  };

  const handleAddBlock = (e: React.FormEvent) => {
    e.preventDefault();
    onAddBlockedTime({
      date: newBlockDate,
      startTime: newBlockStart,
      endTime: newBlockEnd,
      reason: newBlockReason
    });
    setNewBlockDate('');
    setNewBlockStart('');
    setNewBlockEnd('');
    setNewBlockReason('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Horário de Trabalho</h3>

        <div className="space-y-4">
          {workingHours.map((wh) => (
            <div key={wh.id} className="flex items-center gap-4">
              <label className="flex items-center min-w-[120px]">
                <input
                  type="checkbox"
                  checked={wh.enabled}
                  onChange={() => handleToggleDay(wh.dayOfWeek)}
                  className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  {dayNames[wh.dayOfWeek]}
                </span>
              </label>

              {wh.enabled && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <input
                      type="time"
                      value={wh.startTime}
                      onChange={(e) => handleUpdateTime(wh.dayOfWeek, 'startTime', e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-opacity-10 outline-none"
                    />
                  </div>
                  <span className="text-gray-500">até</span>
                  <input
                    type="time"
                    value={wh.endTime}
                    onChange={(e) => handleUpdateTime(wh.dayOfWeek, 'endTime', e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-opacity-10 outline-none"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Horários Bloqueados</h3>

        <form onSubmit={handleAddBlock} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <input
              type="date"
              value={newBlockDate}
              onChange={(e) => setNewBlockDate(e.target.value)}
              required
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-opacity-10 outline-none"
            />
            <input
              type="time"
              value={newBlockStart}
              onChange={(e) => setNewBlockStart(e.target.value)}
              required
              placeholder="Início"
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-opacity-10 outline-none"
            />
            <input
              type="time"
              value={newBlockEnd}
              onChange={(e) => setNewBlockEnd(e.target.value)}
              required
              placeholder="Fim"
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-opacity-10 outline-none"
            />
            <input
              type="text"
              value={newBlockReason}
              onChange={(e) => setNewBlockReason(e.target.value)}
              required
              placeholder="Motivo"
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-opacity-10 outline-none"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Adicionar Bloqueio
          </button>
        </form>

        {blockedTimes.length > 0 ? (
          <div className="space-y-2">
            {blockedTimes.map((bt) => (
              <div
                key={bt.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{bt.reason}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(bt.date).toLocaleDateString('pt-BR')} • {bt.startTime} - {bt.endTime}
                  </p>
                </div>
                <button
                  onClick={() => onRemoveBlockedTime(bt.id)}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            Nenhum horário bloqueado
          </p>
        )}
      </div>
    </div>
  );
}
