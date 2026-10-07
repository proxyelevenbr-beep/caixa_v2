/**
 * Utilitários de data.
 * Datas de fechamento são guardadas como string "YYYY-MM-DD" (fuso local),
 * o que permite comparar/filtrar por texto sem problemas de fuso horário.
 */

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const pad = (n) => String(n).padStart(2, '0');

/** Date → "YYYY-MM-DD" (fuso local) */
export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Hoje em "YYYY-MM-DD" */
export function todayISO() {
  return toISODate(new Date());
}

/** "YYYY-MM-DD" → Date (meia-noite local) */
export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Soma (ou subtrai) dias de uma data ISO */
export function addDays(iso, days) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Primeiro dia do mês da data informada */
export function firstDayOfMonth(iso = todayISO()) {
  return `${iso.slice(0, 7)}-01`;
}

/** "2026-10-06" → "06/10/2026" */
export function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** ISO datetime → "06/10/2026 11:57" */
export function formatDateTime(isoDateTime) {
  if (!isoDateTime) return '—';
  const d = new Date(isoDateTime);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

/** ISO datetime → "11:57" */
export function formatTime(isoDateTime) {
  return new Date(isoDateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** "2026-10-06" → "ter" */
export function weekdayShort(iso) {
  return parseISODate(iso).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

/** "2026-10-06" → "Out" */
export function monthShort(iso) {
  return MESES_CURTOS[Number(iso.split('-')[1]) - 1];
}

/** "2026-10-06" → "06" */
export function dayOf(iso) {
  return iso.split('-')[2];
}
