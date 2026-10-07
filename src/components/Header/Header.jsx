import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLogOut } from 'react-icons/fi';

import logo from '../../assets/logo.svg';
import { APP_NAME, STORE_NAME } from '../../config';
import { useAuth } from '../../hooks/useAuth';
import {
  sincronizarPendentes,
  subscribeConnectionStatus
} from '../../services/fechamentoService';
import { useToast } from '../Toast/Toast';
import styles from './Header.module.css';

/**
 * Cabeçalho fixo: logo, nome do app, indicador de nuvem/local, líder logado e logout.
 */
export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [status, setStatus] = useState('offline');

  useEffect(() => {
    // Inscreve no monitor de conexão
    const unsub = subscribeConnectionStatus(setStatus);

    // Tenta sincronizar pendentes ao iniciar o app
    sincronizarPendentes()
      .then((res) => {
        if (res && res.sincronizados > 0) {
          toast.success(`${res.sincronizados} fechamento(s) sincronizado(s) com a nuvem!`);
        }
      })
      .catch(() => {});

    // Quando a internet retornar, tenta sincronizar automaticamente
    const handleOnline = () => {
      sincronizarPendentes()
        .then((res) => {
          if (res && res.sincronizados > 0) {
            toast.success(`${res.sincronizados} fechamento(s) sincronizado(s) com a nuvem!`);
          }
        })
        .catch(() => {});
    };

    window.addEventListener('online', handleOnline);

    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
    };
  }, [toast]);

  const handleLogout = async () => {
    await logout();
    toast.info('Você saiu do sistema.');
    navigate('/login', { replace: true });
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <img src={logo} alt="" className={styles.logo} width="40" height="40" />
          <div className={styles.brandText}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{APP_NAME}</h1>
              <span
                className={`${styles.statusBadge} ${
                  status === 'online' ? styles.statusOnline : styles.statusOffline
                }`}
                title={
                  status === 'online'
                    ? '🟢 Conectado ao Supabase (Nuvem)'
                    : '🟡 Modo Local: dados salvos no dispositivo e sincronizados quando online'
                }
              >
                <span className={styles.statusDot} />
                {status === 'online' ? 'Nuvem' : 'Local'}
              </span>
            </div>
            <span className={styles.store}>{STORE_NAME}</span>
          </div>
        </div>

        <div className={styles.user}>
          <div className={styles.userInfo}>
            <strong>{user?.nome}</strong>
            <span>Mat. {user?.matricula}</span>
          </div>
          <div className={styles.avatar} title={`${user?.nome} (${user?.matricula})`}>
            {user?.nome?.charAt(0).toUpperCase()}
          </div>
          <button type="button" className={styles.logout} onClick={handleLogout} title="Sair do sistema">
            <FiLogOut />
            <span className={styles.logoutText}>Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
