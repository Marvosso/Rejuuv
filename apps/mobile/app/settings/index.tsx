/**
 * Beta: data, privacy summary link, and account deletion entry point.
 */
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { apiFetchJson } from '../../lib/api-fetch';
import supabase from '../../lib/auth';

export default function SettingsScreen() {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = () => {
    Alert.alert(
      'Delete account?',
      'This permanently removes your Rejuuv app data and sign-in. Subscription billing history may still exist in Stripe. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete my account',
          style: 'destructive',
          onPress: () => void runDelete(),
        },
      ]
    );
  };

  const runDelete = async () => {
    setDeleting(true);
    try {
      const r = await apiFetchJson<{
        ok?: boolean;
        deleted_application_data?: boolean;
        stripe_untouched?: string;
      }>('/me/delete-account', {
        method: 'POST',
        body: JSON.stringify({ confirm: true }),
      });
      if (!r.ok) {
        Alert.alert('Could not delete', r.message, [{ text: 'OK' }]);
        return;
      }
      await supabase.auth.signOut();
      Alert.alert('Account deleted', 'You have been signed out.', [
        { text: 'OK', onPress: () => router.replace('/auth/login') },
      ]);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Data & privacy</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Privacy summary (beta)</Text>
        <Text style={styles.cardBody}>
          Read what we collect, how long we keep it, and what account deletion does in the app.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/legal/privacy')}>
          <Text style={styles.primaryBtnText}>Open privacy summary</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, styles.dangerCard]}>
        <Text style={styles.cardTitle}>Delete account</Text>
        <Text style={styles.cardBody}>
          Removes your recovery data from Rejuuv and deletes your login. Does not remove Stripe billing
          records automatically.
        </Text>
        <TouchableOpacity
          style={[styles.dangerBtn, deleting && styles.btnDisabled]}
          onPress={confirmDelete}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.dangerBtnText}>Delete my account…</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  back: { color: '#2563eb', fontSize: 15, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },
  card: {
    margin: 20,
    padding: 18,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dangerCard: { borderColor: '#fecaca' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8 },
  cardBody: { fontSize: 14, color: '#4b5563', lineHeight: 21, marginBottom: 14 },
  primaryBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dangerBtn: {
    backgroundColor: '#b91c1c',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  dangerBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
});
