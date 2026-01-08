import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import '@/styles/globals.css';
import CartSidebar from '@/components/CartSidebar';
import { ToastContainer } from '@/lib/toast';

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
      <CartSidebar />
      <ToastContainer />
    </QueryClientProvider>
  );
}
