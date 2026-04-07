import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { UserProfile, SystemSettings } from '../types';

export const userProfileApi = {
  async getCurrentUser(): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      role: data.role,
      isActive: data.is_active,
      dailyLimit: data.daily_limit,
      googleConnected: data.google_connected,
      googleEmail: data.google_email,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  async getAll(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      isActive: row.is_active,
      dailyLimit: row.daily_limit,
      googleConnected: row.google_connected,
      googleEmail: row.google_email,
      temporaryPassword: row.temporary_password,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  },

  async getAttendants(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'attendant')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error fetching attendants:', error);
      throw error;
    }

    console.log('Attendants fetched:', data?.length || 0);

    return (data || []).map(row => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      isActive: row.is_active,
      dailyLimit: row.daily_limit,
      googleConnected: row.google_connected,
      googleEmail: row.google_email,
      gender: row.gender,
      temporaryPassword: row.temporary_password,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  },

  async updateDailyLimit(userId: string, dailyLimit: number): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({
        daily_limit: dailyLimit,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
  },

  async toggleActive(userId: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
  },

  async updateGender(userId: string, gender: 'male' | 'female'): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({
        gender: gender,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
  },

  async updateGoogleConnection(googleEmail: string, refreshToken: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update({
        google_connected: true,
        google_email: googleEmail,
        google_refresh_token: refreshToken,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) throw error;
  },

  async disconnectGoogle(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update({
        google_connected: false,
        google_email: null,
        google_refresh_token: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) throw error;
  },

  async getAttendantStats(userId: string, date: string): Promise<{
    totalToday: number;
    dailyLimit: number;
    remaining: number;
  }> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('daily_limit')
      .eq('id', userId)
      .maybeSingle();

    const dailyLimit = profile?.daily_limit || 0;

    const { count } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .eq('assignment_date', date)
      .eq('status', 'confirmed');

    const totalToday = count || 0;

    return {
      totalToday,
      dailyLimit,
      remaining: Math.max(0, dailyLimit - totalToday)
    };
  },

  async createAttendant(email: string, password: string, fullName: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Você precisa estar autenticado para criar atendentes.');
      }

      // Cria um cliente Supabase temporário que NÃO salva a sessão.
      // Isso evita que o Manager seja deslogado quando criar a conta do Atendente.
      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

      // Cria o atendente diretamente no Auth do Supabase local do Bolt
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'attendant',
          },
        },
      });

      if (authError) {
        // Se o erro for de usuário já existente
        if (authError.message.toLowerCase().includes('already registered') || authError.status === 422) {
          throw new Error('Este email já está cadastrado no sistema.');
        }
        throw new Error(authError.message || 'Erro ao criar credenciais do atendente.');
      }

      if (!authData.user) {
        throw new Error('Erro ao criar atendente: Usuário não retornado.');
      }

      // Força a atualização da tabela profiles para garantir que ele apareça na lista
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'attendant',
          is_active: true,
          daily_limit: 5, // Valor padrão para novos atendentes
          full_name: fullName,
          temporary_password: password,
          updated_at: new Date().toISOString()
        })
        .eq('id', authData.user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
      }

      // Pequeno delay para dar tempo ao banco de dados do Bolt de processar
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error: any) {
      console.error('Error creating attendant:', error);
      throw error;
    }
  }
};

export const systemSettingsApi = {
  async getSetting(key: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', key)
      .maybeSingle();

    if (error) throw error;
    return data?.setting_value || null;
  },

  async setSetting(key: string, value: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('system_settings')
      .upsert({
        setting_key: key,
        setting_value: value,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  },

  async getAll(): Promise<SystemSettings[]> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('setting_key', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      settingKey: row.setting_key,
      settingValue: row.setting_value,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at
    }));
  }
};

export const distributionApi = {
  async assignBookingToAttendant(bookingId: string, bookingDate: string): Promise<string | null> {
    const { data, error } = await supabase.rpc('assign_booking_to_attendant', {
      booking_id: bookingId,
      booking_date: bookingDate
    });

    if (error) throw error;
    return data;
  },

  async getAvailableAttendantsCount(date: string): Promise<number> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, daily_limit')
      .eq('role', 'attendant')
      .eq('is_active', true)
      .gt('daily_limit', 0);

    if (error) throw error;
    if (!data || data.length === 0) return 0;

    let availableCount = 0;

    for (const attendant of data) {
      const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', attendant.id)
        .eq('assignment_date', date)
        .eq('status', 'confirmed');

      const totalToday = count || 0;
      if (totalToday < (attendant.daily_limit || 0)) {
        availableCount++;
      }
    }

    return availableCount;
  }
};