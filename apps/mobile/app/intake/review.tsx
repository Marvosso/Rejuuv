import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getSession } from '../../lib/auth';

const BODY_AREA_COLORS: Record<string, string> = {
  neck: '#3B82F6',
  lower_back: '#10B981',
  knee: '#F59E0B',
  shoulder: '#EF4444',
};

const getPainLevelColor = (level: number): string => {
  if (level <= 3) return '#10B981'; // green
  if (level <= 6) return '#F59E0B'; // yellow
  return '#EF4444'; // red
};

export default function ReviewScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse intake data from search params
  const bodyArea = (params.body_area as string) || '';
  const specificLocation = (params.specific_location as string) || '';
  const painType = params.pain_type ? (typeof params.pain_type === 'string' ? JSON.parse(decodeURIComponent(params.pain_type)) : params.pain_type) : [];
  const duration = (params.duration as string) || '';
  const trigger = params.trigger ? (typeof params.trigger === 'string' ? JSON.parse(decodeURIComponent(params.trigger)) : params.trigger) : [];
  const painLevel = parseInt((params.pain_level as string) || '0', 10);
  const movementLimitations = params.movement_limitations ? (typeof params.movement_limitations === 'string' ? JSON.parse(decodeURIComponent(params.movement_limitations)) : params.movement_limitations) : [];

  const intakeData = {
    body_area: bodyArea,
    specific_location: specificLocation,
    pain_type: painType,
    duration: duration,
    trigger: trigger,
    pain_level: painLevel,
    movement_limitations: movementLimitations,
  };

  const handleEdit = () => {
    router.back();
  };

  const handleGetAnalysis = async () => {
    setLoading(true);

    try {
      const session = await getSession();
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

      const response = await fetch(`${apiUrl}/assessments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify(intakeData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Assessment request failed:', errorText);
        throw new Error(`Failed to submit assessment: ${response.status}`);
      }

      const data = await response.json();

      if (data.blocked === true) {
        const safetyParam = encodeURIComponent(
          JSON.stringify({
            message: data.message || 'We detected some concerning symptoms.',
            recommended_action: data.recommended_action || 'Please seek immediate medical attention.',
          })
        );
        router.push(`/intake/safety-alert?safety=${safetyParam}`);
        return;
      }

      // Navigate to results with analysis data and intake data
      const analysisData = encodeURIComponent(JSON.stringify(data));
      const intakeDataParam = encodeURIComponent(JSON.stringify(intakeData));
      router.push(`/analysis/results?analysis=${analysisData}&intakeData=${intakeDataParam}`);
    } catch (error) {
      console.error('Error submitting assessment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(
        'Error',
        `Something went wrong: ${errorMessage}. Please make sure the backend server is running.`,
        [{ text: 'OK' }]
      );
      setLoading(false);
    }
  };

  const formatArray = (arr: string[]): string => {
    return Array.isArray(arr) ? arr.join(', ') : '';
  };

  const getBodyAreaDisplayName = (area: string): string => {
    const names: Record<string, string> = {
      neck: 'Neck',
      lower_back: 'Lower Back',
      knee: 'Knee',
      shoulder: 'Shoulder',
    };
    return names[area] || area;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Does this look right?</Text>
        <Text style={styles.subtitle}>Review your information before we analyze it</Text>

        <View style={styles.summaryCard}>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Body Area</Text>
            <View style={styles.badgeContainer}>
              <View style={[
                styles.badge,
                { backgroundColor: BODY_AREA_COLORS[bodyArea] || '#6B7280' }
              ]}>
                <Text style={styles.badgeText}>{getBodyAreaDisplayName(bodyArea)}</Text>
              </View>
            </View>
          </View>

          {specificLocation && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Location</Text>
              <Text style={styles.sectionValue}>{specificLocation}</Text>
            </View>
          )}

          {painType.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Pain Type</Text>
              <Text style={styles.sectionValue}>{formatArray(painType)}</Text>
            </View>
          )}

          {duration && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Duration</Text>
              <Text style={styles.sectionValue}>{duration}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Pain Level</Text>
            <View style={styles.painLevelContainer}>
              <View style={[
                styles.painLevelDot,
                { backgroundColor: getPainLevelColor(painLevel) }
              ]} />
              <Text style={styles.painLevelText}>{painLevel} / 10</Text>
            </View>
          </View>

          {trigger.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Triggers</Text>
              <Text style={styles.sectionValue}>{formatArray(trigger)}</Text>
            </View>
          )}

          {movementLimitations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Movement Limitations</Text>
              <Text style={styles.sectionValue}>{formatArray(movementLimitations)}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Analyzing your symptoms...</Text>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEdit}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.analyzeButton,
            loading && styles.analyzeButtonDisabled,
          ]}
          onPress={handleGetAnalysis}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.analyzeButtonText}>Get My Analysis</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    gap: 20,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionValue: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  painLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  painLevelDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  painLevelText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
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
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  analyzeButton: {
    flex: 2,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
