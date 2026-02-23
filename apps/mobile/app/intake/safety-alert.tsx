import { View, Text, TouchableOpacity, StyleSheet, Linking, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Shadows, Spacing, Radius } from '../../lib/theme';

interface SafetyData {
  message: string;
  recommended_action: string;
}

export default function SafetyAlertScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const safetyParam = params.safety as string | undefined;
  const safety: SafetyData = safetyParam
    ? JSON.parse(safetyParam)
    : { message: '', recommended_action: '' };

  const handleFindUrgentCare = () => {
    Linking.openURL('https://www.google.com/maps/search/urgent+care+near+me');
  };

  const handleCall911 = () => {
    Linking.openURL('tel:911');
  };

  return (
    <View style={styles.container}>
      {/* Danger accent bar */}
      <View style={styles.dangerAccentBar} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Warning header */}
        <View style={styles.warningHeader}>
          <Text style={styles.warningIcon}>🚨</Text>
          <Text style={styles.warningTitle}>Medical Attention Needed</Text>
          <Text style={styles.warningSubtitle}>
            Based on your symptoms, we recommend seeking professional medical care before starting any recovery program.
          </Text>
        </View>

        {/* Message card */}
        <View style={styles.messageCard}>
          <View style={styles.messageCardHeader}>
            <Text style={styles.messageCardIcon}>⚠️</Text>
            <Text style={styles.messageCardTitle}>What We Found</Text>
          </View>
          <Text style={styles.messageText}>{safety.message}</Text>
        </View>

        {/* Action card */}
        <View style={styles.actionCard}>
          <View style={styles.actionCardHeader}>
            <Text style={styles.actionCardIcon}>💊</Text>
            <Text style={styles.actionCardTitle}>Recommended Action</Text>
          </View>
          <Text style={styles.actionText}>{safety.recommended_action}</Text>
        </View>

        {/* Emergency actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.actionsSectionTitle}>Get Help Now</Text>

          <TouchableOpacity
            style={styles.urgentCareButton}
            onPress={handleFindUrgentCare}
            activeOpacity={0.85}
          >
            <Text style={styles.urgentCareIcon}>🏥</Text>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.urgentCareButtonText}>Find Urgent Care</Text>
              <Text style={styles.urgentCareButtonSubtext}>Locate nearest clinic</Text>
            </View>
            <Text style={styles.buttonArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.call911Button}
            onPress={handleCall911}
            activeOpacity={0.85}
          >
            <Text style={styles.call911Icon}>📞</Text>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.call911ButtonText}>Call 911</Text>
              <Text style={styles.call911ButtonSubtext}>For life-threatening emergencies</Text>
            </View>
            <Text style={styles.call911Arrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerText}>
            ⚠️ This safety alert is based on symptoms you reported. Please do not ignore these warning signs. Your health and safety come first.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.understoodButton}
          onPress={() => router.push('/')}
          activeOpacity={0.7}
        >
          <Text style={styles.understoodButtonText}>I Understand — Go to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  dangerAccentBar: {
    height: 6,
    backgroundColor: Colors.danger,
  },
  scrollContent: {
    padding: Spacing.xxl,
    paddingBottom: 48,
  },
  warningHeader: {
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.danger + '40',
  },
  warningIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  warningTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.dangerDark,
    textAlign: 'center',
    marginBottom: 10,
  },
  warningSubtitle: {
    fontSize: 15,
    color: Colors.danger,
    textAlign: 'center',
    lineHeight: 22,
  },
  messageCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
  },
  messageCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  messageCardIcon: {
    fontSize: 20,
  },
  messageCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  messageText: {
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 26,
  },
  actionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    marginBottom: Spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionCardIcon: {
    fontSize: 20,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  actionText: {
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 26,
  },
  actionsSection: {
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  actionsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  urgentCareButton: {
    backgroundColor: Colors.danger,
    borderRadius: Radius.md,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  urgentCareIcon: {
    fontSize: 28,
  },
  buttonTextContainer: {
    flex: 1,
  },
  urgentCareButtonText: {
    color: Colors.textInverse,
    fontSize: 17,
    fontWeight: '700',
  },
  urgentCareButtonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 2,
  },
  buttonArrow: {
    color: Colors.textInverse,
    fontSize: 20,
    fontWeight: '700',
  },
  call911Button: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.danger,
  },
  call911Icon: {
    fontSize: 28,
  },
  call911ButtonText: {
    color: Colors.danger,
    fontSize: 17,
    fontWeight: '700',
  },
  call911ButtonSubtext: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  call911Arrow: {
    color: Colors.danger,
    fontSize: 20,
    fontWeight: '700',
  },
  disclaimerCard: {
    backgroundColor: Colors.warningLight,
    borderRadius: Radius.md,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.warning + '50',
  },
  disclaimerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },
  understoodButton: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  understoodButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
});
