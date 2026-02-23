// Rejuuv Design System - Theme Constants
import { Platform } from 'react-native';

export const Colors = {
  // Primary palette
  primary: '#0D9488',
  primaryDark: '#0F766E',
  primaryLight: '#CCFBF1',
  secondary: '#F97316',
  secondaryLight: '#FFEDD5',

  // Status colors
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  dangerDark: '#DC2626',

  // Backgrounds
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',
  inputBg: '#F3F4F6',

  // Text
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Borders
  border: '#E5E7EB',
  borderFocus: '#0D9488',

  // Phase accent colors
  phase1: '#10B981',
  phase2: '#F97316',
  phase3: '#0D9488',
};

// Shadow helpers — use these as INLINE styles only, not inside StyleSheet.create().
// On web, react-dom cannot handle shadowOffset (object) or shadowOpacity/shadowRadius
// as CSS properties. Use getShadow() to get the correct platform shadow at runtime.
export const getShadow = (type: 'card' | 'fab' | 'button' | 'none') => {
  if (Platform.OS === 'web') {
    const webShadows: Record<string, object> = {
      card:   { boxShadow: '0px 4px 12px rgba(0,0,0,0.08)' },
      fab:    { boxShadow: '0px 8px 16px rgba(0,0,0,0.12)' },
      button: { boxShadow: '0px 4px 8px rgba(13,148,136,0.25)' },
      none:   {},
    };
    return webShadows[type] ?? {};
  }
  const nativeShadows: Record<string, object> = {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    fab: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
    button: {
      shadowColor: '#0D9488',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    none: { elevation: 0 },
  };
  return nativeShadows[type] ?? {};
};

// Legacy Shadows object — kept for compatibility but DO NOT spread into StyleSheet.create().
// Use getShadow() instead when you need platform-correct shadows.
export const Shadows = {
  card: Platform.select({
    web: { boxShadow: '0px 4px 12px rgba(0,0,0,0.08)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
  })!,
  fab: Platform.select({
    web: { boxShadow: '0px 8px 16px rgba(0,0,0,0.12)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
  })!,
  button: Platform.select({
    web: { boxShadow: '0px 4px 8px rgba(13,148,136,0.25)' },
    default: {
      shadowColor: '#0D9488',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
  })!,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};
