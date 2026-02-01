import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

interface AnalysisData {
  summary: string;
  possible_contributors: string[];
  education: string;
  safety_note: string;
}

export default function ResultsScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse analysis data from search params
  const analysisParam = params.analysis as string | undefined;
  const intakeDataParam = params.intakeData as string | undefined;
  
  const analysis: AnalysisData = analysisParam
    ? JSON.parse(decodeURIComponent(analysisParam))
    : {
        summary: '',
        possible_contributors: [],
        education: '',
        safety_note: '',
      };

  const intakeData = intakeDataParam
    ? JSON.parse(decodeURIComponent(intakeDataParam))
    : null;

  const handleGeneratePlan = async () => {
    if (!intakeData) {
      Alert.alert(
        'Error',
        'Unable to generate recovery plan. Please start over.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/recovery-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intakeData,
          analysis,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate recovery plan');
      }

      const recoveryPlan = await response.json();

      // Navigate to recovery plan screen with the plan data
      // Use base64 encoding to avoid URI encoding issues with complex JSON
      const planJson = JSON.stringify(recoveryPlan);
      const planData = encodeURIComponent(planJson);
      router.push(`/recovery/plan?plan=${planData}`);
    } catch (error) {
      console.error('Error generating recovery plan:', error);
      Alert.alert(
        'Error',
        'Something went wrong. Please try again.',
        [{ text: 'OK' }]
      );
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>✅</Text>
          <Text style={styles.headerText}>Analysis Complete</Text>
        </View>

        {/* Summary Card */}
        <View style={[styles.card, styles.summaryCard]}>
          <Text style={styles.cardTitle}>What We Found</Text>
          <Text style={styles.cardBody}>{analysis.summary}</Text>
        </View>

        {/* Contributors Card */}
        {analysis.possible_contributors && analysis.possible_contributors.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Possible Contributors</Text>
            <View style={styles.contributorsList}>
              {analysis.possible_contributors.map((contributor, index) => (
                <View key={index} style={styles.contributorItem}>
                  <View style={styles.contributorNumberBadge}>
                    <Text style={styles.contributorNumber}>{index + 1}</Text>
                  </View>
                  <Text style={styles.contributorText}>{contributor}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Education Card */}
        <View style={[styles.card, styles.educationCard]}>
          <Text style={styles.cardTitle}>What You Can Do</Text>
          <Text style={styles.cardBody}>{analysis.education}</Text>
        </View>

        {/* Safety Note Card */}
        {analysis.safety_note && (
          <View style={[styles.card, styles.safetyCard]}>
            <Text style={styles.cardTitle}>
              ⚠️ Safety Reminder
            </Text>
            <Text style={styles.cardBody}>{analysis.safety_note}</Text>
          </View>
        )}
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Generating your recovery plan...</Text>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.generateButton,
            loading && styles.generateButtonDisabled,
          ]}
          onPress={handleGeneratePlan}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.generateButtonText}>Generate My Recovery Plan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToHome}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 140,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  summaryCard: {
    borderLeftColor: '#2563eb',
  },
  educationCard: {
    borderLeftColor: '#9333EA',
  },
  safetyCard: {
    borderLeftColor: '#F59E0B',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  cardBody: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  contributorsList: {
    gap: 12,
  },
  contributorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  contributorNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  contributorNumber: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contributorText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  generateButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  generateButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
});
