import { useNavigate } from 'react-router-dom';
import { FiLogOut } from 'react-icons/fi';

import logo from '../../assets/logo.svg';
import { APP_NAME, STORE_NAME } from '../../config';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../Toast/Toast';
import styles from './Header.module.css';

/**
 * Cabeçalho fixo: logo, nome do app, líder logado e botão de logout.
 */
export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

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
            <h1 className={styles.title}>{APP_NAME}</h1>
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
