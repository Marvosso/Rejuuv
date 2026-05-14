/**
 * Beta privacy summary from GET /api/public/privacy (no auth).
 */
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

type Notice = {
  version?: string;
  summary?: string;
  data_categories?: string[];
  retention?: string;
  telemetry?: string;
  stripe_note?: string;
  contact?: string;
};

export default function LegalPrivacyScreen() {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/public/privacy`);
        const json = (await res.json()) as Notice;
        if (!res.ok) throw new Error('Could not load privacy summary');
        if (!cancelled) setNotice(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Privacy (beta)</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {!notice && !error && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
        {notice && (
          <>
            {notice.version && (
              <Text style={styles.meta}>Version: {notice.version}</Text>
            )}
            {notice.summary && <Text style={styles.p}>{notice.summary}</Text>}
            {notice.data_categories && notice.data_categories.length > 0 && (
              <>
                <Text style={styles.h2}>Data we process</Text>
                {notice.data_categories.map((line) => (
                  <Text key={line} style={styles.bullet}>
                    • {line}
                  </Text>
                ))}
              </>
            )}
            {notice.retention && (
              <>
                <Text style={styles.h2}>Retention & deletion</Text>
                <Text style={styles.p}>{notice.retention}</Text>
              </>
            )}
            {notice.telemetry && (
              <>
                <Text style={styles.h2}>Telemetry</Text>
                <Text style={styles.p}>{notice.telemetry}</Text>
              </>
            )}
            {notice.stripe_note && (
              <>
                <Text style={styles.h2}>Billing (Stripe)</Text>
                <Text style={styles.p}>{notice.stripe_note}</Text>
              </>
            )}
            {notice.contact && (
              <Text style={[styles.p, { marginTop: 16 }]}>{notice.contact}</Text>
            )}
            <Text style={styles.disclaimer}>
              This summary is for beta transparency and is not a substitute for a full privacy policy
              or legal review.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  back: { color: '#2563eb', fontSize: 15, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  body: { padding: 20, paddingBottom: 48 },
  center: { paddingVertical: 40, alignItems: 'center' },
  meta: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  h2: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 18, marginBottom: 8 },
  p: { fontSize: 15, color: '#374151', lineHeight: 22 },
  bullet: { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 6, paddingLeft: 4 },
  error: { color: '#b91c1c', fontSize: 15 },
  disclaimer: {
    marginTop: 28,
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 18,
  },
});
