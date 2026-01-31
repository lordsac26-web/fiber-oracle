import React from 'react';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserPreferencesProvider, useUserPreferences } from '@/components/UserPreferencesContext';
import ModeTransition from '@/components/ModeTransition';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const queryClient = new QueryClient();

function LayoutContent({ children, currentPageName }) {
  const { preferences, isAuthenticated } = useUserPreferences();
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [targetMode, setTargetMode] = React.useState(null);
  const prevAiModeRef = React.useRef(preferences.aiCentricMode);

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
      <ModeTransition 
        isTransitioning={isTransitioning} 
        mode={targetMode}
        onComplete={handleTransitionComplete}
      />
      {children}
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