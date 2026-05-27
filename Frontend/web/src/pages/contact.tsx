import Layout from '@/components/Layout';
import Head from 'next/head';
import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Mail } from 'lucide-react';
import { config } from '@/lib/config';
import { sendContactMessage } from '@/lib/api/contact';

export default function ContactPage() {
  const { t } = useTranslation('common');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const supportEmail = config.supportEmail;

  const [error, setError] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSuccess(false);
    setError(false);

    try {
      await sendContactMessage({
        name,
        email,
        subject,
        message,
        pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      });
      setSending(false);
      setSuccess(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch {
      setSending(false);
      setError(true);
    }
  };

  return (
    <Layout title={t('contact.pageTitle')}>
      <Head>
        <title>{t('contact.pageTitle')}</title>
      </Head>

      <div className="info-page">
        <div className="info-shell">
          <div className="info-hero">
            <span className="info-kicker">{t('footer.contactUs')}</span>
            <h1 className="info-title">{t('contact.title')}</h1>
            <p className="info-subtitle">{t('contact.subtitle')}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-[0.85fr_1.15fr] md:gap-8">
            <div className="space-y-4">
              <div className="info-card flex items-start gap-4">
                <div className="info-icon">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-950">{t('contact.info.email')}</h3>
                  <a
                    href={`mailto:${supportEmail}`}
                    className="mt-1 inline-block text-primary-700 hover:underline"
                  >
                    {supportEmail}
                  </a>
                </div>
              </div>
            </div>

            <div className="info-panel">
              <h2 className="mb-6 text-xl font-bold text-slate-950">
                {t('contact.form.title')}
              </h2>

              {success && (
                <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-medium text-emerald-700">
                  {t('contact.form.success')}
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 font-medium text-red-700">
                  {t('contact.form.error', 'Unable to send your message right now. Please try again.')}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label htmlFor="contact-name" className="mb-1 block text-sm font-semibold text-slate-700">
                    {t('contact.form.name')}
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('contact.form.namePlaceholder')}
                    required
                    className="input"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="contact-email" className="mb-1 block text-sm font-semibold text-slate-700">
                    {t('contact.form.email')}
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('contact.form.emailPlaceholder')}
                    required
                    className="input"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="contact-subject" className="mb-1 block text-sm font-semibold text-slate-700">
                    {t('contact.form.subject')}
                  </label>
                  <input
                    id="contact-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t('contact.form.subjectPlaceholder')}
                    required
                    className="input"
                  />
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="contact-message" className="mb-1 block text-sm font-semibold text-slate-700">
                    {t('contact.form.message')}
                  </label>
                  <textarea
                    id="contact-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('contact.form.messagePlaceholder')}
                    required
                    rows={5}
                    className="input resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="btn btn-primary w-full"
                >
                  {sending ? t('contact.form.submitting') : t('contact.form.submit')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getStaticProps({ locale }: { locale?: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'ar', ['common']))
    }
  };
}
