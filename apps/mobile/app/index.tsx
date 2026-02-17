import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../lib/auth-context';

export default function HomeScreen() {
  const { user, loading, signOut } = useAuth();

  // Show loading state while checking auth
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Rejuuv</Text>
      </View>
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rejuuv</Text>
      
      {user ? (
        <>
          <Text style={styles.greeting}>Welcome back!</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <Link href="/intake/body-area" asChild>
            <TouchableOpacity style={styles.button} activeOpacity={0.7}>
              <Text style={styles.buttonText}>New Assessment</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/plans" asChild>
            <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.7}>
              <Text style={styles.secondaryButtonText}>My Plans</Text>
            </TouchableOpacity>
          </Link>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.subtitle}>Movement Recovery, Simplified</Text>
          <Link href="/auth/signup" asChild>
            <TouchableOpacity style={styles.button} activeOpacity={0.7}>
              <Text style={styles.buttonText}>Get Started</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/auth/login" asChild>
            <TouchableOpacity style={styles.loginLink} activeOpacity={0.7}>
              <Text style={styles.loginLinkText}>Already have an account? Log In</Text>
            </TouchableOpacity>
          </Link>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748b',
    marginBottom: 32,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    marginTop: 16,
    padding: 12,
  },
  signOutText: {
    color: '#64748b',
    fontSize: 16,
  },
  loginLink: {
    marginTop: 16,
    padding: 12,
  },
  loginLinkText: {
    color: '#64748b',
    fontSize: 16,
  },
});
