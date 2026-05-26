import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { colors, spacing, typography, shadows, radius, glassMorphism, animations, keyframes } from '../theme';

interface LoginFormData {
  email: string;
  senha: string;
}

export default function Login() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    senha: '',
  });
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = keyframes;
    document.head.appendChild(style);

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao fazer login');
      }

      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const currentColors = colors[theme];
  const glassStyle = theme === 'light' ? glassMorphism.light : glassMorphism.dark;
  const accentColor = theme === 'light' ? colors.light.accent : colors.dark.accent;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: currentColors.bg.primary,
        backgroundImage: `linear-gradient(135deg, ${currentColors.bg.secondary} 0%, ${currentColors.bg.tertiary} 100%)`,
        backgroundSize: '200% 200%',
        ...animations.gradientShift,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        transition: 'background-color 0.3s ease',
      }}
    >
      <div
        style={{
          ...glassStyle,
          padding: spacing.xxl,
          width: '100%',
          maxWidth: '420px',
          borderRadius: radius.xl,
          ...shadows,
          ...animations.slideUp,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: spacing.xxl }}>
          <h1
            style={{
              ...typography.title,
              color: currentColors.text.primary,
              margin: `0 0 ${spacing.sm} 0`,
            }}
          >
            MOVE Insights
          </h1>
          <p
            style={{
              ...typography.small,
              color: currentColors.text.secondary,
              margin: 0,
            }}
          >
            Dashboard Administrativo
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            <label
              htmlFor="email"
              style={{
                ...typography.small,
                color: currentColors.text.primary,
                fontWeight: '500',
              }}
            >
              Email
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail
                size={18}
                color={currentColors.text.tertiary}
                style={{
                  position: 'absolute',
                  left: spacing.md,
                  pointerEvents: 'none',
                }}
              />
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="seu@email.com"
                style={{
                  width: '100%',
                  padding: `${spacing.md} ${spacing.md} ${spacing.md} 44px`,
                  backgroundColor: currentColors.bg.secondary,
                  border: `1px solid ${currentColors.border}`,
                  borderRadius: radius.md,
                  color: currentColors.text.primary,
                  fontSize: typography.body.fontSize,
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s, background-color 0.2s',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = accentColor;
                  e.currentTarget.style.backgroundColor =
                    theme === 'light'
                      ? 'rgba(0, 122, 255, 0.05)'
                      : 'rgba(10, 132, 255, 0.05)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = currentColors.border;
                  e.currentTarget.style.backgroundColor = currentColors.bg.secondary;
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            <label
              htmlFor="senha"
              style={{
                ...typography.small,
                color: currentColors.text.primary,
                fontWeight: '500',
              }}
            >
              Senha
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock
                size={18}
                color={currentColors.text.tertiary}
                style={{
                  position: 'absolute',
                  left: spacing.md,
                  pointerEvents: 'none',
                }}
              />
              <input
                id="senha"
                name="senha"
                type={showPassword ? 'text' : 'password'}
                value={formData.senha}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: `${spacing.md} 44px ${spacing.md} 44px`,
                  backgroundColor: currentColors.bg.secondary,
                  border: `1px solid ${currentColors.border}`,
                  borderRadius: radius.md,
                  color: currentColors.text.primary,
                  fontSize: typography.body.fontSize,
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s, background-color 0.2s',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = accentColor;
                  e.currentTarget.style.backgroundColor =
                    theme === 'light'
                      ? 'rgba(0, 122, 255, 0.05)'
                      : 'rgba(10, 132, 255, 0.05)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = currentColors.border;
                  e.currentTarget.style.backgroundColor = currentColors.bg.secondary;
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                style={{
                  position: 'absolute',
                  right: spacing.md,
                  background: 'none',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  color: currentColors.text.tertiary,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = accentColor;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = currentColors.text.tertiary;
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: spacing.md,
                backgroundColor:
                  theme === 'light'
                    ? 'rgba(255, 59, 48, 0.1)'
                    : 'rgba(255, 69, 58, 0.2)',
                border: `1px solid ${theme === 'light' ? colors.light.error : colors.dark.error}`,
                borderRadius: radius.md,
                color: theme === 'light' ? colors.light.error : colors.dark.error,
                ...typography.small,
                ...animations.slideDown,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: `${spacing.md} ${spacing.lg}`,
              backgroundColor: accentColor,
              color: 'white',
              border: 'none',
              borderRadius: radius.md,
              ...typography.body,
              fontWeight: '600',
              marginTop: spacing.md,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.2s, transform 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p
          style={{
            ...typography.tiny,
            color: currentColors.text.tertiary,
            textAlign: 'center',
            marginTop: spacing.xl,
            margin: `${spacing.xl} 0 0 0`,
          }}
        >
          © 2026 MOVE Business. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
