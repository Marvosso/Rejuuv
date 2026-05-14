import { Redirect } from 'expo-router';

/** Legacy URL; main flow uses `/intake/summary` with wizard context. */
export default function ReviewRedirect() {
  return <Redirect href="/intake/summary" />;
}
