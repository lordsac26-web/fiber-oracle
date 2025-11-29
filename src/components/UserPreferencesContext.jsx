import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const DEFAULT_PREFERENCES = {
  units: 'metric',
  darkMode: false,
  primaryColor: '#3b82f6',
  defaultSortOrder: 'desc',
  defaultSortBy: 'created_date',
  hiddenModules: [],
  customConnectorLoss: null,
  customSpliceLoss: null,
  customAttenuation: null,
  requirePhotos: true,
  companyName: 'Fiber Oracle',
  logoUrl: '',
  customFields: ['Job Number', 'Technician', 'Location']
};

const UserPreferencesContext = createContext();

export function UserPreferencesProvider({ children }) {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [localPreferences, setLocalPreferences] = useState(() => {
    const saved = localStorage.getItem('fibertechSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
    return DEFAULT_PREFERENCES;
  });

  // Check auth status
  useEffect(() => {
    base44.auth.isAuthenticated().then(setIsAuthenticated);
  }, []);

  // Fetch user data if authenticated
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  // Mutation to update user preferences
  const updateMutation = useMutation({
    mutationFn: (newPreferences) => base44.auth.updateMe({ preferences: newPreferences }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  // Merge user preferences with defaults
  const preferences = isAuthenticated && user?.preferences
    ? { ...DEFAULT_PREFERENCES, ...user.preferences }
    : localPreferences;

  // Update preferences function
  const updatePreferences = async (newPrefs) => {
    const merged = { ...preferences, ...newPrefs };
    
    // Always save to localStorage as fallback
    localStorage.setItem('fibertechSettings', JSON.stringify(merged));
    setLocalPreferences(merged);

    // If authenticated, also save to user profile
    if (isAuthenticated) {
      await updateMutation.mutateAsync(merged);
    }

    return merged;
  };

  // Apply dark mode effect
  useEffect(() => {
    if (preferences.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [preferences.darkMode]);

  return (
    <UserPreferencesContext.Provider value={{
      preferences,
      updatePreferences,
      isLoading: isAuthenticated ? isLoading : false,
      isSaving: updateMutation.isPending,
      isAuthenticated,
      user,
    }}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within UserPreferencesProvider');
  }
  return context;
}