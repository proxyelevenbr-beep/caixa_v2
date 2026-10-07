import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiDollarSign,
  FiFileText,
  FiMinus,
  FiPlus,
  FiRotateCcw,
  FiSave,
  FiStar,
  FiUser
} from 'react-icons/fi';

import Button from '../../components/Button/Button';
import Card from '../../components/Card/Card';
import Input from '../../components/Input/Input';
import PhotoUpload from '../../components/PhotoUpload/PhotoUpload';
import SignaturePad from '../../components/SignaturePad/SignaturePad';
import { useToast } from '../../components/Toast/Toast';
import { COLABORADORES, DIVERGENCIA } from '../../config';
import { useAuth } from '../../hooks/useAuth';
import { criarFechamento, listarFechamentos } from '../../services/fechamentoService';
import { formatCurrency } from '../../utils/formatCurrency';
import { todayISO } from '../../utils/formatDate';
import { findColaborador, findLider, onlyDigits, validarFechamento } from '../../utils/validators';
import styles from './NovoFechamento.module.css';

/** Estado inicial do formulário */
const initialForm = () => ({
  data: todayISO(),
  colaboradorMatricula: '',
  valorDinheiro: null,
  divergenciaTipo: DIVERGENCIA.NENHUMA,
  divergenciaValor: null,
  valeTroca: null,
  valorFechamentoX: null,
  fotoCupom: null,
  assinatura: null,
  observacoes: '',
});

/** Ordem dos campos na tela (para rolar até o primeiro erro) */
const FIELD_ORDER = [
  'data',
  'colaboradorMatricula',
  'valorDinheiro',
  'valorFechamentoX',
  'divergenciaValor',
  'fotoCupom',
  'assinatura',
];

const DIVERGENCIA_OPCOES = [
  { value: DIVERGENCIA.NENHUMA, label: 'Sem divergência', Icon: FiCheck },
  { value: DIVERGENCIA.SOBRA, label: 'Sobra', Icon: FiPlus },
  { value: DIVERGENCIA.FALTA, label: 'Falta', Icon: FiMinus },
];

