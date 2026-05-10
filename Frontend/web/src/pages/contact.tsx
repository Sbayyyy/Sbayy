import Layout from '@/components/Layout';
import Head from 'next/head';
import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Mail } from 'lucide-react';
import { config } from '@/lib/config';

export default function ContactPage() {
  const { t } = useTranslation('common');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const supportEmail = config.supportEmail;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    // Simulated submission - no backend call
    setTimeout(() => {
      setSending(false);
      setSuccess(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    }, 600);
  };

  return (
    <Layout title={t('contact.pageTitle')}>
      <Head>
        <title>{t('contact.pageTitle')}</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{t('contact.title')}</h1>
            <p className="mt-2 text-gray-600">{t('contact.subtitle')}</p>
          </div>

          {/* Two-column layout */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column - Contact Info */}
            <div className="space-y-4">
              {/* Email Card */}
              <div className="bg-white rounded-lg shadow-sm border p-6 flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{t('contact.info.email')}</h3>
                  <a
                    href={`mailto:${supportEmail}`}
                    className="text-primary-600 hover:underline"
                  >
                    {supportEmail}
                  </a>
                </div>
              </div>
            </div>

            {/* Right Column - Contact Form */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {t('contact.form.title')}
              </h2>

              {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                  {t('contact.form.success')}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('contact.form.name')}
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('contact.form.namePlaceholder')}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('contact.form.email')}
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('contact.form.emailPlaceholder')}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="contact-subject" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('contact.form.subject')}
                  </label>
                  <input
                    id="contact-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t('contact.form.subjectPlaceholder')}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('contact.form.message')}
                  </label>
                  <textarea
                    id="contact-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('contact.form.messagePlaceholder')}
                    required
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
