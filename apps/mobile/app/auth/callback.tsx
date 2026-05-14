import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useURL } from 'expo-linking';
import { Colors, Spacing } from '../../lib/theme';
import { handleAuthDeepLink } from '../../lib/auth-deep-link';

/**
 * Handles Supabase email confirmation, magic links, and password-recovery redirects
 * when the app opens at `rejuuv://auth/callback` (see docs/DEEP_LINKS.md).
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const url = useURL();
  const [status, setStatus] = useState<'working' | 'done' | 'error'>('working');
  const [message, setMessage] = useState('Completing sign-in…');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const initial = await Linking.getInitialURL();
      const href = url ?? initial ?? '';
      const r = await handleAuthDeepLink(href);
      if (cancelled) return;
      if (!r.handled) {
        setStatus('error');
        setMessage('Open the sign-in or reset link from your email again. If you already used this link, request a new one.');
        setTimeout(() => router.replace('/auth/login'), 3200);
        return;
      }
      if (!r.ok) {
        setStatus('error');
        setMessage(r.errorMessage ?? 'This link is no longer valid.');
        setTimeout(() => router.replace('/auth/login'), 3200);
        return;
      }
      setStatus('done');
      setMessage('Signed in. Taking you home…');
      router.replace('/');
    })();
    return () => {
      cancelled = true;
    };
  }, [url, router]);

  return (
    <View style={styles.container}>
      {status === 'working' ? <ActivityIndicator size="large" color={Colors.primary} /> : null}
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
    backgroundColor: Colors.background,
  },
  text: {
    marginTop: Spacing.lg,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
