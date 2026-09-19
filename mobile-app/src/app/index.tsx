import { Redirect } from 'expo-router';

import { useAuth } from '@/context/auth-context';

export default function Index() {
  const { isAuthenticated, isRestoring } = useAuth();
  if (isRestoring) return null;
  return <Redirect href={isAuthenticated ? '/dashboard' : '/login'} />;
}
