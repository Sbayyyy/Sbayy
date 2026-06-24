import type { PropsWithChildren, ReactElement } from 'react';
import NextDocument, {
  Html,
  Head as NextDocumentHead,
  Main,
  NextScript as NextDocumentScript,
  type DocumentContext,
} from 'next/document';

interface Props {
  locale: string;
}

const Head = NextDocumentHead as unknown as (props: PropsWithChildren) => ReactElement;
const NextScript = NextDocumentScript as unknown as () => ReactElement;

export default class Document extends NextDocument<Props> {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await NextDocument.getInitialProps(ctx);
    return {
      ...initialProps,
      locale: ctx.locale || 'ar'
    };
  }

  render() {
    const { locale = 'ar' } = (this as unknown as { props: Readonly<Props> }).props;
    const isRtl = locale === 'ar';
    const runtimeConfig = {
      apiUrl: process.env.RUNTIME_API_URL || process.env.NEXT_PUBLIC_API_URL || '/api',
      supportEmail: process.env.RUNTIME_SUPPORT_EMAIL || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@syrian-bay.com',
      logoUrl: process.env.RUNTIME_LOGO_URL || process.env.NEXT_PUBLIC_LOGO_URL || '/assets/sbaylogo2.png',
      googleWebClientId: process.env.RUNTIME_GOOGLE_WEB_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID || ''
    };

    return (
      <Html lang={locale} dir={isRtl ? 'rtl' : 'ltr'}>
        <Head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap"
            rel="stylesheet"
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.__RUNTIME_CONFIG__ = ${JSON.stringify(runtimeConfig)};`
            }}
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
