import { useState, useEffect } from 'react';
import { Clock, Calendar, Save } from 'lucide-react';
import { availabilityApi } from '../../lib/availabilityApi';
import type { AvailabilitySettings } from '../../types';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
];

export default function AvailabilityConfiguration() {
  const [settings, setSettings] = useState<AvailabilitySettings | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [slotDuration, setSlotDuration] = useState(30);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await availabilityApi.getSettings();
      if (data) {
        setSettings(data);
        setSelectedDays(data.daysOfWeek);
        setStartTime(data.startTime);
        setEndTime(data.endTime);
        setSlotDuration(data.slotDuration);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleDayToggle = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSave = async () => {
    if (selectedDays.length === 0) {
      alert('Selecione pelo menos um dia da semana!');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await availabilityApi.updateSettings({
        daysOfWeek: selectedDays,
        startTime,
        endTime,
        slotDuration,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erro ao salvar configurações. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const previewSlots = availabilityApi.generateTimeSlots(startTime, endTime, slotDuration);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Configuração de Disponibilidade</h2>
        <p className="text-sm text-gray-600">
          Configure os dias e horários em que sua equipe estará disponível para atendimentos
        </p>
      </div>

      <div className="bg-white rounded-lg border-2 border-gray-900 p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-gray-700" />
            <label className="font-semibold text-gray-900">Dias da Semana Disponíveis</label>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => handleDayToggle(day.value)}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  selectedDays.includes(day.value)
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-gray-700" />
              <label className="font-semibold text-gray-900">Horário de Início</label>
            </div>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-gray-700" />
              <label className="font-semibold text-gray-900">Horário de Término</label>
            </div>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="font-semibold text-gray-900 mb-3 block">Duração de Cada Atendimento</label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setSlotDuration(30)}
              className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                slotDuration === 30
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              30 minutos
            </button>
            <button
              type="button"
              onClick={() => setSlotDuration(60)}
              className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                slotDuration === 60
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              60 minutos
            </button>
          </div>
        </div>

        {previewSlots.length > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Preview: {previewSlots.length} horários disponíveis por dia
            </p>
            <div className="flex flex-wrap gap-2">
              {previewSlots.slice(0, 10).map((slot) => (
                <span
                  key={slot}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                >
                  {slot}
                </span>
              ))}
              {previewSlots.length > 10 && (
                <span className="px-3 py-1 text-gray-500 text-sm">
                  +{previewSlots.length - 10} mais
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-5 h-5" />
            )}
            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </button>

          {saveSuccess && (
            <span className="text-green-600 font-medium">
              Configurações salvas com sucesso!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
