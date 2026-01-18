import { ReactNode } from 'react';
import Head from 'next/head';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  hideHeader?: boolean;
  hideFooter?: boolean;
}

export default function Layout({ 
  children, 
  title = 'سباي - سوق سوريا الإلكتروني',
  description = 'منصة تجارة إلكترونية مثل eBay مصممة خصيصاً لسوريا',
  hideHeader = false,
  hideFooter = false,
}: LayoutProps) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex flex-col min-h-screen">
        {!hideHeader && <Header />}
        <main className="flex-1 min-h-0">
          {children}
        </main>
        {!hideFooter && <Footer />}
      </div>
    </>
  );
}
