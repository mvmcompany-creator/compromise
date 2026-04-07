import { MeetingType, Booking, WorkingHours, BlockedTime } from '../types';

export const mockMeetingTypes: MeetingType[] = [
  {
    id: '1',
    title: 'Bate-papo de 30 min',
    duration: 30,
    description: 'Uma conversa rápida para discutir suas ideias e necessidades',
    color: 'bg-blue-500'
  },
  {
    id: '2',
    title: 'Consultoria de 1 hora',
    duration: 60,
    description: 'Sessão completa de consultoria para projetos e estratégias',
    color: 'bg-green-500'
  },
  {
    id: '3',
    title: 'Reunião de Planejamento - 45 min',
    duration: 45,
    description: 'Planejamento detalhado de projeto e definição de escopo',
    color: 'bg-purple-500'
  }
];

export const mockBookings: Booking[] = [
  {
    id: '1',
    clientName: 'João Silva',
    clientEmail: 'joao@email.com',
    meetingTypeId: 'standard',
    meetingType: 'Reunião de 30 minutos',
    date: '2026-03-18',
    time: '10:00',
    reason: 'Discutir novo projeto de website',
    status: 'confirmed',
    meetLink: 'https://meet.google.com/abc-defg-hij',
    createdAt: '2026-03-15T10:30:00Z'
  },
  {
    id: '2',
    clientName: 'Maria Santos',
    clientEmail: 'maria@email.com',
    meetingTypeId: 'standard',
    meetingType: 'Reunião de 30 minutos',
    date: '2026-03-19',
    time: '14:00',
    reason: 'Consultoria sobre estratégia de marketing digital',
    status: 'confirmed',
    meetLink: 'https://meet.google.com/xyz-uvwx-yz',
    createdAt: '2026-03-14T15:20:00Z'
  },
  {
    id: '3',
    clientName: 'Pedro Costa',
    clientEmail: 'pedro@email.com',
    meetingTypeId: 'standard',
    meetingType: 'Reunião de 30 minutos',
    date: '2026-03-16',
    time: '15:00',
    reason: 'Planejamento de aplicativo mobile',
    status: 'confirmed',
    meetLink: 'https://meet.google.com/lmn-opqr-stu',
    createdAt: '2026-03-13T09:15:00Z'
  },
  {
    id: '4',
    clientName: 'Ana Oliveira',
    clientEmail: 'ana@email.com',
    meetingTypeId: 'standard',
    meetingType: 'Reunião de 30 minutos',
    date: '2026-03-17',
    time: '11:00',
    reason: 'Explorar oportunidades de parceria',
    status: 'confirmed',
    meetLink: 'https://meet.google.com/def-ghij-klm',
    createdAt: '2026-03-12T14:45:00Z'
  }
];

export const mockWorkingHours: WorkingHours[] = [
  { id: '1', dayOfWeek: 1, startTime: '09:00', endTime: '18:00', enabled: true },
  { id: '2', dayOfWeek: 2, startTime: '09:00', endTime: '18:00', enabled: true },
  { id: '3', dayOfWeek: 3, startTime: '09:00', endTime: '18:00', enabled: true },
  { id: '4', dayOfWeek: 4, startTime: '09:00', endTime: '18:00', enabled: true },
  { id: '5', dayOfWeek: 5, startTime: '09:00', endTime: '18:00', enabled: true },
  { id: '6', dayOfWeek: 6, startTime: '09:00', endTime: '18:00', enabled: false },
  { id: '7', dayOfWeek: 0, startTime: '09:00', endTime: '18:00', enabled: false }
];

export const mockBlockedTimes: BlockedTime[] = [
  {
    id: '1',
    date: '2026-03-18',
    startTime: '12:00',
    endTime: '13:00',
    reason: 'Horário de Almoço'
  },
  {
    id: '2',
    date: '2026-03-19',
    startTime: '12:00',
    endTime: '13:00',
    reason: 'Horário de Almoço'
  }
];

export const generateTimeSlots = (
  date: Date,
  duration: number,
  workingHours: WorkingHours[],
  blockedTimes: BlockedTime[],
  existingBookings: Booking[]
): string[] => {
  const dayOfWeek = date.getDay();
  const dateStr = date.toISOString().split('T')[0];

  const workingHour = workingHours.find(wh => wh.dayOfWeek === dayOfWeek && wh.enabled);

  if (!workingHour) return [];

  const slots: string[] = [];
  const [startHour, startMin] = workingHour.startTime.split(':').map(Number);
  const [endHour, endMin] = workingHour.endTime.split(':').map(Number);

  let currentHour = startHour;
  let currentMin = startMin;

  while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
    const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;

    const isBlocked = blockedTimes.some(bt =>
      bt.date === dateStr && timeStr >= bt.startTime && timeStr < bt.endTime
    );

    if (!isBlocked) {
      slots.push(timeStr);
    }

    currentMin += 30;
    if (currentMin >= 60) {
      currentMin = 0;
      currentHour++;
    }
  }

  return slots;
};
