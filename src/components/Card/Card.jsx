import styles from './Card.module.css';

/**
 * Card com título/ícone opcionais.
 * @param {ReactNode} title
 * @param {ReactNode} icon     ícone exibido ao lado do título
 * @param {ReactNode} actions  conteúdo à direita do título
 * @param {'default'|'success'|'danger'|'warning'|'primary'} tone  cor de destaque (cards de estatística)
 */
export default function Card({ title, icon, actions, tone = 'default', className = '', children, ...rest }) {
  return (
    <section className={`${styles.card} ${styles[tone] || ''} ${className}`} {...rest}>
      {(title || actions) && (
        <header className={styles.header}>
          {title && (
            <h3 className={styles.title}>
              {icon && <span className={styles.icon}>{icon}</span>}
              {title}
            </h3>
          )}
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
