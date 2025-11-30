import React, { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserPreferencesProvider } from '@/components/UserPreferencesContext';
import { base44 } from '@/api/base44Client';
import Splash from '@/pages/Splash';

const queryClient = new QueryClient();

export default function Layout({ children, currentPageName }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await base44.auth.isAuthenticated();
        setIsAuthenticated(authenticated);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Show nothing while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-pulse">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/1652e0384_oracle.jpg" 
            alt="Fiber Oracle" 
            className="w-24 h-24 rounded-2xl opacity-50"
          />
        </div>
      </div>
    );
  }

  // Show splash page if not authenticated
  if (!isAuthenticated) {
    return <Splash />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <UserPreferencesProvider>
        <Toaster position="top-center" richColors />
        {children}
      </UserPreferencesProvider>
    </QueryClientProvider>
  );
}