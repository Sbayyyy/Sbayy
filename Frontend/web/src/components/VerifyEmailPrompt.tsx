import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { useTranslation } from 'next-i18next';

import { requestEmailVerification } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';

interface VerifyEmailPromptProps {
  compact?: boolean;
  message?: string;
}

export default function VerifyEmailPrompt({ compact = false, message }: VerifyEmailPromptProps) {
  const { user } = useAuthStore();
  const [sending, setSending] = useState(false);
  const { t } = useTranslation('common');

  if (!user || user.verified) return null;

  const handleVerifyNow = async () => {
    setSending(true);
    try {
      await requestEmailVerification();
      toast.success(t('verifyEmail.emailSent'));
    } catch (error) {
      console.error('Unable to request verification email:', error);
      toast.error(t('verifyEmail.sendError'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={
        compact
          ? 'rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'
          : 'border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950'
      }
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <MailCheck className="mt-0.5 h-4 w-4 flex-none" />
          <span>{message ?? t('verifyEmail.defaultMessage')}</span>
        </div>
        <button
          type="button"
          onClick={handleVerifyNow}
          disabled={sending}
          className="btn btn-primary h-9 shrink-0 px-4 text-sm"
        >
          {sending ? t('verifyEmail.sending') : t('verifyEmail.verifyNow')}
        </button>
      </div>
    </div>
  );
}
