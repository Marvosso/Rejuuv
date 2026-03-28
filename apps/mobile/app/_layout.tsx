import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../lib/auth-context';

// Public routes that don't require authentication
const PUBLIC_SEGMENTS = ['auth'];

function AuthGuard() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inPublicRoute = PUBLIC_SEGMENTS.includes(segments[0] as string);

    if (!user && !inPublicRoute) {
      // Defer until after the root navigator mounts — immediate replace on cold start can crash on iOS release builds.
      const t = setTimeout(() => {
        router.replace('/auth/login');
      }, 0);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [user, loading, segments, router]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGuard />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </AuthProvider>
  );
}
