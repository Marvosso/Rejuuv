import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Radius } from '../lib/theme';
import { logClientError } from '../lib/crash-reporting';

type Surface = 'root' | 'screen';

type Props = {
  children: ReactNode;
  /** root = full-screen dark (shell); screen = light in-flow card (charts, billing, AI). */
  surface?: Surface;
};

type State = { hasError: boolean; message: string | null };

/**
 * Prevents a single subtree render exception from blanking the whole app (release builds).
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message ?? 'Something went wrong' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logClientError(error, {
      componentStack: info.componentStack,
      surface: this.props.surface ?? 'root',
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, message: null });
  };

  render() {
    const surface = this.props.surface ?? 'root';
    if (this.state.hasError) {
      if (surface === 'screen') {
        return (
          <View style={screenStyles.wrap} testID="error-boundary-screen-fallback">
            <Text style={screenStyles.title}>This section needs a breather</Text>
            <Text style={screenStyles.body}>
              Nothing is wrong with your care plan on our servers — this view hit a small display
              glitch. You can try again, or go back and return when you are ready.
            </Text>
            <TouchableOpacity
              style={screenStyles.btn}
              onPress={this.handleReset}
              accessibilityRole="button"
            >
              <Text style={screenStyles.btnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        );
      }
      return (
        <View style={rootStyles.wrap} testID="error-boundary-fallback">
          <Text style={rootStyles.title}>We hit a snag</Text>
          <Text style={rootStyles.body}>
            The app stepped in so you are not stuck on a blank screen. Your saved check-ins and
            plans on the server are safe.
          </Text>
          {this.state.message ? <Text style={rootStyles.mono}>{this.state.message}</Text> : null}
          <TouchableOpacity style={rootStyles.btn} onPress={this.handleReset} accessibilityRole="button">
            <Text style={rootStyles.btnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const rootStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0f1419',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#f2f4f7', marginBottom: 12 },
  body: { fontSize: 16, color: '#c9ced6', lineHeight: 24, marginBottom: 16 },
  mono: { fontSize: 12, color: '#8b95a5', marginBottom: 24 },
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: '#3d7a5e',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});

const screenStyles = StyleSheet.create({
  wrap: {
    padding: Spacing.xl,
    marginVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  body: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
  },
  btnText: { color: Colors.textInverse, fontWeight: '600', fontSize: 15 },
});
