import { Redirect } from 'expo-router';

/** Free-text notes now live on `/intake/summary`. */
export default function TellMoreRedirect() {
  return <Redirect href="/intake/summary" />;
}
