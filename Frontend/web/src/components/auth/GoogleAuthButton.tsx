import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { config } from '@/lib/config';

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleButtonText = 'continue_with' | 'signin_with' | 'signup_with';

type GoogleButtonOptions = {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  type?: 'standard' | 'icon';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  text?: GoogleButtonText;
  width?: number;
  locale?: string;
};

type GoogleAccountsId = {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}

interface GoogleAuthButtonProps {
  onToken: (idToken: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  text?: GoogleButtonText;
}

const SCRIPT_ID = 'google-identity-services';
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

export default function GoogleAuthButton({
  onToken,
  onError,
  disabled = false,
  text = 'continue_with',
}: GoogleAuthButtonProps) {
  const { t, i18n } = useTranslation('common');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const clientId = config.googleWebClientId;

  useEffect(() => {
    if (!clientId) return;

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (window.google?.accounts?.id) {
      setReady(true);
      return;
    }

    const script = existing ?? document.createElement('script');
    if (!existing) {
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const handleLoad = () => setReady(true);
    const handleError = () => onError(t('auth.google.loadError'));

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);

    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };
  }, [clientId, onError, t]);

  useEffect(() => {
    const container = containerRef.current;
    const googleId = window.google?.accounts?.id;
    if (!container || !ready || !clientId || !googleId) return;

    container.innerHTML = '';
    googleId.initialize({
      client_id: clientId,
      cancel_on_tap_outside: true,
      callback: response => {
        if (response.credential) {
          onToken(response.credential);
          return;
        }
        onError(t('auth.google.missingToken'));
      },
    });
    googleId.renderButton(container, {
      theme: 'outline',
      size: 'large',
      type: 'standard',
      shape: 'pill',
      text,
      width: Math.max(220, Math.min(360, container.parentElement?.clientWidth || container.clientWidth || 280)),
      locale: i18n.language?.startsWith('ar') ? 'ar' : 'en',
    });
  }, [clientId, i18n.language, onError, onToken, ready, t, text]);

  if (!clientId) {
    return (
      <button type="button" className="btn btn-outline w-full cursor-not-allowed opacity-60" disabled>
        {t('auth.google.unavailable')}
      </button>
    );
  }

  return (
    <div className={disabled ? 'pointer-events-none opacity-60' : undefined} aria-disabled={disabled}>
      <div ref={containerRef} className="flex min-h-[44px] w-full justify-center overflow-hidden" />
      {!ready && (
        <div className="mt-2 text-center text-xs font-medium text-slate-500">
          {t('auth.google.loading')}
        </div>
      )}
    </div>
  );
}
