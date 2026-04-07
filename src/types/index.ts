export interface MeetingType {
  id: string;
  title: string;
  duration: number;
  description: string;
  color: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface Booking {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientGender?: 'male' | 'female';
  meetingTypeId: string;
  meetingType: string;
  date: string;
  time: string;
  reason: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  meetLink?: string;
  createdAt: string;
  assignedTo?: string;
  assignmentDate?: string;
  attendantName?: string;
}

export interface WorkingHours {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  enabled: boolean;
}

export interface BlockedTime {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'manager' | 'attendant';
  isActive: boolean;
  dailyLimit?: number;
  googleConnected: boolean;
  googleEmail?: string;
  gender?: 'male' | 'female';
  temporaryPassword?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilitySettings {
  id: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  slotDuration: number;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettings {
  id: string;
  settingKey: string;
  settingValue: string;
  updatedBy?: string;
  updatedAt: string;
}
