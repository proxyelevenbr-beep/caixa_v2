/**
 * authService — autenticação da liderança.
 *
 * Fase 1: matrícula + senha única, sessão no localStorage.
 * Fase 2: trocar por supabase.auth (as funções já são async para facilitar).
 */
import { SENHA_PADRAO, STORAGE_KEYS } from '../config';
import { findLider } from '../utils/validators';
import storage from './storageService';

export class AuthError extends Error {
  /** @param {'matricula'|'senha'} field campo relacionado ao erro */
  constructor(message, field) {
    super(message);
    this.name = 'AuthError';
    this.field = field;
  }
}

/** Retorna o líder pela matrícula (ou null) — usado para mostrar o nome no login */
export function findLiderByMatricula(matricula) {
  return findLider(matricula);
}

/**
 * Faz login. Retorna o usuário { matricula, nome, loginEm }.
 * Lança AuthError com o campo que falhou.
 * Valida estritamente contra a lista de LIDERANÇA.
 */
export async function login(matricula, senha) {
  const lider = findLider(matricula);
  if (!lider) {
    throw new AuthError('Matrícula não autorizada.', 'matricula');
  }
  if (senha !== SENHA_PADRAO) {
    throw new AuthError('Senha incorreta.', 'senha');
  }

  const user = { matricula: lider.matricula, nome: lider.nome, loginEm: new Date().toISOString() };
  storage.set(STORAGE_KEYS.AUTH, user);
  return user;
}

export async function logout() {
  storage.remove(STORAGE_KEYS.AUTH);
}

/**
 * Usuário salvo (síncrono, para restaurar a sessão sem "piscar" a tela de login).
 * Valida se a matrícula ainda faz parte da liderança.
 */
export function getCurrentUser() {
  const user = storage.get(STORAGE_KEYS.AUTH, null);
  if (!user || !findLider(user.matricula)) return null;
  return user;
}

const authService = { login, logout, getCurrentUser, findLiderByMatricula };
export default authService;
