import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { FiEdit2, FiRotateCcw } from 'react-icons/fi';
import Button from '../Button/Button';
import styles from './SignaturePad.module.css';

/**
 * Campo de assinatura em canvas.
 * - Funciona com dedo (touch), mouse e caneta (Pointer Events)
 * - Nítido em telas retina (ajusta pelo devicePixelRatio)
 * - Mantém o desenho ao redimensionar/girar a tela
 * - Chama onChange(base64 PNG) ao terminar cada traço, ou onChange(null) ao limpar
 *
 * Ref expõe: clear(), isEmpty(), toDataURL()
 */
const SignaturePad = forwardRef(function SignaturePad(
  { label = 'Assinatura', required = false, signerName, error, onChange, height = 200 },
  ref
) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const emptyRef = useRef(true);
  const [isEmpty, setIsEmpty] = useState(true);

  const getCtx = () => canvasRef.current.getContext('2d');

  const applyStroke = (ctx) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#0f172a';
  };

  /** Ajusta a resolução interna do canvas ao tamanho real na tela */
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (canvas.width === w && canvas.height === h) return;

    // Guarda o desenho atual para redesenhar após o resize
    const previous = !emptyRef.current ? canvas.toDataURL() : null;

    canvas.width = w;
    canvas.height = h;
    const ctx = getCtx();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    applyStroke(ctx);

    if (previous) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = previous;
    }
  }, []);

  useEffect(() => {
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [resize]);

  /** Exporta com fundo branco em JPEG 0.85 (ultra-leve e legível em qualquer visualizador) */
  const toDataURL = useCallback(() => {
    const canvas = canvasRef.current;
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, 0, 0);
    return out.toDataURL('image/jpeg', 0.85);
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = getCtx();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    emptyRef.current = true;
    setIsEmpty(true);
    onChange?.(null);
  }, [onChange]);

  useImperativeHandle(ref, () => ({ clear, toDataURL, isEmpty: () => emptyRef.current }), [clear, toDataURL]);

  // ---------- Desenho ----------
  const getPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    const p = getPoint(e);
    lastPointRef.current = p;

    // Desenha um ponto (permite "pingos" na assinatura)
    const ctx = getCtx();
    ctx.beginPath();
    ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();

    if (emptyRef.current) {
      emptyRef.current = false;
      setIsEmpty(false);
    }
  };

  const handlePointerMove = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = getCtx();
    // getCoalescedEvents deixa o traço mais suave em telas touch
    const events = e.nativeEvent.getCoalescedEvents ? e.nativeEvent.getCoalescedEvents() : [e];
    const list = events.length ? events : [e];
    for (const ev of list) {
      const p = getPoint(ev);
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      lastPointRef.current = p;
    }
  };

  const handlePointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    onChange?.(toDataURL());
  };

  return (
    <div className={styles.field}>
      {label && (
        <span className={styles.label}>
          {label}
          {required && <span className={styles.req}> *</span>}
        </span>
      )}

      <div className={`${styles.pad} ${error ? styles.hasError : ''} ${!isEmpty ? styles.signed : ''}`}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          style={{ height }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          aria-label="Área de assinatura"
          role="img"
        />
        <div className={styles.line} aria-hidden="true" />
        {isEmpty && (
          <div className={styles.placeholder} aria-hidden="true">
            <FiEdit2 /> Assine aqui com o dedo ou mouse
          </div>
        )}
      </div>

      <div className={styles.bar}>
        <span className={styles.signer}>{signerName ? `Assinatura de ${signerName}` : 'Selecione o colaborador'}</span>
        <Button variant="ghost" size="sm" icon={<FiRotateCcw />} onClick={clear} disabled={isEmpty}>
          Limpar
        </Button>
      </div>

      {error && (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
});

export default SignaturePad;
