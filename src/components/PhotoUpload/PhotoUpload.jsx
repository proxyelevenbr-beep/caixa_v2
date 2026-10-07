import { useRef, useState } from 'react';
import { FiCamera, FiCheckCircle, FiImage, FiInfo, FiTrash2, FiZoomIn } from 'react-icons/fi';
import Button from '../Button/Button';
import { Lightbox } from '../Modal/Modal';
import { comprimirImagem } from '../../utils/imageCompression';
import styles from './PhotoUpload.module.css';

/**
 * Upload de foto do cupom X com compressão automática:
 * - Compatível com fotos HEIC (iPhone), JPEG, PNG e WEBP
 * - Converte tudo para JPEG leve mantendo alta legibilidade
 * - Exibe indicador da taxa de economia alcançada
 */
export default function PhotoUpload({ label = 'Foto', required = false, value, onChange, error }) {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [zoom, setZoom] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // Permite selecionar o mesmo arquivo novamente
    if (!file) return;

    setLocalError('');
    setLoading(true);
    setCompressionInfo(null);

    try {
      const resultado = await comprimirImagem(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        qualidade: 0.7,
        formatoSaida: 'image/jpeg',
      });

      setCompressionInfo({
        resumo: resultado.resumo,
        eraPequena: resultado.eraPequena,
        formato: resultado.formatoDetectado,
        economia: resultado.economia,
      });

      onChange?.(resultado.base64);
    } catch (err) {
      console.error('[PhotoUpload] Erro ao comprimir imagem:', err);
      setLocalError(err.message || 'Erro ao processar a foto. Tente tirar outra foto.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setCompressionInfo(null);
    setLocalError('');
    onChange?.(null);
  };

  const shownError = localError || error;

  return (
    <div className={styles.field}>
      {label && (
        <span className={styles.label}>
          {label}
          {required && <span className={styles.req}> *</span>}
        </span>
      )}

      <div className={`${styles.box} ${shownError ? styles.hasError : ''} ${value ? styles.filled : ''}`}>
        {value ? (
          <div className={styles.previewContainer}>
            <button
              type="button"
              className={styles.preview}
              onClick={() => setZoom(true)}
              title="Toque para ampliar o cupom"
            >
              <img src={value} alt="Prévia do cupom X" />
              <span className={styles.zoomHint}>
                <FiZoomIn /> Ampliar
              </span>
            </button>

            {/* Informações da compressão */}
            {compressionInfo && (
              <div className={styles.compressionBanner}>
                <FiCheckCircle className={styles.compressionIcon} />
                <div className={styles.compressionText}>
                  <strong>{compressionInfo.resumo}</strong>
                  {compressionInfo.eraPequena && (
                    <span className={styles.smallNote}>
                      <FiInfo /> Imagem original já era compacta, mantida com alta fidelidade.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              {loading ? (
                <div className={styles.spinner} />
              ) : (
                '🧾'
              )}
            </div>
            <p>{loading ? 'Comprimindo imagem...' : 'Nenhuma foto adicionada'}</p>
            <small>
              {loading
                ? 'Convertendo e otimizando para envio rápido...'
                : 'Tire uma foto nítida do cupom X (suporta iPhone HEIC, JPG, PNG)'}
            </small>
          </div>
        )}

        <div className={styles.actions}>
          <Button
            variant="primary"
            icon={<FiCamera />}
            onClick={() => cameraRef.current?.click()}
            loading={loading}
          >
            {value ? 'Tirar outra' : 'Tirar foto'}
          </Button>
          <Button
            variant="ghost"
            icon={<FiImage />}
            onClick={() => galleryRef.current?.click()}
            disabled={loading}
          >
            Galeria
          </Button>
          {value && (
            <Button
              variant="dangerSoft"
              icon={<FiTrash2 />}
              onClick={handleRemove}
              disabled={loading}
            >
              Remover
            </Button>
          )}
        </div>

        {/* Inputs de arquivo — aceitam qualquer imagem (incluindo HEIC da câmera do iPhone) */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={handleFile}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleFile}
        />
      </div>

      {shownError && (
        <span className={styles.error} role="alert">
          {shownError}
        </span>
      )}

      <Lightbox src={zoom ? value : null} alt="Cupom X ampliado" onClose={() => setZoom(false)} />
    </div>
  );
}
