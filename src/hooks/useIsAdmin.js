import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Returns whether the current user has the 'admin' role.
 * Resolves asynchronously; defaults to false until checked.
 */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    base44.auth.me()
      .then(user => {
        setIsAdmin(user?.role === 'admin');
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, []);

  return { isAdmin, checked };
}