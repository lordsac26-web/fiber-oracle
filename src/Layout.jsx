import React from 'react';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserPreferencesProvider, useUserPreferences } from '@/components/UserPreferencesContext';
import ModeTransition from '@/components/ModeTransition';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Shield, Sun, Moon } from 'lucide-react';

const queryClient = new QueryClient();

function LayoutContent({ children, currentPageName }) {
  const { preferences, isAuthenticated } = useUserPreferences();
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [targetMode, setTargetMode] = React.useState(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const prevAiModeRef = React.useRef(preferences.aiCentricMode);

  // Check admin status
  React.useEffect(() => {
    if (isAuthenticated) {
      base44.auth.me().then(user => {
        if (user?.role === 'admin') {
          setIsAdmin(true);
        }
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  React.useEffect(() => {
    // Check if AI mode preference changed
    if (prevAiModeRef.current !== preferences.aiCentricMode) {
      const newMode = preferences.aiCentricMode ? 'ai' : 'traditional';
      
      // Only transition if we're on Home or PhotonChat pages
      if (currentPageName === 'Home' || currentPageName === 'PhotonChat') {
        setTargetMode(newMode);
        setIsTransitioning(true);
      }
      
      prevAiModeRef.current = preferences.aiCentricMode;
    }
  }, [preferences.aiCentricMode, currentPageName]);

  // Handle initial landing page redirect
  React.useEffect(() => {
    if (isAuthenticated && currentPageName === 'Home' && preferences.aiCentricMode) {
      navigate(createPageUrl('PhotonChat'));
    }
  }, [isAuthenticated, preferences.aiCentricMode, currentPageName, navigate]);

  const handleTransitionComplete = () => {
    setIsTransitioning(false);
    
    if (targetMode === 'ai') {
      navigate(createPageUrl('PhotonChat'));
    } else if (targetMode === 'traditional') {
      navigate(createPageUrl('Home'));
    }
    
    setTargetMode(null);
  };

  return (
    <>
      <Toaster position="top-center" richColors />
      <PWAInstallPrompt />
      <ModeTransition 
        isTransitioning={isTransitioning} 
        mode={targetMode}
        onComplete={handleTransitionComplete}
      />
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
          <ThemeToggle />
        </div>
      )}
      {!isAdmin && (
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
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
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <UserPreferencesProvider>
          <LayoutContent children={children} currentPageName={currentPageName} />
        </UserPreferencesProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}