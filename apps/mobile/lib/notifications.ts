import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getSession } from './auth';

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
      projectId: (process.env.EXPO_PUBLIC_PROJECT_ID as string) || undefined,
    });
    const token = tokenData?.data;
    if (!token) return;

    const session = await getSession();
    if (!session?.access_token) return;

    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
    await fetch(`${apiUrl}/users/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ token }),
    });
  } catch (err) {
    console.warn('Push token registration failed:', err);
  }
}
