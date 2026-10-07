import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { FiCheckCircle, FiEye, FiEyeOff, FiLock, FiLogIn, FiUser, FiX } from 'react-icons/fi';

import logo from '../../assets/logo.svg';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import { useToast } from '../../components/Toast/Toast';
import { APP_NAME, STORE_NAME } from '../../config';
import { useAuth } from '../../hooks/useAuth';
import { findLiderByMatricula } from '../../services/authService';
import { hasErrors, onlyDigits, validarLogin } from '../../utils/validators';
import styles from './Login.module.css';

/**
 * Tela de login da liderança.
 */
export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const location = useLocation();
  const toast = useToast();

  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const matriculaRef = useRef(null);
  const senhaRef = useRef(null);

  const lider = findLiderByMatricula(matricula);
  const destino = location.state?.from?.pathname || '/fechamento';

  // Matrícula válida → foca a senha automaticamente
  useEffect(() => {
    if (lider) senhaRef.current?.focus();
  }, [lider]);

  // Já logado → vai direto para o app
  if (isAuthenticated) return <Navigate to={destino} replace />;

  const handleClearMatricula = () => {
    setMatricula('');
    setSenha('');
    setErrors({});
    matriculaRef.current?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validarLogin({ matricula, senha });
    setErrors(errs);
    if (hasErrors(errs)) return;

    setLoading(true);
    try {
      const user = await login(matricula, senha);
      toast.success(`Bem-vindo(a), ${user.nome}!`);
      // O redirecionamento acontece no render (isAuthenticated = true)
    } catch (err) {
      setErrors({ [err.field || 'senha']: err.message });
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.ambientLightTop} aria-hidden="true" />
      <div className={styles.ambientLightBottom} aria-hidden="true" />
      <div className={styles.gridOverlay} aria-hidden="true" />

      <main className={styles.container}>
        <form className={styles.card} onSubmit={handleSubmit} noValidate autoComplete="off">
          <div className={styles.cardHeader}>
            <img src={logo} alt={APP_NAME} className={styles.logo} width="64" height="64" />
            <h1 className={styles.title}>{APP_NAME}</h1>
            <p className={styles.subtitle}>{STORE_NAME} · Acesso da liderança</p>
          </div>

          <div className={styles.fields}>
            <Input
              ref={matriculaRef}
              label={
                <span className={styles.inputLabel}>
                  <FiUser className={styles.inputIcon} /> Matrícula
                </span>
              }
              value={matricula}
              onChange={(e) => {
                setMatricula(onlyDigits(e.target.value));
                setErrors((p) => ({ ...p, matricula: undefined }));
              }}
              inputMode="numeric"
              placeholder="Digite sua matrícula"
              error={errors.matricula}
              success={!!lider}
              autoFocus
              size="lg"
            />

            {lider && (
              <div className={styles.welcomeCard}>
                <div className={styles.avatarWrapper}>
                  <div className={styles.avatar}>{lider.nome.charAt(0)}</div>
                  <span className={styles.avatarBadge} title="Líder verificado">
                    <FiCheckCircle />
                  </span>
                </div>

                <div className={styles.welcomeContent}>
                  <strong className={styles.welcomeName}>Olá, {lider.nome}! 👋</strong>
                  <small className={styles.welcomeHint}>Digite a senha para continuar</small>
                </div>

                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={handleClearMatricula}
                  title="Trocar matrícula"
                  aria-label="Trocar matrícula"
                >
                  <FiX />
                </button>
              </div>
            )}

            <Input
              ref={senhaRef}
              label={
                <span className={styles.inputLabel}>
                  <FiLock className={styles.inputIcon} /> Senha
                </span>
              }
              type={showPassword ? 'text' : 'password'}
              inputMode="numeric"
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value);
                setErrors((p) => ({ ...p, senha: undefined }));
              }}
              placeholder="••••"
              error={errors.senha}
              size="lg"
              maxLength={10}
              rightElement={
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  tabIndex={-1}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              }
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              loading={loading}
              icon={<FiLogIn />}
              className={styles.submitBtn}
            >
              Entrar
            </Button>
          </div>
        </form>

        <footer className={styles.footer}>
          <span>© {new Date().getFullYear()} {STORE_NAME}</span>
        </footer>
      </main>
    </div>
  );
}
