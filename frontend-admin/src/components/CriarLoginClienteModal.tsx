import { useState } from 'react';
import { X, Lock, Mail, AlertCircle, CheckCircle } from 'lucide-react';

interface CriarLoginClienteModalProps {
  clienteId: string;
  clienteNome: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (dados: any) => void;
}

export default function CriarLoginClienteModal({
  clienteId,
  clienteNome,
  isOpen,
  onClose,
  onSuccess,
}: CriarLoginClienteModalProps) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [gerarSenha, setGerarSenha] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loginCriado, setLoginCriado] = useState<any>(null);

  const gerarSenhaAleatoria = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let nova = '';
    for (let i = 0; i < 12; i++) {
      nova += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSenha(nova);
  };

  const copiarParaClipboard = (texto: string) => {
    navigator.clipboard.writeText(texto).then(() => {
      alert('Copiado para a área de transferência!');
    });
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);

    if (!email.trim()) {
      setError('Email é obrigatório');
      return;
    }

    if (!email.includes('@')) {
      setError('Email inválido');
      return;
    }

    if (!senha || senha.length < 6) {
      setError('Senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/admin/clientes/${clienteId}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, senha }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao criar login');
      }

      const data = await response.json();
      setLoginCriado(data.login);
      setSuccess(true);

      if (onSuccess) {
        onSuccess(data.login);
      }

      // Resetar form após 2 segundos
      setTimeout(() => {
        setEmail('');
        setSenha('');
        setSuccess(false);
        setLoginCriado(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Criar Login do Cliente</h2>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          <div style={styles.clienteInfo}>
            <p style={styles.label}>Cliente:</p>
            <p style={styles.clienteNome}>{clienteNome}</p>
          </div>

          {!success ? (
            <>
              {/* Email */}
              <div style={styles.group}>
                <label style={styles.label}>
                  <Mail size={16} style={{ marginRight: '8px' }} />
                  Email para Login
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@exemplo.com"
                  style={styles.input}
                  disabled={loading}
                />
              </div>

              {/* Senha */}
              <div style={styles.group}>
                <label style={styles.label}>
                  <Lock size={16} style={{ marginRight: '8px' }} />
                  Senha
                </label>
                <div style={styles.senhaContainer}>
                  <input
                    type="text"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    style={{
                      ...styles.input,
                      flex: 1,
                      marginRight: '8px',
                    }}
                    disabled={loading}
                  />
                  <button
                    onClick={gerarSenhaAleatoria}
                    style={{
                      ...styles.btnSecundario,
                      whiteSpace: 'nowrap',
                      padding: '10px 14px',
                    }}
                    disabled={loading}
                  >
                    Gerar
                  </button>
                </div>
              </div>

              {/* Checkbox */}
              <div style={styles.checkbox}>
                <input
                  type="checkbox"
                  id="provisoria"
                  checked={true}
                  disabled
                  style={{ marginRight: '8px' }}
                />
                <label htmlFor="provisoria" style={{ fontSize: '13px', color: '#666' }}>
                  ✓ Cliente deverá trocar senha no primeiro acesso
                </label>
              </div>

              {/* Error */}
              {error && (
                <div style={styles.error}>
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div style={styles.buttons}>
                <button onClick={onClose} style={styles.btnSecundario} disabled={loading}>
                  Cancelar
                </button>
                <button onClick={handleSubmit} style={styles.btnPrimario} disabled={loading}>
                  {loading ? 'Criando...' : 'Criar Login'}
                </button>
              </div>
            </>
          ) : (
            <div style={styles.successContainer}>
              <CheckCircle size={48} style={{ color: '#4caf50', marginBottom: '16px' }} />
              <h3 style={styles.successTitle}>Login Criado com Sucesso!</h3>

              {loginCriado && (
                <div style={styles.credenciaisBox}>
                  <p style={styles.credencialLabel}>Email:</p>
                  <div style={styles.credencial}>
                    <code>{loginCriado.email}</code>
                    <button
                      onClick={() => copiarParaClipboard(loginCriado.email)}
                      style={styles.btnCopiar}
                    >
                      Copiar
                    </button>
                  </div>

                  <p style={styles.credencialLabel}>Senha Temporária:</p>
                  <div style={styles.credencial}>
                    <code>{senha}</code>
                    <button
                      onClick={() => copiarParaClipboard(senha)}
                      style={styles.btnCopiar}
                    >
                      Copiar
                    </button>
                  </div>

                  <p style={styles.instrucoes}>
                    ⚠️ Compartilhe essas credenciais com o cliente. Ele deverá trocar a senha
                    no primeiro acesso.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },

  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #eee',
  },

  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a1a',
  },

  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#666',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    padding: '24px',
  },

  clienteInfo: {
    marginBottom: '24px',
    padding: '12px 16px',
    backgroundColor: '#f5f5f5',
    borderRadius: '6px',
  },

  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase' as const,
    marginBottom: '4px',
    display: 'flex',
    alignItems: 'center',
  },

  clienteNome: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '500',
    color: '#1a1a1a',
  },

  group: {
    marginBottom: '20px',
  },

  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    marginTop: '6px',
    boxSizing: 'border-box' as const,
  },

  senhaContainer: {
    display: 'flex',
    gap: '8px',
    marginTop: '6px',
  },

  checkbox: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
  },

  error: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 14px',
    backgroundColor: '#fee',
    color: '#c33',
    borderRadius: '4px',
    fontSize: '13px',
    marginBottom: '20px',
  },

  buttons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },

  btnPrimario: {
    padding: '10px 20px',
    backgroundColor: '#1a73e8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },

  btnSecundario: {
    padding: '10px 20px',
    backgroundColor: '#f5f5f5',
    color: '#333',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },

  successContainer: {
    textAlign: 'center' as const,
    padding: '20px 0',
  },

  successTitle: {
    margin: '0 0 20px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a1a',
  },

  credenciaisBox: {
    backgroundColor: '#f9f9f9',
    padding: '20px',
    borderRadius: '6px',
    textAlign: 'left' as const,
  },

  credencialLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase' as const,
    margin: '12px 0 6px 0',
  },

  credencial: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  } as React.CSSProperties,

  btnCopiar: {
    padding: '6px 12px',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },

  instrucoes: {
    fontSize: '12px',
    color: '#ff6b00',
    backgroundColor: '#fff3e0',
    padding: '12px',
    borderRadius: '4px',
    margin: '12px 0 0 0',
  },
};
