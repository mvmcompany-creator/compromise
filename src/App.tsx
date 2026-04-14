import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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

type TeamView = 'login' | 'signup';

function TeamPortal({
  onLogin,
  onSignup,
  isLoading,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (email: string, password: string, fullName: string, role: 'manager') => Promise<void>;
  isLoading: boolean;
}) {
  const [view, setView] = useState<TeamView>('login');

  return (
    <>
      {view === 'login' && (
        <LoginForm onLogin={onLogin} onSwitchToSignup={() => setView('signup')} />
      )}
      {view === 'signup' && (
        <SignupForm onSignup={onSignup} onBackToLogin={() => setView('login')} />
      )}
    </>
  );
}

function PrivateRoute({
  currentUser,
  isLoading,
  children,
}: {
  currentUser: UserProfile | null;
  isLoading: boolean;
  children: React.ReactNode;
}) {
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
  if (!currentUser) {
    return <Navigate to="/acesso-equipe-arcs" replace />;
  }
  return <>{children}</>;
}

function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const isAuthCallback = window.location.pathname === '/auth/callback';

  useEffect(() => {
    if (isAuthCallback) {
      setIsLoading(false);
      return;
    }
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
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
            navigate('/dashboard');
          } catch (err) {
            console.error('Error saving Google tokens:', err);
          }
        }
      })();
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

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
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
          throw new Error('Acesso não autorizado.');
        }

        if (!profile.isActive) {
          await supabase.auth.signOut();
          throw new Error('Conta desativada. Entre em contato com o administrador.');
        }

        setCurrentUser(profile);
        navigate('/dashboard');
      }
    } catch (err: any) {
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
        body: JSON.stringify({ email, password, fullName }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar conta');
      }

      alert('Conta criada com sucesso! Faça login para continuar.');
    } catch (err: any) {
      alert(err.message || 'Erro ao criar conta. Por favor, tente novamente.');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      navigate('/acesso-equipe-arcs');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (isLoading && !isAuthCallback) {
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
    <Routes>
      <Route path="/" element={<PublicBooking />} />

      <Route
        path="/acesso-equipe-arcs"
        element={
          currentUser
            ? <Navigate to="/dashboard" replace />
            : <TeamPortal onLogin={handleLogin} onSignup={handleSignup} isLoading={isLoading} />
        }
      />

      <Route
        path="/dashboard"
        element={
          <PrivateRoute currentUser={currentUser} isLoading={false}>
            {currentUser?.role === 'manager' && <ManagerDashboard onLogout={handleLogout} />}
            {currentUser?.role === 'attendant' && <AttendantDashboard onLogout={handleLogout} />}
          </PrivateRoute>
        }
      />

      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
