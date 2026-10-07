import styles from './Button.module.css';

/**
 * Botão reutilizável.
 * @param {'primary'|'success'|'danger'|'dangerSoft'|'ghost'|'white'} variant
 * @param {'sm'|'md'|'lg'} size
 * @param {boolean} block  ocupa 100% da largura
 * @param {ReactNode} icon ícone à esquerda
 * @param {boolean} loading mostra spinner e desabilita
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  icon = null,
  loading = false,
  type = 'button',
  className = '',
  disabled,
  children,
  ...rest
}) {
  const classes = [
    styles.btn,
    styles[variant],
    styles[size],
    block && styles.block,
    !children && styles.iconOnly,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : icon && <span className={styles.icon}>{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
}
