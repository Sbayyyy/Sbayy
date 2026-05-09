import NextDocument, { Html, Head, Main, NextScript, DocumentContext } from 'next/document';

interface Props {
  locale: string;
}

export default class Document extends NextDocument<Props> {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await NextDocument.getInitialProps(ctx);
    return {
      ...initialProps,
      locale: ctx.locale || 'ar'
    };
  }

  render() {
    const { locale = 'ar' } = this.props;
    const isRtl = locale === 'ar';
    const runtimeConfig = {
      apiUrl: process.env.RUNTIME_API_URL || process.env.NEXT_PUBLIC_API_URL || '/api'
    };

    return (
      <Html lang={locale} dir={isRtl ? 'rtl' : 'ltr'}>
        <Head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap"
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
