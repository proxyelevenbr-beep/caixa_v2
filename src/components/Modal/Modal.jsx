import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import styles from './Modal.module.css';

/**
 * Hook interno: fecha com ESC (apenas o modal do topo) e trava o scroll do body.
 */
function useOverlay(open, onClose, ref) {
  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      // Só o overlay mais recente (topo da pilha) responde ao ESC
      const overlays = document.querySelectorAll('[data-overlay]');
      if (overlays[overlays.length - 1] === ref.current) onClose?.();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, ref]);
}

/**
 * Modal genérico (renderizado via portal no <body>).
 * Em telas pequenas vira um "bottom sheet".
 * @param {'sm'|'md'|'lg'} size
 */
export default function Modal({ open, onClose, title, footer, size = 'md', children }) {
  const ref = useRef(null);
  useOverlay(open, onClose, ref);

  if (!open) return null;

  return createPortal(
    <div
      ref={ref}
      data-overlay
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={`${styles.modal} ${styles[size]}`} role="dialog" aria-modal="true">
        <div className={styles.head}>
          <h3 className={styles.title}>{title}</h3>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
            <FiX />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.foot}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/**
 * Visualizador de imagem em tela cheia (foto do cupom / assinatura).
 * Clique em qualquer lugar ou ESC para fechar.
 */
export function Lightbox({ src, alt = 'Imagem ampliada', onClose }) {
  const ref = useRef(null);
  useOverlay(!!src, onClose, ref);

  if (!src) return null;

  return createPortal(
    <div ref={ref} data-overlay className={styles.lightbox} onClick={onClose}>
      <button type="button" className={styles.lightboxClose} aria-label="Fechar">
        <FiX />
      </button>
      <img src={src} alt={alt} />
    </div>,
    document.body
  );
}
