import { View, Text, TouchableOpacity, StyleSheet, Linking, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

interface SafetyData {
  message: string;
  recommended_action: string;
}

export default function SafetyAlertScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse safety data from search params
  const safetyParam = params.safety as string | undefined;
  const safety: SafetyData = safetyParam
    ? JSON.parse(decodeURIComponent(safetyParam))
    : {
        message: '',
        recommended_action: '',
      };

  const handleFindUrgentCare = () => {
    Linking.openURL('https://www.google.com/maps/search/urgent+care+near+me');
  };

  const handleCall911 = () => {
    Linking.openURL('tel:911');
  };

  const handleUnderstand = () => {
    router.push('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.redAccent} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.warningBanner}>
          <Text style={styles.warningEmoji}>🚨</Text>
          <Text style={styles.warningText}>Important: Seek Medical Care</Text>
        </View>

        <View style={styles.messageCard}>
          <Text style={styles.messageText}>{safety.message}</Text>
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.actionCardTitle}>What You Should Do</Text>
          <Text style={styles.actionCardText}>{safety.recommended_action}</Text>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.urgentCareButton}
            onPress={handleFindUrgentCare}
            activeOpacity={0.8}
          >
            <Text style={styles.urgentCareButtonText}>Find Urgent Care</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.call911Button}
            onPress={handleCall911}
            activeOpacity={0.8}
          >
            <Text style={styles.call911ButtonText}>Call 911</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.understandButton}
            onPress={handleUnderstand}
            activeOpacity={0.7}
          >
            <Text style={styles.understandButtonText}>I Understand</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          This warning is for your safety. Please do not ignore these symptoms.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  redAccent: {
    height: 6,
    backgroundColor: '#DC2626',
    width: '100%',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  warningBanner: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  warningEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageText: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  actionCardText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  buttonsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  urgentCareButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentCareButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  call911Button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  call911ButtonText: {
    color: '#DC2626',
    fontSize: 18,
    fontWeight: '600',
  },
  understandButton: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  understandButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  disclaimer: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
