import { useState } from 'react';
import { MailCheck } from 'lucide-react';

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

  if (!user || user.verified) return null;

  const handleVerifyNow = async () => {
    setSending(true);
    try {
      await requestEmailVerification();
      toast.success('Verification email sent. Check your inbox.');
    } catch (error) {
      console.error('Unable to request verification email:', error);
      toast.error('Unable to send verification email right now.');
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
          <span>
            {message ??
              'Verify your email to list items, message sellers, and use marketplace actions.'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleVerifyNow}
          disabled={sending}
          className="btn btn-primary h-9 shrink-0 px-4 text-sm"
        >
          {sending ? 'Sending...' : 'Verify now'}
        </button>
      </div>
    </div>
  );
}
