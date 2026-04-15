import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { googleAuthService } from '../lib/googleAuth';

export default function AuthCallback() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('[AuthCallback] URL completa:', window.location.href);
        console.log('[AuthCallback] Hash:', window.location.hash);
        console.log('[AuthCallback] Search params:', window.location.search);

        await new Promise((resolve) => setTimeout(resolve, 1500));

        const verifyTokensSaved = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            setStatus('error');
            setErrorMessage('Sessao expirou apos salvar tokens. Tente novamente.');
            return;
          }
          const { data: profile } = await supabase
            .from('profiles')
            .select('google_connected')
            .eq('id', user.id)
            .maybeSingle();

          console.log('[AuthCallback] Verificacao de tokens salvos:', profile);

          if (profile?.google_connected) {
            setStatus('success');
            setTimeout(() => { window.location.href = `${window.location.origin}/dashboard`; }, 1500);
          } else {
            setStatus('error');
            setErrorMessage('Login realizado, mas os tokens do Google nao foram salvos no perfil. Verifique as permissoes e tente reconectar.');
          }
        };

        console.log('[AuthCallback] Verificando usuario diretamente no servidor...');
        const { data: userData, error: userError } = await supabase.auth.getUser();
        console.log('[AuthCallback] getUser resultado:', { userData, userError });

        if (userError || !userData.user) {
          console.log('[AuthCallback] getUser falhou, tentando getSession...');
          const { data: sessionData } = await supabase.auth.getSession();
          console.log('[AuthCallback] getSession resultado:', sessionData);

          if (!sessionData.session) {
            console.log('[AuthCallback] Sem sessao, tentando refreshSession...');
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            console.log('[AuthCallback] refreshSession resultado:', { refreshData, refreshError });

            if (refreshError || !refreshData.session) {
              setStatus('error');
              setErrorMessage('Nenhuma sessao encontrada. O login pode ter expirado. Tente novamente.');
              return;
            }

            const session = refreshData.session;
            if (session.provider_token) {
              const expiresAt = session.expires_at || Math.floor(Date.now() / 1000) + 3600;
              await googleAuthService.saveGoogleTokens(
                session.provider_token,
                session.provider_refresh_token || null,
                expiresAt
              );
              await verifyTokensSaved();
            } else {
              setStatus('error');
              setErrorMessage('Sessao estabelecida, mas nenhum token do Google foi recebido. Reconecte com o Google e certifique-se de aceitar todas as permissoes.');
            }
            return;
          }

          const session = sessionData.session;
          console.log('[AuthCallback] Sessao encontrada via getSession:', { hasProviderToken: !!session.provider_token });

          if (session.provider_token) {
            const expiresAt = session.expires_at || Math.floor(Date.now() / 1000) + 3600;
            await googleAuthService.saveGoogleTokens(
              session.provider_token,
              session.provider_refresh_token || null,
              expiresAt
            );
            await verifyTokensSaved();
          } else {
            setStatus('error');
            setErrorMessage('Sessao estabelecida, mas nenhum token do Google foi recebido. Reconecte com o Google e certifique-se de aceitar todas as permissoes.');
          }
          return;
        }

        console.log('[AuthCallback] Usuario autenticado:', userData.user.email);
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('[AuthCallback] Sessao apos getUser:', { hasProviderToken: !!sessionData.session?.provider_token });

        const session = sessionData.session;

        if (!session) {
          setStatus('error');
          setErrorMessage('Usuario autenticado, mas sessao nao encontrada. Tente novamente.');
          return;
        }

        if (session.provider_token) {
          const expiresAt = session.expires_at || Math.floor(Date.now() / 1000) + 3600;
          await googleAuthService.saveGoogleTokens(
            session.provider_token,
            session.provider_refresh_token || null,
            expiresAt
          );
          await verifyTokensSaved();
        } else {
          console.log('[AuthCallback] Sem provider_token, tentando refreshSession...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          console.log('[AuthCallback] refreshSession resultado:', { refreshData, refreshError });

          if (!refreshError && refreshData.session?.provider_token) {
            const s = refreshData.session;
            const expiresAt = s.expires_at || Math.floor(Date.now() / 1000) + 3600;
            await googleAuthService.saveGoogleTokens(
              s.provider_token!,
              s.provider_refresh_token || null,
              expiresAt
            );
            await verifyTokensSaved();
          } else {
            setStatus('error');
            setErrorMessage('Sessao estabelecida, mas nenhum token do Google foi recebido. Reconecte com o Google e certifique-se de aceitar todas as permissoes.');
          }
        }
      } catch (err: any) {
        console.error('[AuthCallback] Erro inesperado:', err);
        setStatus('error');
        setErrorMessage(err.message || 'Erro ao conectar com Google');
      }
    };

    handleAuthCallback();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        {status === 'processing' && (
          <>
            <div className="w-16 h-16 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Conectando com Google...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-600 font-medium">Google conectado com sucesso!</p>
            <p className="text-gray-500 text-sm mt-2">Redirecionando...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-600 font-medium">Erro ao conectar</p>
            <p className="text-gray-600 text-sm mt-2 max-w-xs">{errorMessage}</p>
            <div className="mt-4 flex flex-col gap-2 items-center">
              <button
                onClick={() => window.location.href = `${window.location.origin}/dashboard`}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
              >
                Voltar ao Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
