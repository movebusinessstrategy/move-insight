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

export const glassMorphism = {
  light: {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
  } as React.CSSProperties,
  dark: {
    background: 'rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  } as React.CSSProperties,
};

export const keyframes = `
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes gradientShift {
    0%, 100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  @keyframes glow {
    0%, 100% {
      box-shadow: 0 0 10px rgba(0, 122, 255, 0.3);
    }
    50% {
      box-shadow: 0 0 20px rgba(0, 122, 255, 0.5);
    }
  }
`;

export const animations = {
  fadeIn: {
    animation: 'fadeIn 0.4s ease-out',
  } as React.CSSProperties,
  slideUp: {
    animation: 'slideUp 0.5s ease-out',
  } as React.CSSProperties,
  slideDown: {
    animation: 'slideDown 0.5s ease-out',
  } as React.CSSProperties,
  gradientShift: {
    animation: 'gradientShift 6s ease-in-out infinite',
  } as React.CSSProperties,
  float: {
    animation: 'float 3s ease-in-out infinite',
  } as React.CSSProperties,
  glow: {
    animation: 'glow 2s ease-in-out infinite',
  } as React.CSSProperties,
};
