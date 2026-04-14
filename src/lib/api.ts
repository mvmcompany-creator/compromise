import { supabase } from './supabase';
import { Booking, WorkingHours, BlockedTime } from '../types';
import { availabilityApi } from './availabilityApi';

export interface CreateBookingData {
  clientName: string;
  clientEmail: string;
  date: string;
  time: string;
  reason: string;
  meetLink: string;
}

export const bookingApi = {
  async getAll(): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        attendant:profiles!assigned_to(full_name)
      `)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      clientName: row.client_name,
      clientEmail: row.client_email,
      meetingTypeId: 'standard',
      meetingType: row.meeting_type,
      date: row.date,
      time: row.time,
      reason: row.reason,
      status: row.status as 'confirmed' | 'cancelled',
      meetLink: row.meet_link,
      createdAt: row.created_at,
      assignedTo: row.assigned_to,
      assignmentDate: row.assignment_date,
      attendantName: row.attendant?.full_name
    }));
  },

  async create(data: CreateBookingData): Promise<Booking> {
    const { data: result, error } = await supabase
      .from('bookings')
      .insert({
        client_name: data.clientName,
        client_email: data.clientEmail,
        meeting_type: 'Reunião de 30 minutos',
        date: data.date,
        time: data.time,
        reason: data.reason,
        meet_link: data.meetLink,
        status: 'confirmed'
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!result) throw new Error('Failed to create booking');

    return {
      id: result.id,
      clientName: result.client_name,
      clientEmail: result.client_email,
      meetingTypeId: 'standard',
      meetingType: result.meeting_type,
      date: result.date,
      time: result.time,
      reason: result.reason,
      status: result.status,
      meetLink: result.meet_link,
      createdAt: result.created_at,
      assignedTo: result.assigned_to,
      assignmentDate: result.assignment_date
    };
  },

  async cancel(bookingId: string): Promise<void> {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    if (error) throw error;
  },

  async reschedule(bookingId: string, newDate: string, newTime: string, newMeetLink?: string): Promise<void> {
    const updates: Record<string, string> = { date: newDate, time: newTime };
    if (newMeetLink) updates.meet_link = newMeetLink;

    const { error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', bookingId);

    if (error) throw error;
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        attendant:profiles!assigned_to(full_name)
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('status', 'confirmed');

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      clientName: row.client_name,
      clientEmail: row.client_email,
      meetingTypeId: 'standard',
      meetingType: row.meeting_type,
      date: row.date,
      time: row.time,
      reason: row.reason,
      status: row.status,
      meetLink: row.meet_link,
      createdAt: row.created_at,
      assignedTo: row.assigned_to,
      assignmentDate: row.assignment_date,
      attendantName: row.attendant?.full_name
    }));
  },

  async getMyBookings(): Promise<Booking[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('assigned_to', user.id)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      clientName: row.client_name,
      clientEmail: row.client_email,
      meetingTypeId: 'standard',
      meetingType: row.meeting_type,
      date: row.date,
      time: row.time,
      reason: row.reason,
      status: row.status,
      meetLink: row.meet_link,
      createdAt: row.created_at,
      assignedTo: row.assigned_to,
      assignmentDate: row.assignment_date
    }));
  },

  async getAvailableSlots(date: Date): Promise<string[]> {
    const settings = await availabilityApi.getSettings();
    if (!settings) return [];

    const dayOfWeek = date.getDay();
    if (!settings.daysOfWeek.includes(dayOfWeek)) {
      return [];
    }

    const dateStr = date.toISOString().split('T')[0];
    const allSlots = availabilityApi.generateTimeSlots(
      settings.startTime,
      settings.endTime,
      settings.slotDuration
    );

    const { data: bookings } = await supabase
      .from('bookings')
      .select('time, assigned_to')
      .eq('date', dateStr)
      .eq('status', 'confirmed');

    const { data: attendants } = await supabase
      .from('profiles')
      .select('id, daily_limit, is_active')
      .eq('role', 'attendant')
      .eq('is_active', true);

    if (!attendants || attendants.length === 0) {
      return [];
    }

    const bookingsByAttendant = new Map<string, number>();
    (bookings || []).forEach(booking => {
      if (booking.assigned_to) {
        bookingsByAttendant.set(
          booking.assigned_to,
          (bookingsByAttendant.get(booking.assigned_to) || 0) + 1
        );
      }
    });

    const bookedTimes = new Set((bookings || []).map(b => b.time));

    const availableSlots = allSlots.filter(slot => {
      if (bookedTimes.has(slot)) {
        const hasAvailableAttendant = attendants.some(att => {
          const bookingCount = bookingsByAttendant.get(att.id) || 0;
          return bookingCount < (att.daily_limit || 5);
        });
        return hasAvailableAttendant;
      }
      return true;
    });

    return availableSlots;
  }
};

export const workingHoursApi = {
  async getAll(): Promise<WorkingHours[]> {
    const { data, error } = await supabase
      .from('working_hours')
      .select('*')
      .order('day_of_week', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      enabled: row.enabled
    }));
  },

  async update(id: string, updates: Partial<Omit<WorkingHours, 'id'>>): Promise<void> {
    const updateData: Record<string, unknown> = {};

    if (updates.dayOfWeek !== undefined) updateData.day_of_week = updates.dayOfWeek;
    if (updates.startTime !== undefined) updateData.start_time = updates.startTime;
    if (updates.endTime !== undefined) updateData.end_time = updates.endTime;
    if (updates.enabled !== undefined) updateData.enabled = updates.enabled;

    const { error } = await supabase
      .from('working_hours')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }
};

export const blockedTimesApi = {
  async getAll(): Promise<BlockedTime[]> {
    const { data, error } = await supabase
      .from('blocked_times')
      .select('*')
      .order('date', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      reason: row.reason
    }));
  },

  async create(data: Omit<BlockedTime, 'id'>): Promise<BlockedTime> {
    const { data: result, error } = await supabase
      .from('blocked_times')
      .insert({
        date: data.date,
        start_time: data.startTime,
        end_time: data.endTime,
        reason: data.reason
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!result) throw new Error('Failed to create blocked time');

    return {
      id: result.id,
      date: result.date,
      startTime: result.start_time,
      endTime: result.end_time,
      reason: result.reason
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('blocked_times')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
