export type Theme = 'light' | 'dark';

export const colors = {
  light: {
    bg: {
      primary: '#FFFFFF',
      secondary: '#F5F5F7',
      tertiary: '#EFEFEF',
    },
    text: {
      primary: '#000000',
      secondary: '#86868B',
      tertiary: '#A1A1A6',
    },
    border: '#E5E5EA',
    accent: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
  },
  dark: {
    bg: {
      primary: '#000000',
      secondary: '#1D1D1F',
      tertiary: '#2D2D2F',
    },
    text: {
      primary: '#F5F5F7',
      secondary: '#A1A1A6',
      tertiary: '#86868B',
    },
    border: '#424245',
    accent: '#0A84FF',
    success: '#32D74B',
    warning: '#FF9500',
    error: '#FF453A',
  },
};

export const shadows = {
  sm: '0 1px 3px rgba(0, 0, 0, 0.12)',
  md: '0 4px 12px rgba(0, 0, 0, 0.15)',
  lg: '0 12px 24px rgba(0, 0, 0, 0.15)',
};

export const radius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

export const typography = {
  title: {
    fontSize: '32px',
    fontWeight: '700',
    lineHeight: '1.2',
  },
  heading: {
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '1.2',
  },
  subheading: {
    fontSize: '18px',
    fontWeight: '600',
    lineHeight: '1.3',
  },
  body: {
    fontSize: '16px',
    fontWeight: '400',
    lineHeight: '1.5',
  },
  small: {
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '1.4',
  },
  tiny: {
    fontSize: '12px',
    fontWeight: '400',
    lineHeight: '1.4',
  },
};
