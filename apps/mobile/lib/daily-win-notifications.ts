import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { normalizePhaseExercises } from './recovery-plan-phase';

const DAILY_WIN_NOTIFICATION_ID_KEY = '@rejuuv_daily_win_notification_id';
export const DAILY_WIN_CHANNEL_ID = 'daily-recovery';

export type PlanForDailyWin = {
  plan_data: string;
  phase: number;
};

export function pickPrimaryPlan<T extends { status?: string | null }>(plans: T[]): T | null {
  if (!plans.length) return null;
  const active = plans.find((p) => p.status === 'active');
  return active ?? plans[0];
}

export function firstExerciseFromPlan(plan: PlanForDailyWin | null): string | null {
  if (!plan?.plan_data) return null;
  try {
    const data = JSON.parse(plan.plan_data) as {
      recovery_plan?: Record<string, unknown>;
    };
    const phases = data?.recovery_plan;
    if (!phases || typeof phases !== 'object') return null;
    const phaseKey =
      plan.phase === 1
        ? 'phase_1_days_1_to_7'
        : plan.phase === 2
          ? 'phase_2_days_8_to_21'
          : 'phase_3_week_4_and_beyond';
    const list = normalizePhaseExercises(phases[phaseKey] as Parameters<typeof normalizePhaseExercises>[0]);
    const name = list[0]?.name?.trim();
    return name || null;
  } catch {
    return null;
  }
}

/**
 * Schedules a repeating local notification (default 9:00) with copy tied to the user's current phase exercise.
 * Reschedules on each call so body stays in sync with plan changes.
 */
export async function syncDailyWinReminder(plan: PlanForDailyWin | null): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(DAILY_WIN_CHANNEL_ID, {
        name: 'Daily recovery',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const prevId = await AsyncStorage.getItem(DAILY_WIN_NOTIFICATION_ID_KEY);
    if (prevId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(prevId);
      } catch {
        // stale id
      }
    }

    const exercise = firstExerciseFromPlan(plan);
    const body = exercise
      ? `${exercise} — about 2 minutes when you're ready.`
      : 'Open Rejuuv for a quick movement win.';

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Tomorrow's 2-minute win",
        body,
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: DAILY_WIN_CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 9,
        minute: 0,
      },
    });

    await AsyncStorage.setItem(DAILY_WIN_NOTIFICATION_ID_KEY, notificationId);
  } catch (e) {
    console.warn('Daily win reminder schedule failed:', e);
  }
}
