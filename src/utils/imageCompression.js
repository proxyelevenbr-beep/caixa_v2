/**
 * Utilitário de compressão e conversão de imagens no cliente (HTML5 Canvas / APIs nativas).
 *
 * Principais recursos:
 * 1. Suporte a HEIC (formato padrão do iPhone / iOS), JPEG, PNG e WEBP.
 * 2. Conversão automática para JPEG comprimido antes do salvamento no localStorage.
 * 3. Redimensionamento proporcional mantendo a proporção original.
 * 4. Fallback multinavegador (Image element, FileReader e createImageBitmap).
 * 5. Detecção de formato e logging para auditoria técnica.
 */

/**
 * Formata número de bytes em string legível (ex: 3.2 MB, 145 KB).
 * @param {number} bytes
 * @returns {string}
 */
export function formatarBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const valor = (bytes / Math.pow(k, i));
  return `${valor < 10 && i > 0 ? valor.toFixed(1) : Math.round(valor)} ${sizes[i]}`;
}

/**
 * Detecta se o arquivo é do formato HEIC/HEIF pela extensão ou MIME type.
 * @param {File} file
 * @returns {boolean}
 */
export function isHeicFile(file) {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  return (
    type === 'image/heic' ||
    type === 'image/heif' ||
    type === 'image/heic-sequence' ||
    type === 'image/heif-sequence' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  );
}

/**
 * Identifica o formato amigável da imagem.
 * @param {File} file
 * @returns {string}
 */
export function detectarFormato(file) {
  if (isHeicFile(file)) return 'HEIC';
  if (file.type) {
    const sub = file.type.split('/')[1];
    return sub ? sub.toUpperCase() : 'DESCONHECIDO';
  }
  const ext = (file.name || '').split('.').pop();
  return ext ? ext.toUpperCase() : 'DESCONHECIDO';
}

/**
 * Carrega um File/Blob em um elemento Image com fallback para URL.createObjectURL e FileReader.
 * @param {File} file
 * @returns {Promise<HTMLImageElement>}
 */
function carregarElementoImagem(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    const cleanup = () => {
      URL.revokeObjectURL(url);
    };

    img.onload = () => {
      cleanup();
      resolve(img);
    };

    img.onerror = () => {
      cleanup();
      // Fallback via FileReader readAsDataURL
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem.'));
      reader.onload = () => {
        const fallbackImg = new Image();
        fallbackImg.onload = () => resolve(fallbackImg);
        fallbackImg.onerror = () => reject(new Error('Navegador não conseguiu decodificar a imagem.'));
        fallbackImg.src = reader.result;
      };
      reader.readAsDataURL(file);
    };

    img.src = url;
  });
}

/**
 * Tenta carregar o arquivo usando createImageBitmap (suportado no Safari 15+, Chrome, Firefox).
 * @param {File} file
 * @returns {Promise<ImageBitmap>}
 */
async function carregarImageBitmap(file) {
  if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
    return await createImageBitmap(file);
  }
  throw new Error('createImageBitmap não suportado neste navegador.');
}

/**
 * Comprime e converte qualquer imagem para JPEG otimizado.
 *
 * @param {File} file Arquivo de entrada vindo do <input type="file">
 * @param {Object} [opcoes]
 * @param {number} [opcoes.maxWidth=1200] Largura máxima em pixels
 * @param {number} [opcoes.maxHeight=1200] Altura máxima em pixels
 * @param {number} [opcoes.qualidade=0.7] Qualidade JPEG (0 a 1)
 * @param {string} [opcoes.formatoSaida='image/jpeg'] Formato de saída
 * @returns {Promise<{
 *   base64: string,
 *   tamanhoOriginal: number,
 *   tamanhoFinal: number,
 *   textoOriginal: string,
 *   textoFinal: string,
 *   economia: number,
 *   resumo: string,
 *   largura: number,
 *   altura: number,
 *   formatoDetectado: string,
 *   isHeic: boolean,
 *   eraPequena: boolean
 * }>}
 */
