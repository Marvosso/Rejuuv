import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Animated, ScrollView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { Colors, Shadows, Spacing, Radius } from '../../lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.push('/');
    } catch (error: any) {
      let msg = 'Something went wrong. Please try again.';
      if (error.message?.includes('Invalid login credentials') || error.status === 400)
        msg = 'Invalid email or password. Please check your credentials and try again.';
      else if (error.message?.includes('Email not confirmed'))
        msg = 'Please check your email and confirm your account before signing in.';
      else if (error.message) msg = error.message;
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.heroSection}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={styles.logoText}>Rejuuv</Text>
          <Text style={styles.heroSubtitle}>Your recovery companion</Text>
        </Animated.View>
      </View>
      <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.formTitle}>Welcome back</Text>
          <Text style={styles.formSubtitle}>Sign in to continue your recovery journey</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput style={[styles.input, emailFocused && styles.inputFocused]} placeholder="you@example.com" placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!loading} onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput style={[styles.input, passwordFocused && styles.inputFocused]} placeholder="Your password" placeholderTextColor={Colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!loading} onFocus={() => setPasswordFocused(true)} onBlur={() => setPasswordFocused(false)} />
          </View>
          <TouchableOpacity style={[styles.loginButton, loading && styles.loginButtonDisabled]} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color={Colors.textInverse} /> : <Text style={styles.loginButtonText}>Log In</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.signUpLink} onPress={() => router.push('/auth/signup')} disabled={loading} activeOpacity={0.7}>
            <Text style={styles.signUpLinkText}>Don't have an account? <Text style={styles.signUpLinkBold}>Create one free</Text></Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  heroSection: { backgroundColor: Colors.primary, paddingTop: 72, paddingBottom: 40, paddingHorizontal: 28 },
  logoText: { fontSize: 40, fontWeight: '800', color: Colors.textInverse, marginBottom: 6, letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  formContainer: { flex: 1 },
  formContent: { padding: 28, paddingBottom: 48 },
  formTitle: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6, marginTop: 4 },
  formSubtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: 32, lineHeight: 22 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8, letterSpacing: 0.3 },
  input: { backgroundColor: Colors.surface, borderRadius: Radius.md, paddingHorizontal: 18, paddingVertical: 16, fontSize: 16, color: Colors.textPrimary, borderWidth: 2, borderColor: Colors.border },
  inputFocused: { borderColor: Colors.primary },
  loginButton: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 24 },
  loginButtonDisabled: { backgroundColor: Colors.textMuted },
  loginButtonText: { color: Colors.textInverse, fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
  signUpLink: { alignItems: 'center', paddingVertical: Spacing.md },
  signUpLinkText: { color: Colors.textSecondary, fontSize: 15 },
  signUpLinkBold: { color: Colors.primary, fontWeight: '700' },
});
