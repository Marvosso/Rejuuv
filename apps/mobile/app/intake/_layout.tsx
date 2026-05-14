import { Stack } from 'expo-router';
import { IntakeWizardProvider } from '../../lib/intake-wizard-context';

export default function IntakeLayout() {
  return (
    <IntakeWizardProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </IntakeWizardProvider>
  );
}
