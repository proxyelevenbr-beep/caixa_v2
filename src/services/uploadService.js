import { isSupabaseConfigured, supabase } from './supabase';

/**
 * Converte dataURL / base64 em Blob para upload no Supabase Storage
 * @param {string} base64String
 * @returns {Blob|null}
 */
export function base64ToBlob(base64String) {
  if (!base64String || typeof base64String !== 'string') return null;

  // Se já for uma URL (ex.: https://...), não precisa converter
  if (base64String.startsWith('http://') || base64String.startsWith('https://')) {
    return null;
  }

  try {
    const parts = base64String.split(';base64,');
    const contentType = parts[0].replace('data:', '') || 'image/jpeg';
    const raw = window.atob(parts[1] || parts[0]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], { type: contentType });
  } catch (error) {
    console.error('Erro ao converter base64 para Blob:', error);
    return null;
  }
}

/**
 * Realiza upload genérico para um bucket do Supabase Storage
 * @param {string} bucket Nome do bucket ('cupons-x' ou 'assinaturas')
 * @param {string} base64 Dados em base64 da imagem
 * @param {string} filename Nome do arquivo a ser salvo
 * @returns {Promise<string>} URL pública do arquivo, ou o próprio base64 como fallback
 */
async function uploadArquivo(bucket, base64, filename) {
  if (!base64) return null;

  // Se já for uma URL pública do Supabase, retorna direto
  if (base64.startsWith('http://') || base64.startsWith('https://')) {
    return base64;
  }

  // Fallback imediato se o Supabase não estiver configurado
  if (!supabase || !isSupabaseConfigured()) {
    return base64;
  }

  const blob = base64ToBlob(base64);
  if (!blob) return base64;

  try {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filename, blob, {
        contentType: blob.type,
        upsert: true,
      });

    if (error) {
      console.warn(`[Supabase Storage] Erro no upload para ${bucket}:`, error.message);
      return base64; // Fallback: preserva base64 original
    }

    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filename);

    return publicData?.publicUrl || base64;
  } catch (err) {
    console.warn(`[Supabase Storage] Falha de conexão no bucket ${bucket}:`, err);
    return base64; // Fallback offline
  }
}

/**
 * Upload da foto do Cupom X para o bucket "cupons-x"
 * @param {string} base64
 * @param {string} matricula
 * @returns {Promise<string|null>}
 */
export async function uploadFotoCupom(base64, matricula = 'sem_mat') {
  if (!base64) return null;
  const timestamp = Date.now();
  const safeMatricula = String(matricula).replace(/\D/g, '') || 'colab';
  const filename = `${timestamp}_${safeMatricula}.jpg`;
  return uploadArquivo('cupons-x', base64, filename);
}

/**
 * Upload da assinatura para o bucket "assinaturas"
 * @param {string} base64
 * @param {string} matricula
 * @returns {Promise<string|null>}
 */
export async function uploadAssinatura(base64, matricula = 'sem_mat') {
  if (!base64) return null;
  const timestamp = Date.now();
  const safeMatricula = String(matricula).replace(/\D/g, '') || 'colab';
  const filename = `${timestamp}_${safeMatricula}.png`;
  return uploadArquivo('assinaturas', base64, filename);
}

export default {
  uploadFotoCupom,
  uploadAssinatura,
  base64ToBlob,
};
