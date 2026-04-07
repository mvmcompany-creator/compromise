import { supabase } from './supabase';
import type { AvailabilitySettings } from '../types';

export const availabilityApi = {
  async getSettings(): Promise<AvailabilitySettings | null> {
    const { data, error } = await supabase
      .from('availability_settings')
      .select('*')
      .maybeSingle();

    if (error) throw error;

    if (!data) return null;

    const formatTime = (time: string) => {
      return time.split(':').slice(0, 2).join(':');
    };

    return {
      id: data.id,
      daysOfWeek: data.days_of_week,
      startTime: formatTime(data.start_time),
      endTime: formatTime(data.end_time),
      slotDuration: data.slot_duration,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async updateSettings(settings: {
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
    slotDuration: number;
  }): Promise<void> {
    const { data: existing } = await supabase
      .from('availability_settings')
      .select('id')
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('availability_settings')
        .update({
          days_of_week: settings.daysOfWeek,
          start_time: settings.startTime,
          end_time: settings.endTime,
          slot_duration: settings.slotDuration,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('availability_settings')
        .insert({
          days_of_week: settings.daysOfWeek,
          start_time: settings.startTime,
          end_time: settings.endTime,
          slot_duration: settings.slotDuration,
        });

      if (error) throw error;
    }
  },

  generateTimeSlots(startTime: string, endTime: string, duration: number): string[] {
    const slots: string[] = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    while (currentMinutes < endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const minutes = currentMinutes % 60;
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      slots.push(timeString);
      currentMinutes += duration;
    }

    return slots;
  },
};
