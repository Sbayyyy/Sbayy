import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'سباي' }} />
        <Stack.Screen name="login" options={{ title: 'تسجيل الدخول' }} />
        <Stack.Screen name="register" options={{ title: 'حساب جديد' }} />
      </Stack>
    </QueryClientProvider>
  );
}
