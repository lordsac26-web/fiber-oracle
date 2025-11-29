import React from 'react';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserPreferencesProvider } from '@/components/UserPreferencesContext';

const queryClient = new QueryClient();

export default function Layout({ children, currentPageName }) {
  return (
    <QueryClientProvider client={queryClient}>
      <UserPreferencesProvider>
        <Toaster position="top-center" richColors />
        {children}
      </UserPreferencesProvider>
    </QueryClientProvider>
  );
}