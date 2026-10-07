import { NavLink } from 'react-router-dom';
import { FiClock, FiDollarSign, FiEdit3 } from 'react-icons/fi';
import styles from './NavBar.module.css';

const LINKS = [
  { to: '/fechamento', label: 'Novo Fechamento', short: 'Novo', Icon: FiEdit3 },
  { to: '/historico', label: 'Histórico', short: 'Histórico', Icon: FiClock },
  { to: '/deposito', label: 'Depósito', short: 'Depósito', Icon: FiDollarSign },
];

/**
 * Navegação principal.
 * Desktop/tablet: abas abaixo do header.
 * Celular: barra fixa na parte inferior (estilo app nativo).
 */
export default function NavBar() {
  return (
    <nav className={styles.nav} aria-label="Navegação principal">
      <div className={styles.inner}>
        {LINKS.map(({ to, label, short, Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
            <Icon className={styles.icon} aria-hidden="true" />
            <span className={styles.label}>{label}</span>
            <span className={styles.short}>{short}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
