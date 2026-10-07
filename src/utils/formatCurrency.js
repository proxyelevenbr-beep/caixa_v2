/**
 * Utilitários de moeda (padrão brasileiro: R$ 1.234,56)
 */

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1234.5 → "R$ 1.234,50" */
export function formatCurrency(value) {
  return currencyFormatter.format(Number(value) || 0);
}

/** 1234.5 → "1.234,50" (sem o símbolo — usado nos inputs) */
export function formatNumber(value) {
  return numberFormatter.format(Number(value) || 0);
}

/**
 * Converte o texto digitado em número, no estilo "máquina de cartão":
 * os dígitos são interpretados como centavos.
 *   "1"     → 0.01
 *   "15000" → 150.00
 *   ""      → null (campo vazio)
 */
export function parseCurrencyInput(text) {
  const digits = String(text ?? '').replace(/\D/g, '').slice(0, 11); // até R$ 999.999.999,99
  if (!digits) return null;
  return Number(digits) / 100;
}

/**
 * Soma segura de valores monetários (em centavos, evita erros de ponto flutuante).
 * @param {Array} list
 * @param {(item:any) => number} getter
 */
export function sumCurrency(list, getter) {
  const cents = list.reduce((acc, item) => acc + Math.round((Number(getter(item)) || 0) * 100), 0);
  return cents / 100;
}
