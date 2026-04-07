import { supabase } from './supabase';

export const googleAuthService = {
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/calendar.events',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }

    return data;
  },

  async saveGoogleTokens(accessToken: string, refreshToken: string | null, expiresAt: number) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('No user logged in');
    }

    const expiresAtDate = new Date(expiresAt * 1000).toISOString();

    const googleEmail = user.user_metadata?.email || user.email;

    const { error } = await supabase
      .from('profiles')
      .update({
        google_access_token: accessToken,
        google_refresh_token: refreshToken,
        google_token_expires_at: expiresAtDate,
        google_connected: true,
        google_email: googleEmail,
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error saving Google tokens:', error);
      throw error;
    }
  },

  async disconnectGoogle() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('No user logged in');
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        google_access_token: null,
        google_refresh_token: null,
        google_token_expires_at: null,
        google_connected: false,
        google_email: null,
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error disconnecting Google:', error);
      throw error;
    }
  },

  async getGoogleTokens(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('google_access_token, google_refresh_token, google_token_expires_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error getting Google tokens:', error);
      throw error;
    }

    return data;
  },
};