/** Relógio que atualiza a cada segundo (mostra data/hora do registro) */
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function NovoFechamento() {
  const { user } = useAuth();
  const toast = useToast();
  const now = useClock();
  const signatureRef = useRef(null);

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [frequencia, setFrequencia] = useState({});
  const LIMITE_INICIAL = 2; // Exibe apenas os 2 que mais fecham caixa

  // Carrega frequência histórica para ranquear os que mais fecham o caixa
  useEffect(() => {
    async function carregarFrequencia() {
      try {
        const historico = await listarFechamentos();
        const contagem = {};
        historico.forEach((reg) => {
          const mat = reg.colaboradorMatricula;
          if (mat) contagem[mat] = (contagem[mat] || 0) + 1;
        });
        setFrequencia(contagem);
      } catch {
        // Fallback silencioso
      }
    }
    carregarFrequencia();
  }, []);

  // Ordena os colaboradores colocando os que mais fecham caixa no topo
  const colaboradoresOrdenados = useMemo(() => {
    return [...COLABORADORES].sort((a, b) => {
      const qtdA = frequencia[a.matricula] || 0;
      const qtdB = frequencia[b.matricula] || 0;
      if (qtdB !== qtdA) {
        return qtdB - qtdA; // Maior frequência primeiro
      }
      return 0; // Mantém ordem original se empatar
    });
  }, [frequencia]);

  // Busca do colaborador selecionado (lista oficial de quem fecha caixa)
  const colaborador = findColaborador(form.colaboradorMatricula);

  // Lista com recolhimento para não poluir a tela (apenas o top 2 recomendado)
  const colaboradoresExibidos = useMemo(() => {
    if (mostrarTodos) return colaboradoresOrdenados;
    const iniciais = colaboradoresOrdenados.slice(0, LIMITE_INICIAL);
    // Se o colaborador selecionado não estiver no top 2, mantém ele visível no formulário
    if (colaborador && !iniciais.some((c) => c.matricula === colaborador.matricula)) {
      return [...iniciais, colaborador];
    }
    return iniciais;
  }, [mostrarTodos, colaboradoresOrdenados, colaborador]);

  // Verifica se digitou a matrícula de um líder que NÃO é colaborador
  const liderInvalido = !colaborador && form.colaboradorMatricula
    ? findLider(form.colaboradorMatricula)
    : null;

  /** Atualiza um campo e limpa o erro dele */
  const update = useCallback((field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => {
      if (!e[field]) return e;
      const next = { ...e };
      delete next[field];
      return next;
    });
  }, []);

  const handleDivergencia = (tipo) => {
    setForm((f) => ({
      ...f,
      divergenciaTipo: tipo,
      divergenciaValor: tipo === DIVERGENCIA.NENHUMA ? null : f.divergenciaValor,
    }));
    setErrors((e) => ({ ...e, divergenciaValor: undefined }));
  };

  const handleAssinatura = useCallback((base64) => update('assinatura', base64), [update]);

  const resetForm = () => {
    setForm(initialForm());
    setErrors({});
    signatureRef.current?.clear();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1) Validação
    const errs = validarFechamento(form);
    setErrors(errs);
    const campos = FIELD_ORDER.filter((k) => errs[k]);
    if (campos.length) {
      toast.error(campos.length === 1 ? 'Corrija o campo destacado.' : `Corrija os ${campos.length} campos destacados.`);
      document.querySelector(`[data-field="${campos[0]}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 2) Salvar
    setSaving(true);
    try {
      const registro = await criarFechamento(form, user);
      if (registro._pendente) {
        toast.warning(
          `Salvo localmente (offline). Será enviado à nuvem quando a conexão retornar.`
        );
      } else {
        toast.success(
          `Fechamento de ${registro.colaboradorNome} salvo na nuvem! Dinheiro: ${formatCurrency(registro.valorDinheiro)}`
        );
      }
      setFrequencia((prev) => ({
        ...prev,
        [registro.colaboradorMatricula]: (prev[registro.colaboradorMatricula] || 0) + 1,
      }));
      resetForm();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast.error(err.message || 'Não foi possível salvar o fechamento.');
    } finally {
      setSaving(false);
    }
  };

  const tipoDiv = form.divergenciaTipo;

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Novo Fechamento</h2>
          <p>Preencha os dados do fechamento do colaborador.</p>
        </div>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate autoComplete="off">
        {/* ---------- Colaborador ---------- */}
        <Card title="Colaborador" icon={<FiUser />}>
          <div className={styles.grid3}>
            <div data-field="data">
              <Input
                label="Data"
                type="date"
                required
                value={form.data}
                max={todayISO()}
                onChange={(e) => update('data', e.target.value)}
                error={errors.data}
              />
            </div>
            <div data-field="colaboradorMatricula">
              <Input
                label="Matrícula do colaborador"
                required
                inputMode="numeric"
                placeholder="Ex.: 105696"
                value={form.colaboradorMatricula}
                onChange={(e) => update('colaboradorMatricula', onlyDigits(e.target.value))}
                error={
                  errors.colaboradorMatricula ||
                  (liderInvalido
                    ? `Matrícula do líder ${liderInvalido.nome}. Apenas colaboradores fecham caixa.`
                    : undefined)
                }
                success={!!colaborador}
              />
            </div>
            <Input
              label="Nome do colaborador"
              value={colaborador?.nome || ''}
              placeholder="Preenchido automaticamente"
              readOnly
              tabIndex={-1}
              success={!!colaborador}
            />
          </div>

          {/* Seleção Rápida: Top 2 recomendados (mais frequentes) com opção Ver todos */}
          <div className={styles.quick}>
            <div className={styles.quickHeader}>
              <span className={styles.quickLabel}>
                <FiStar className={styles.starIcon} /> Recomendados rápidos (mais frequentes):
              </span>
              <button
                type="button"
                className={styles.toggleMoreBtn}
                onClick={() => setMostrarTodos((prev) => !prev)}
              >
                {mostrarTodos ? (
                  <>
                    <FiChevronUp /> Ver menos
                  </>
                ) : (
                  <>
                    <FiChevronDown /> Ver todos ({COLABORADORES.length})
                  </>
                )}
              </button>
            </div>
            <div className={styles.chips}>
              {colaboradoresExibidos.map((c) => {
                const totalFech = frequencia[c.matricula] || 0;
                const isDestaque = totalFech > 0;

                return (
                  <button
                    key={c.matricula}
                    type="button"
                    className={`${styles.chip} ${form.colaboradorMatricula === c.matricula ? styles.chipActive : ''}`}
                    onClick={() => update('colaboradorMatricula', c.matricula)}
                    title={`${c.nome} (Matrícula: ${c.matricula}) ${isDestaque ? `· ${totalFech} fechamento(s)` : ''}`}
                  >
                    {isDestaque && <span className={styles.topBadge} title="Frequente">⭐</span>}
                    <span className={styles.chipName}>{c.nome}</span>
                    <small className={styles.chipMat}>{c.matricula}</small>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* ---------- Valores ---------- */}
        <Card title="Valores" icon={<FiDollarSign />}>
          <div className={styles.grid2}>
            <div data-field="valorDinheiro">
              <Input
                label="Valor em dinheiro"
                required
                mask="currency"
                size="lg"
                value={form.valorDinheiro}
                onValueChange={(v) => update('valorDinheiro', v)}
                error={errors.valorDinheiro}
                hint="✅ Único valor somado no depósito."
              />
            </div>
            <div data-field="valorFechamentoX">
              <Input
                label="Valor do fechamento X"
                required
                mask="currency"
                size="lg"
                value={form.valorFechamentoX}
                onValueChange={(v) => update('valorFechamentoX', v)}
                error={errors.valorFechamentoX}
              />
            </div>
            <Input
              label="Vale-troca"
              optional
              mask="currency"
              value={form.valeTroca}
              onValueChange={(v) => update('valeTroca', v)}
            />
          </div>

          {/* Divergência */}
          <fieldset className={styles.divergencia}>
            <legend className={styles.legend}>
              Divergência <span className={styles.req}>*</span>
            </legend>
            <div className={styles.radioGroup} role="radiogroup">
              {DIVERGENCIA_OPCOES.map(({ value, label, Icon }) => (
                <label key={value} className={`${styles.radio} ${styles[`radio_${value}`]} ${tipoDiv === value ? styles.radioChecked : ''}`}>
                  <input
                    type="radio"
                    name="divergencia"
                    value={value}
                    checked={tipoDiv === value}
                    onChange={() => handleDivergencia(value)}
                  />
                  <span className={styles.radioIcon}>
                    <Icon />
                  </span>
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {tipoDiv !== DIVERGENCIA.NENHUMA && (
            <div className={`${styles.reveal} ${styles[`reveal_${tipoDiv}`]}`} data-field="divergenciaValor">
              <Input
                key={tipoDiv}
                label={`Valor da ${tipoDiv}`}
                required
                mask="currency"
                value={form.divergenciaValor}
                onValueChange={(v) => update('divergenciaValor', v)}
                error={errors.divergenciaValor}
                hint="Informativo — não entra na soma do depósito."
                autoFocus
              />
            </div>
          )}
        </Card>

        {/* ---------- Foto do cupom ---------- */}
        <Card title="Foto do cupom X" icon={<span>📷</span>}>
          <div data-field="fotoCupom">
            <PhotoUpload
              label={null}
              required
              value={form.fotoCupom}
              onChange={(v) => update('fotoCupom', v)}
              error={errors.fotoCupom}
            />
          </div>
        </Card>

        {/* ---------- Assinatura ---------- */}
        <Card title="Assinatura do colaborador" icon={<span>✍️</span>}>
          <div data-field="assinatura">
            <SignaturePad
              ref={signatureRef}
              label={null}
              required
              signerName={colaborador?.nome}
              onChange={handleAssinatura}
              error={errors.assinatura}
            />
          </div>
        </Card>

        {/* ---------- Observações ---------- */}
        <Card title="Observações" icon={<FiFileText />}>
          <Input
            as="textarea"
            placeholder="Alguma observação sobre este fechamento..."
            value={form.observacoes}
            onChange={(e) => update('observacoes', e.target.value)}
            maxLength={1000}
            hint={`${form.observacoes.length}/1000`}
          />

          <div className={styles.meta}>
            <span>
              <FiUser /> Registrado por: <b>{user?.nome} ({user?.matricula})</b>
            </span>
            <span>
              <FiClock /> Data/hora: <b>{now.toLocaleString('pt-BR')}</b>
            </span>
          </div>
        </Card>

        {/* ---------- Ações ---------- */}
        <div className={styles.actions}>
          <Button variant="ghost" size="lg" icon={<FiRotateCcw />} onClick={resetForm} className={styles.btnClear}>
            Limpar
          </Button>
          <Button type="submit" variant="success" size="lg" icon={<FiSave />} loading={saving} className={styles.btnSave}>
            Salvar Fechamento
          </Button>
        </div>
      </form>
    </>
  );
}
