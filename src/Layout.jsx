import React from 'react';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserPreferencesProvider, useUserPreferences } from '@/components/UserPreferencesContext';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Shield } from 'lucide-react';

const queryClient = new QueryClient();

function LayoutContent({ children, currentPageName }) {
  const { isAuthenticated } = useUserPreferences();
  const [isAdmin, setIsAdmin] = React.useState(false);

  // Check admin status
  React.useEffect(() => {
    if (isAuthenticated) {
      base44.auth.me().then(user => {
        if (user?.role === 'admin') setIsAdmin(true);
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  return (
    <>
      <Toaster position="top-center" richColors />
      <PWAInstallPrompt />
      {isAdmin && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-1 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <Shield className="h-3 w-3" />
            <span className="font-medium">Admin Mode</span>
            <Link
              to={createPageUrl('AdminPanel')}
              className="ml-2 px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded transition-colors"
            >
              Control Panel
            </Link>
          </div>
        </div>
      )}
      <div className={isAdmin ? 'pt-7' : ''}>
        {children}
      </div>
    </>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <QueryClientProvider client={queryClient}>
      <UserPreferencesProvider>
        <LayoutContent children={children} currentPageName={currentPageName} />
      </UserPreferencesProvider>
    </QueryClientProvider>
  );
}