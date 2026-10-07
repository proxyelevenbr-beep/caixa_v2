import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Verifica se as variáveis de ambiente foram preenchidas com valores reais
 */
export function isSupabaseConfigured() {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (supabaseUrl.includes('seu-projeto') || supabaseAnonKey.includes('sua-anon-key')) {
    return false;
  }
  try {
    new URL(supabaseUrl);
    return true;
  } catch {
    return false;
  }
}

/**
 * Instância do cliente Supabase.
 * Inicializada apenas se a URL for válida para evitar erro fatal no build/runtime.
 */
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // O app usa autenticação própria por matrícula
        autoRefreshToken: false,
      },
    })
  : null;

/**
 * Testa se a comunicação com o banco do Supabase está respondendo
 * @returns {Promise<boolean>}
 */
export async function testSupabaseConnection() {
  if (!supabase || !isSupabaseConfigured()) {
    return false;
  }
  try {
    const { error } = await supabase
      .from('fechamentos')
      .select('id')
      .limit(1);

    return !error;
  } catch {
    return false;
  }
}

export default supabase;
