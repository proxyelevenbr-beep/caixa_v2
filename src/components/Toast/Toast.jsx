import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi';
import styles from './Toast.module.css';

/**
 * Sistema de notificações (toasts).
 *
 * Uso:
 *   const toast = useToast();
 *   toast.success('Salvo!');
 *   toast.error('Algo deu errado');
 *   toast.info('Informação');
 */
const ToastContext = createContext(null);

const ICONS = {
  success: <FiCheckCircle />,
  error: <FiAlertTriangle />,
  warning: <FiAlertTriangle />,
  info: <FiInfo />,
};

const EXIT_MS = 250;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  // Marca como "saindo" (anima) e depois remove
  const dismiss = useCallback((id) => {
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), EXIT_MS);
  }, []);

  const show = useCallback(
    (message, type = 'info', duration = 3500) => {
      const id = ++counter.current;
      setToasts((list) => [...list.slice(-3), { id, message, type, leaving: false }]); // máx. 4 na tela
      setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      show,
      dismiss,
      success: (msg, duration) => show(msg, 'success', duration),
      error: (msg, duration) => show(msg, 'error', duration ?? 5000),
      warning: (msg, duration) => show(msg, 'warning', duration ?? 4500),
      info: (msg, duration) => show(msg, 'info', duration),
    }),
    [show, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.container} aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${styles[t.type]} ${t.leaving ? styles.leaving : ''}`} role="status">
            <span className={styles.icon}>{ICONS[t.type]}</span>
            <span className={styles.message}>{t.message}</span>
            <button type="button" className={styles.close} onClick={() => dismiss(t.id)} aria-label="Fechar notificação">
              <FiX />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  return ctx;
}

export default ToastProvider;
