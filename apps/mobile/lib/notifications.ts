import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiFetch } from './api-fetch';
import { getAccessTokenForApi } from './auth';

const easProjectId =
  (process.env.EXPO_PUBLIC_PROJECT_ID as string | undefined) ||
  (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;

/**
 * Request notification permission and register the Expo push token with the backend.
 * Call when the user is logged in (e.g. on home screen mount).
 */
export async function registerPushToken(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    if (final !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: easProjectId,
    });
    const token = tokenData?.data;
    if (!token) return;

    const access = await getAccessTokenForApi();
    if (!access) return;

    await apiFetch('/users/push-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  } catch (err) {
    console.warn('Push token registration failed:', err);
  }
}
