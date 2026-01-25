import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  const runtimeConfig = {
    apiUrl: process.env.RUNTIME_API_URL || process.env.NEXT_PUBLIC_API_URL || '/api'
  };

  return (
    <Html lang="ar" dir="rtl">
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
