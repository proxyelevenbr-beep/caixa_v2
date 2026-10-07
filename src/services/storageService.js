/**
 * storageService — ÚNICO ponto do app que acessa o localStorage.
 *
 * Fase 2 (Supabase): os services de domínio (fechamentoService/authService)
 * passarão a chamar o Supabase, e este arquivo ficará só para preferências locais.
 */

export class StorageError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'StorageError';
    this.cause = cause;
  }
}

/** Detecta erro de "armazenamento cheio" em todos os navegadores */
function isQuotaError(err) {
  return (
    err instanceof DOMException &&
    (err.code === 22 || err.code === 1014 || err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}

/** Lê e faz parse de JSON. Retorna `fallback` se não existir ou estiver corrompido. */
function get(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** Salva como JSON. Lança StorageError com mensagem amigável se falhar. */
function set(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    if (isQuotaError(err)) {
      throw new StorageError(
        'Armazenamento do navegador cheio! Exclua fechamentos antigos no Histórico para liberar espaço.',
        err
      );
    }
    throw new StorageError('Não foi possível salvar os dados neste navegador.', err);
  }
}

function remove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignora */
  }
}

/** Tamanho aproximado ocupado por uma chave (em bytes, UTF-16) */
function sizeOf(key) {
  const raw = window.localStorage.getItem(key);
  return raw ? raw.length * 2 : 0;
}

const storageService = { get, set, remove, sizeOf };
export default storageService;
