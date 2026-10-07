import { forwardRef, useId } from 'react';
import { formatNumber, parseCurrencyInput } from '../../utils/formatCurrency';
import styles from './Input.module.css';

/**
 * Campo de formulário reutilizável (input, textarea ou select).
 *
 * Uso normal:
 *   <Input label="Nome" value={v} onChange={e => setV(e.target.value)} />
 *
 * Máscara de moeda (valor numérico ou null):
 *   <Input mask="currency" label="Valor" value={num} onValueChange={setNum} />
 *
 * @param {'input'|'textarea'|'select'} as
 * @param {'currency'} mask
 * @param {'md'|'lg'} size
 * @param {boolean} success   destaca o campo em verde (ex.: matrícula válida)
 */
const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    required = false,
    optional = false,
    mask,
    as = 'input',
    size = 'md',
    success = false,
    value,
    onChange,
    onValueChange,
    className = '',
    id,
    children,
    rightElement,
    ...rest
  },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;
  const isCurrency = mask === 'currency';
  const Tag = as;

  // Na máscara de moeda, converte o texto digitado em número
  const handleChange = (e) => {
    if (isCurrency) {
      onValueChange?.(parseCurrencyInput(e.target.value));
      return;
    }
    onChange?.(e);
  };

  const displayValue = isCurrency ? (value === null || value === undefined ? '' : formatNumber(value)) : value;

  const inputClasses = [
    styles.input,
    as === 'textarea' && styles.textarea,
    as === 'select' && styles.select,
    isCurrency && styles.currency,
    size === 'lg' && styles.lg,
    rightElement && styles.withRightElement,
    success && !error && styles.success,
    error && styles.hasError,
  ]
    .filter(Boolean)
    .join(' ');

  const currencyProps = isCurrency ? { inputMode: 'numeric', placeholder: '0,00', autoComplete: 'off' } : {};

  return (
    <div className={`${styles.field} ${className}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {required && <span className={styles.req}> *</span>}
          {optional && <span className={styles.opt}> (opcional)</span>}
        </label>
      )}

      <div className={styles.control}>
        {isCurrency && <span className={`${styles.prefix} ${size === 'lg' ? styles.prefixLg : ''}`}>R$</span>}
        <Tag
          ref={ref}
          id={inputId}
          className={inputClasses}
          value={displayValue}
          onChange={handleChange}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${inputId}-msg` : undefined}
          {...rest}
          {...currencyProps}
        >
          {as === 'select' ? children : undefined}
        </Tag>
        {rightElement && <div className={styles.rightElement}>{rightElement}</div>}
      </div>

      {error ? (
        <span id={`${inputId}-msg`} className={styles.error} role="alert">
          {error}
        </span>
      ) : (
        hint && (
          <span id={`${inputId}-msg`} className={styles.hint}>
            {hint}
          </span>
        )
      )}
    </div>
  );
});

export default Input;
