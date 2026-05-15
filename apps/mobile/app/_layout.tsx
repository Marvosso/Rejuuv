import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from '../lib/auth-context';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { assertPublicRuntimeConfig } from '../lib/runtime-env';
import { initCrashReporting } from '../lib/crash-reporting';
import { processCheckInOutbox } from '../lib/check-in-outbox';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Public routes that don't require authentication
const PUBLIC_SEGMENTS = ['auth', 'legal'];

function AuthGuard() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const seg0 = segments[0] as string;
    const inPublicRoute = PUBLIC_SEGMENTS.includes(seg0);

    // Logged-in users should not stay on login/signup (e.g. after iOS swipe-back).
    if (user && seg0 === 'auth') {
      const t = setTimeout(() => router.replace('/'), 0);
      return () => clearTimeout(t);
    }

    if (!user && !inPublicRoute) {
      const t = setTimeout(() => router.replace('/auth/login'), 0);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [user, loading, segments, router]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  useEffect(() => {
    assertPublicRuntimeConfig();
    initCrashReporting();
  }, []);

  useEffect(() => {
    void processCheckInOutbox();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void processCheckInOutbox();
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthGuard />
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              gestureEnabled: false,
              fullScreenGestureEnabled: false,
            }}
          />
        </Stack>
      </AuthProvider>
    </ErrorBoundary>
  );
}
