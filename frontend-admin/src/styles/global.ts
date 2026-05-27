import { colors, spacing, radius, typography } from '../theme';
import type { Theme } from '../theme';

export function getPageStyles(theme: Theme) {
  const c = colors[theme];

  return {
    page: {
      display: 'flex' as const,
      flexDirection: 'column' as const,
      height: '100vh',
      backgroundColor: c.bg.primary,
      color: c.text.primary,
    },
    header: {
      backgroundColor: c.bg.secondary,
      borderBottom: `1px solid ${c.border}`,
      padding: `${spacing.md} ${spacing.lg}`,
      display: 'flex' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
    },
    content: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: spacing.lg,
      background: `linear-gradient(135deg, ${c.bg.primary} 0%, ${c.bg.secondary} 50%)`,
    },
    title: {
      ...typography.heading,
      margin: 0,
    },
    subtitle: {
      ...typography.subheading,
      margin: 0,
      marginTop: spacing.sm,
    },
    label: {
      ...typography.small,
      color: c.text.secondary,
      display: 'block' as const,
      marginBottom: spacing.sm,
    },
    button: (variant: 'primary' | 'secondary' = 'primary') => ({
      padding: `${spacing.sm} ${spacing.md}`,
      borderRadius: radius.md,
      border: 'none' as const,
      cursor: 'pointer' as const,
      ...typography.small,
      fontWeight: '600' as const,
      transition: 'all 0.2s',
      backgroundColor: variant === 'primary' ? c.accent : c.bg.tertiary,
      color: variant === 'primary' ? '#FFFFFF' : c.text.primary,
    }),
    card: {
      backgroundColor: c.bg.secondary,
      borderRadius: radius.lg,
      padding: spacing.lg,
      border: `1px solid ${c.border}`,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      ...typography.small,
    },
    tableHeader: {
      backgroundColor: c.bg.tertiary,
      borderBottom: `1px solid ${c.border}`,
      textAlign: 'left' as const,
      padding: spacing.md,
      color: c.text.secondary,
      fontWeight: '600' as const,
    },
    tableRow: {
      borderBottom: `1px solid ${c.border}`,
      transition: 'background-color 0.2s',
      padding: spacing.md,
    },
    input: {
      width: '100%',
      padding: `${spacing.sm} ${spacing.md}`,
      borderRadius: radius.md,
      border: `1px solid ${c.border}`,
      backgroundColor: c.bg.primary,
      color: c.text.primary,
      ...typography.small,
      fontFamily: typography.small.fontFamily,
    },
    modal: {
      position: 'fixed' as const,
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      zIndex: 1000,
    },
    modalContent: {
      backgroundColor: c.bg.primary,
      borderRadius: radius.lg,
      padding: spacing.lg,
      maxWidth: '500px',
      width: '90%',
      boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)',
    },
  };
}
