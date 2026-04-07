interface TimeSlotPickerProps {
  slots: string[];
  selectedTime: string | null;
  onTimeSelect: (time: string) => void;
  date: Date;
}

export default function TimeSlotPicker({ slots, selectedTime, onTimeSelect, date }: TimeSlotPickerProps) {
  console.log('TimeSlotPicker renderizado com:', { slotsCount: slots?.length, slots });

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  if (!slots || slots.length === 0) {
    console.warn('⚠️ TimeSlotPicker: Nenhum horário disponível para exibir');
    return (
      <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-8 text-center">
        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl">⚠️</span>
        </div>
        <p className="text-yellow-800 font-semibold mb-2">Nenhum horário disponível</p>
        <p className="text-sm text-yellow-700">
          Todas as vagas para este dia estão esgotadas.
        </p>
        <p className="text-sm text-yellow-600 mt-1">
          Por favor, escolha outra data disponível.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Horários disponíveis
      </h3>
      <p className="text-sm text-gray-600 mb-6 capitalize">
        {formatDate(date)}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-96 overflow-y-auto pr-2">
        {slots.map(time => (
          <button
            key={time}
            onClick={() => onTimeSelect(time)}
            className={`py-2 px-3 rounded text-xs font-medium transition-colors
              ${selectedTime === time
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-400'
              }
            `}
          >
            {time}
          </button>
        ))}
      </div>
    </div>
  );
}
