import { Moon, Sun, LogOut, ArrowLeft } from 'lucide-react';
import { colors, spacing, radius, shadows } from '../theme';
import type { Theme } from '../theme';
import logoLight from '../assets/logo-light.png';
import logoDark from '../assets/logo-dark.png';

interface HeaderProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onLogout: () => void;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  showLogo?: boolean;
}

export default function Header({
  theme,
  onThemeChange,
  onLogout,
  title,
  subtitle,
  showBackButton = false,
  onBack,
  showLogo = false,
}: HeaderProps) {
  const c = colors[theme];

  return (
    <div style={{
      backgroundColor: c.bg.primary,
      borderBottom: `1px solid ${c.border}`,
      padding: `${spacing.md} ${spacing.lg}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      minHeight: '60px',
      boxShadow: shadows.sm,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
        {showBackButton && onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: c.text.primary,
              padding: spacing.sm,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={20} />
          </button>
        )}

        {showLogo && (
          <img
            src={theme === 'light' ? logoLight : logoDark}
            alt="Logo"
            style={{ height: '50px', width: 'auto' }}
          />
        )}

        {title && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
            {subtitle ? (
              <>
                <h1 style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '700',
                  color: c.text.primary,
                  lineHeight: '1.2',
                }}>
                  {title}
                </h1>
                <p style={{
                  margin: 0,
                  fontSize: '11px',
                  color: c.text.secondary,
                  fontWeight: '400',
                  lineHeight: '1.2',
                }}>
                  {subtitle}
                </p>
              </>
            ) : (
              <h1 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '700',
                color: c.text.primary,
              }}>
                {title}
              </h1>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
        <button
          onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: c.text.secondary,
            padding: spacing.sm,
            borderRadius: radius.md,
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = c.bg.tertiary;
            e.currentTarget.style.boxShadow = `0 0 12px ${c.accent}33`;
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <div style={{
          height: '24px',
          width: '1px',
          backgroundColor: c.border,
        }} />

        <button
          onClick={onLogout}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: c.text.secondary,
            padding: spacing.sm,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xs,
            fontSize: '14px',
            transition: 'color 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = c.text.primary;
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = c.text.secondary;
          }}
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </div>
  );
}
