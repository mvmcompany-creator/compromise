import { useState, useEffect } from 'react';
import PublicBooking from './pages/PublicBooking';
import ManagerDashboard from './pages/ManagerDashboard';
import AttendantDashboard from './pages/AttendantDashboard';
import LoginForm from './components/admin/LoginForm';
import SignupForm from './components/admin/SignupForm';
import AuthCallback from './components/AuthCallback';
import { supabase } from './lib/supabase';
import { userProfileApi } from './lib/userApi';
import { UserProfile } from './types';
import { googleAuthService } from './lib/googleAuth';

type AppMode = 'public' | 'login' | 'signup' | 'dashboard';

function App() {
  const [mode, setMode] = useState<AppMode>('public');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthCallback = window.location.pathname === '/auth/callback';

  useEffect(() => {
    if (isAuthCallback) {
      return;
    }
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.provider_token) {
        const expiresAt = session.expires_at || Math.floor(Date.now() / 1000) + 3600;

        try {
          await googleAuthService.saveGoogleTokens(
            session.provider_token,
            session.provider_refresh_token || null,
            expiresAt
          );

          const profile = await userProfileApi.getCurrentUser();
          setCurrentUser(profile);
          setMode('dashboard');
        } catch (err) {
          console.error('Error saving Google tokens:', err);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const profile = await userProfileApi.getCurrentUser();
        setCurrentUser(profile);
        setMode('dashboard');
      }
    } catch (err) {
      console.error('Error checking auth:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Auth error:', error);
        throw new Error(error.message === 'Invalid login credentials'
          ? 'Email ou senha incorretos'
          : error.message);
      }

      if (data.user) {
        await new Promise(resolve => setTimeout(resolve, 300));

        const profile = await userProfileApi.getCurrentUser();

        if (!profile) {
          throw new Error('Perfil não encontrado. Por favor, contate o administrador.');
        }

        if (profile.role !== 'manager' && profile.role !== 'attendant') {
          await supabase.auth.signOut();
          throw new Error('Acesso não autorizado. Apenas managers e atendentes podem fazer login.');
        }

        if (!profile.isActive) {
          await supabase.auth.signOut();
          throw new Error('Conta desativada. Entre em contato com o administrador.');
        }

        setCurrentUser(profile);
        setMode('dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      alert(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (
    email: string,
    password: string,
    fullName: string,
    role: 'manager'
  ) => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/signup-manager`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar conta');
      }

      alert('Conta criada com sucesso! Faça login para continuar.');
      setMode('login');
    } catch (err: any) {
      console.error('Signup error:', err);
      alert(err.message || 'Erro ao criar conta. Por favor, tente novamente.');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setMode('public');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const switchToLogin = () => {
    setMode('login');
  };

  const switchToSignup = () => {
    setMode('signup');
  };

  const switchToPublic = () => {
    setMode('public');
  };

  if (isAuthCallback) {
    return <AuthCallback />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {mode === 'public' && (
        <>
          <PublicBooking />
          <button
            onClick={switchToLogin}
            className="fixed bottom-6 right-6 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-lg"
          >
            Login
          </button>
        </>
      )}

      {mode === 'login' && (
        <>
          <LoginForm onLogin={handleLogin} onSwitchToSignup={switchToSignup} />
          <button
            onClick={switchToPublic}
            className="fixed bottom-6 right-6 px-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-lg"
          >
            Voltar ao Site
          </button>
        </>
      )}

      {mode === 'signup' && (
        <>
          <SignupForm onSignup={handleSignup} onBackToLogin={switchToLogin} />
          <button
            onClick={switchToPublic}
            className="fixed bottom-6 right-6 px-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-lg"
          >
            Voltar ao Site
          </button>
        </>
      )}

      {mode === 'dashboard' && currentUser && (
        <>
          {currentUser.role === 'manager' && (
            <ManagerDashboard onLogout={handleLogout} />
          )}
          {currentUser.role === 'attendant' && (
            <AttendantDashboard onLogout={handleLogout} />
          )}
        </>
      )}
    </div>
  );
}

export default App;