export async function comprimirImagem(file, opcoes = {}) {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    qualidade = 0.7,
    formatoSaida = 'image/jpeg',
  } = opcoes;

  if (!file) {
    throw new Error('Nenhum arquivo informado para compressão.');
  }

  const tamanhoOriginal = file.size || 0;
  const textoOriginal = formatarBytes(tamanhoOriginal);
  const formatoDetectado = detectarFormato(file);
  const isHeic = isHeicFile(file);

  // Log de auditoria
  console.log(`[imageCompression] Formato detectado: ${formatoDetectado} (${textoOriginal})`);

  let source = null;
  let isBitmap = false;

  // 1. Tentar carregar pelo elemento Image convencional
  try {
    source = await carregarElementoImagem(file);
  } catch (errImg) {
    console.warn('[imageCompression] Carregamento convencional falhou, tentando createImageBitmap...', errImg);
    // 2. Fallback para createImageBitmap (moderno)
    try {
      source = await carregarImageBitmap(file);
      isBitmap = true;
    } catch (errBitmap) {
      console.error('[imageCompression] Todas as tentativas nativas de decodificação falharam:', errBitmap);
      if (isHeic) {
        throw new Error(
          'Este aparelho gravou a foto em formato HEIC que o navegador não conseguiu decodificar diretamente. Por favor, tire uma nova foto diretamente pelo botão da câmera do aplicativo ou use uma foto JPG/PNG.'
        );
      }
      throw new Error('Não foi possível processar esta imagem. Tente tirar outra foto.');
    }
  }

  // 3. Obter dimensões originais
  const origWidth = source.width;
  const origHeight = source.height;

  // 4. Calcular novas dimensões preservando a proporção de aspecto
  let newWidth = origWidth;
  let newHeight = origHeight;

  if (newWidth > maxWidth || newHeight > maxHeight) {
    const ratio = Math.min(maxWidth / newWidth, maxHeight / newHeight);
    newWidth = Math.round(newWidth * ratio);
    newHeight = Math.round(newHeight * ratio);
  }

  // 5. Desenhar no Canvas HTML5 com fundo branco
  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  const ctx = canvas.getContext('2d', { alpha: false });

  // Fundo branco sólido (essencial para converter PNG com transparência para JPEG)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, newWidth, newHeight);

  // Renderizar a imagem redimensionada
  ctx.drawImage(source, 0, 0, newWidth, newHeight);

  // Se foi usado ImageBitmap, liberar a memória imediatamente
  if (isBitmap && source.close) {
    source.close();
  }

  // 6. Exportar em JPEG com a taxa de qualidade solicitada
  const base64 = canvas.toDataURL(formatoSaida, qualidade);

  // 7. Calcular tamanho final real da imagem gerada em bytes
  // Base64 tem overhead de ~4/3 em relação ao binário original
  const base64Length = base64.length - (base64.indexOf(',') + 1);
  const tamanhoFinal = Math.round((base64Length * 3) / 4);
  const textoFinal = formatarBytes(tamanhoFinal);

  // Calcular porcentagem economizada
  let economia = 0;
  if (tamanhoOriginal > 0 && tamanhoFinal < tamanhoOriginal) {
    economia = Math.round(((tamanhoOriginal - tamanhoFinal) / tamanhoOriginal) * 100);
  }

  const eraPequena = tamanhoOriginal > 0 && tamanhoOriginal < 300 * 1024; // < 300 KB

  if (isHeic) {
    console.log('[imageCompression] Convertido HEIC → JPEG');
  }

  const resumo = `${textoOriginal} → ${textoFinal}${economia > 0 ? ` (economia de ${economia}%)` : ''}`;
  console.log(`[imageCompression] Concluído: ${resumo} [${newWidth}x${newHeight}px]`);

  return {
    base64,
    tamanhoOriginal,
    tamanhoFinal,
    textoOriginal,
    textoFinal,
    economia,
    resumo,
    largura: newWidth,
    altura: newHeight,
    formatoDetectado,
    isHeic,
    eraPequena,
  };
}

export default comprimirImagem;
