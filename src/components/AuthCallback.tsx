import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { googleAuthService } from '../lib/googleAuth';

export default function AuthCallback() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const hash = window.location.hash;
        const hasTokenInHash = hash && (hash.includes('access_token') || hash.includes('code='));

        let session = null;

        if (hasTokenInHash) {
          await new Promise<void>((resolve) => {
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
              if (event === 'SIGNED_IN' && s) {
                session = s;
                subscription.unsubscribe();
                resolve();
              }
            });

            setTimeout(() => {
              subscription.unsubscribe();
              resolve();
            }, 5000);
          });
        }

        if (!session) {
          const { data } = await supabase.auth.getSession();
          session = data.session;
        }

        if (session?.provider_token) {
          const expiresAt = session.expires_at || Math.floor(Date.now() / 1000) + 3600;

          await googleAuthService.saveGoogleTokens(
            session.provider_token,
            session.provider_refresh_token || null,
            expiresAt
          );

          setStatus('success');

          setTimeout(() => {
            window.location.href = `${window.location.origin}/dashboard`;
          }, 1500);
        } else if (session && !session.provider_token) {
          setStatus('error');
          setErrorMessage('Sessao estabelecida, mas nenhum token do Google foi recebido. Verifique as permissoes e tente novamente.');
        } else {
          setStatus('error');
          setErrorMessage('Nenhuma sessao encontrada. O login pode ter expirado. Tente novamente.');
        }
      } catch (err: any) {
        console.error('Error in auth callback:', err);
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
