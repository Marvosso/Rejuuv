import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

interface BodyArea {
  id: string;
  label: string;
}

const EMOJI_MAP: Record<string, string> = {
  neck: '🦜',
  lower_back: '🔻',
  knee: '🦵',
  shoulder: '💪',
};

const FALLBACK_BODY_AREAS: BodyArea[] = [
  { id: 'neck', label: 'Neck' },
  { id: 'lower_back', label: 'Lower Back' },
  { id: 'knee', label: 'Knee' },
  { id: 'shoulder', label: 'Shoulder' },
];

export default function BodyAreaScreen() {
  const [bodyAreas, setBodyAreas] = useState<BodyArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchBodyAreas = async () => {
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
        const response = await fetch(`${apiUrl}/body-areas`);
        
        if (response.ok) {
          const data = await response.json();
          setBodyAreas(data);
        } else {
          throw new Error('Failed to fetch body areas');
        }
      } catch (error) {
        console.error('Error fetching body areas:', error);
        setBodyAreas(FALLBACK_BODY_AREAS);
      } finally {
        setLoading(false);
      }
    };

    fetchBodyAreas();
  }, []);

  const handleContinue = () => {
    if (selectedArea) {
      router.push(`/intake/pain-details?body_area=${selectedArea}`);
    }
  };

  const getEmoji = (id: string) => {
    return EMOJI_MAP[id] || '🎯';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Where is your discomfort?</Text>
        <Text style={styles.subtitle}>Tap the area that is bothering you most</Text>

        <View style={styles.areasContainer}>
          {bodyAreas.map((area) => {
            const isSelected = selectedArea === area.id;
            return (
              <TouchableOpacity
                key={area.id}
                style={[
                  styles.areaCard,
                  isSelected && styles.areaCardSelected,
                ]}
                onPress={() => setSelectedArea(area.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.emoji}>{getEmoji(area.id)}</Text>
                <Text style={[
                  styles.areaLabel,
                  isSelected && styles.areaLabelSelected,
                ]}>
                  {area.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedArea && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedArea}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.continueButtonText,
            !selectedArea && styles.continueButtonTextDisabled,
          ]}>
            Continue
          </Text>
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
    paddingBottom: 100,
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
    marginBottom: 32,
    textAlign: 'center',
  },
  areasContainer: {
    gap: 16,
  },
  areaCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minHeight: 120,
  },
  areaCardSelected: {
    backgroundColor: '#DBEAFE',
    borderColor: '#2563eb',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  areaLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
  },
  areaLabelSelected: {
    color: '#2563eb',
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
  },
  continueButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  continueButtonTextDisabled: {
    color: '#9CA3AF',
  },
});
