import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

const PAIN_TYPES = ['Sharp', 'Dull ache', 'Burning', 'Throbbing', 'Stiff', 'Shooting', 'Catching', 'Weakness'];
const DURATION_OPTIONS = ['Less than 1 day', '1-3 days', '4-7 days', '1-2 weeks', '2-4 weeks', '1-3 months', 'More than 3 months'];
const TRIGGER_OPTIONS = ['Sitting', 'Standing', 'Walking', 'Running', 'Lifting', 'Bending', 'Twisting', 'Sleeping', 'Desk work', 'Overhead reaching'];
const LIMITATION_OPTIONS = ['Bending forward', 'Bending backward', 'Twisting', 'Lifting', 'Reaching overhead', 'Turning head', 'Standing up', 'Weight bearing'];

export default function PainDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const bodyArea = (params.body_area as string) || '';

  const [specificLocation, setSpecificLocation] = useState('');
  const [selectedPainTypes, setSelectedPainTypes] = useState<string[]>([]);
  const [duration, setDuration] = useState('');
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [painLevel, setPainLevel] = useState(0);
  const [selectedLimitations, setSelectedLimitations] = useState<string[]>([]);

  const toggleSelection = (item: string, currentSelection: string[], setSelection: (items: string[]) => void) => {
    if (currentSelection.includes(item)) {
      setSelection(currentSelection.filter(i => i !== item));
    } else {
      setSelection([...currentSelection, item]);
    }
  };

  const handleContinue = () => {
    const queryParams = new URLSearchParams({
      body_area: bodyArea,
      specific_location: specificLocation,
      pain_type: encodeURIComponent(JSON.stringify(selectedPainTypes)),
      duration: duration,
      trigger: encodeURIComponent(JSON.stringify(selectedTriggers)),
      pain_level: painLevel.toString(),
      movement_limitations: encodeURIComponent(JSON.stringify(selectedLimitations)),
    });

    router.push(`/intake/review?${queryParams.toString()}`);
  };

  const isFormValid = specificLocation.trim() !== '' && 
                     selectedPainTypes.length > 0 && 
                     duration !== '' && 
                     painLevel > 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Tell us about your pain</Text>
        <Text style={styles.subtitle}>Help us understand what you're experiencing</Text>

        {/* Specific Location */}
        <View style={styles.section}>
          <Text style={styles.label}>Specific Location *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Right side, Lower back, Front of knee"
            value={specificLocation}
            onChangeText={setSpecificLocation}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Pain Type */}
        <View style={styles.section}>
          <Text style={styles.label}>Pain Type *</Text>
          <View style={styles.optionsContainer}>
            {PAIN_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.optionChip,
                  selectedPainTypes.includes(type) && styles.optionChipSelected,
                ]}
                onPress={() => toggleSelection(type, selectedPainTypes, setSelectedPainTypes)}
              >
                <Text style={[
                  styles.optionChipText,
                  selectedPainTypes.includes(type) && styles.optionChipTextSelected,
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Duration */}
        <View style={styles.section}>
          <Text style={styles.label}>How long? *</Text>
          <View style={styles.optionsContainer}>
            {DURATION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionChip,
                  duration === option && styles.optionChipSelected,
                ]}
                onPress={() => setDuration(option)}
              >
                <Text style={[
                  styles.optionChipText,
                  duration === option && styles.optionChipTextSelected,
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pain Level */}
        <View style={styles.section}>
          <Text style={styles.label}>Pain Level (0-10) *</Text>
          <View style={styles.painLevelContainer}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.painLevelButton,
                  painLevel === level && styles.painLevelButtonSelected,
                  level <= 3 && painLevel === level && styles.painLevelButtonGreen,
                  level > 3 && level <= 6 && painLevel === level && styles.painLevelButtonYellow,
                  level > 6 && painLevel === level && styles.painLevelButtonRed,
                ]}
                onPress={() => setPainLevel(level)}
              >
                <Text style={[
                  styles.painLevelText,
                  painLevel === level && styles.painLevelTextSelected,
                ]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.painLevelHint}>
            {painLevel === 0 && 'Select your pain level'}
            {painLevel > 0 && painLevel <= 3 && 'Mild pain'}
            {painLevel > 3 && painLevel <= 6 && 'Moderate pain'}
            {painLevel > 6 && 'Severe pain'}
          </Text>
        </View>

        {/* Triggers */}
        <View style={styles.section}>
          <Text style={styles.label}>What triggers or worsens it?</Text>
          <View style={styles.optionsContainer}>
            {TRIGGER_OPTIONS.map((trigger) => (
              <TouchableOpacity
                key={trigger}
                style={[
                  styles.optionChip,
                  selectedTriggers.includes(trigger) && styles.optionChipSelected,
                ]}
                onPress={() => toggleSelection(trigger, selectedTriggers, setSelectedTriggers)}
              >
                <Text style={[
                  styles.optionChipText,
                  selectedTriggers.includes(trigger) && styles.optionChipTextSelected,
                ]}>
                  {trigger}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Movement Limitations */}
        <View style={styles.section}>
          <Text style={styles.label}>Movement Limitations</Text>
          <View style={styles.optionsContainer}>
            {LIMITATION_OPTIONS.map((limitation) => (
              <TouchableOpacity
                key={limitation}
                style={[
                  styles.optionChip,
                  selectedLimitations.includes(limitation) && styles.optionChipSelected,
                ]}
                onPress={() => toggleSelection(limitation, selectedLimitations, setSelectedLimitations)}
              >
                <Text style={[
                  styles.optionChipText,
                  selectedLimitations.includes(limitation) && styles.optionChipTextSelected,
                ]}>
                  {limitation}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !isFormValid && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!isFormValid}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.continueButtonText,
            !isFormValid && styles.continueButtonTextDisabled,
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
    marginBottom: 32,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionChipSelected: {
    backgroundColor: '#DBEAFE',
    borderColor: '#2563eb',
  },
  optionChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  optionChipTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
  painLevelContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  painLevelButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  painLevelButtonSelected: {
    borderColor: '#2563eb',
  },
  painLevelButtonGreen: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  painLevelButtonYellow: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  painLevelButtonRed: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  painLevelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  painLevelTextSelected: {
    color: '#FFFFFF',
  },
  painLevelHint: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
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
