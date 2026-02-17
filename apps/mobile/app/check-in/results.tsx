import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter, useSearchParams } from 'expo-router';

interface CheckInResults {
  adjustment_summary: string;
  updated_recommendations: string[];
  next_check_in: string;
  safety_reminder?: string;
}

export default function CheckInResultsScreen() {
  const router = useRouter();
  const params = useSearchParams();

  const rawResults = params.results as string | undefined;
  let results: CheckInResults = {
    adjustment_summary: '',
    updated_recommendations: [],
    next_check_in: '',
  };

  if (rawResults) {
    try {
      results = JSON.parse(rawResults);
    } catch {
      // fall through with defaults
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Check-In Complete</Text>

        {/* Summary card — blue border */}
        <View style={[styles.card, styles.summaryCard]}>
          <Text style={styles.cardTitle}>Summary</Text>
          <Text style={styles.cardBody}>{results.adjustment_summary}</Text>
        </View>

        {/* Recommendations card — green border */}
        <View style={[styles.card, styles.recommendationsCard]}>
          <Text style={styles.cardTitle}>Recommendations</Text>
          {results.updated_recommendations.map((rec, i) => (
            <View key={i} style={styles.recRow}>
              <View style={styles.recBadge}>
                <Text style={styles.recBadgeText}>{i + 1}</Text>
              </View>
              <Text style={styles.recText}>{rec}</Text>
            </View>
          ))}
        </View>

        {/* Next steps card — purple border */}
        <View style={[styles.card, styles.nextCard]}>
          <Text style={styles.cardTitle}>Next Steps</Text>
          <Text style={styles.cardBody}>{results.next_check_in}</Text>
        </View>

        {/* Safety card — yellow border, only if safety_reminder exists */}
        {!!results.safety_reminder && (
          <View style={[styles.card, styles.safetyCard]}>
            <Text style={styles.cardTitle}>Safety Reminder</Text>
            <Text style={styles.cardBody}>{results.safety_reminder}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/')}
        >
          <Text style={styles.backButtonText}>Back to Plan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryCard: {
    borderLeftColor: '#2563eb',
  },
  recommendationsCard: {
    borderLeftColor: '#16a34a',
  },
  nextCard: {
    borderLeftColor: '#9333ea',
  },
  safetyCard: {
    borderLeftColor: '#ca8a04',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  cardBody: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  recBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  recBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  recText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 36,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  backButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
