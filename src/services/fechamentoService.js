/**
 * fechamentoService — regras de negócio e persistência dos fechamentos.
 *
 * Fase 2 (Supabase): substituir o corpo de listar/criar/excluir por chamadas
 * ao Supabase (ex.: supabase.from('fechamentos').select()). As telas não mudam.
 */
import { DIVERGENCIA, STORAGE_KEYS } from '../config';
import { sumCurrency } from '../utils/formatCurrency';
import { findColaborador } from '../utils/validators';
import storage from './storageService';

const KEY = STORAGE_KEYS.REGISTROS;

/** ID único: timestamp + aleatório */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readAll() {
  const data = storage.get(KEY, []);
  return Array.isArray(data) ? data : [];
}

/** Mais recentes primeiro: data do fechamento desc, depois data/hora do registro desc */
export function sortByRecent(list) {
  return [...list].sort((a, b) => b.data.localeCompare(a.data) || b.registradoEm.localeCompare(a.registradoEm));
}

/** Lista todos os fechamentos (ordenados) */
export async function listarFechamentos() {
  return sortByRecent(readAll());
}

/**
 * Cria um fechamento a partir dos dados do formulário + líder logado.
 * @returns registro salvo
 */
export async function criarFechamento(form, usuario) {
  const colaborador = findColaborador(form.colaboradorMatricula);
  const temDivergencia = form.divergenciaTipo !== DIVERGENCIA.NENHUMA;

  const registro = {
    id: generateId(),
    data: form.data,
    colaboradorMatricula: colaborador.matricula,
    colaboradorNome: colaborador.nome,
    valorDinheiro: form.valorDinheiro,
    divergenciaTipo: form.divergenciaTipo, // 'nenhuma' | 'sobra' | 'falta'
    divergenciaValor: temDivergencia ? form.divergenciaValor : 0,
    valeTroca: form.valeTroca ?? null, // opcional
    valorFechamentoX: form.valorFechamentoX,
    fotoCupom: form.fotoCupom, // base64 JPEG
    assinatura: form.assinatura, // base64 PNG
    observacoes: (form.observacoes || '').trim(),
    registradoPorMatricula: usuario.matricula,
    registradoPorNome: usuario.nome,
    registradoEm: new Date().toISOString(),
  };

  const lista = readAll();
  lista.push(registro);
  storage.set(KEY, lista); // lança StorageError se o armazenamento estiver cheio
  return registro;
}

/** Exclui um fechamento pelo ID */
export async function excluirFechamento(id) {
  storage.set(
    KEY,
    readAll().filter((r) => r.id !== id)
  );
}

/**
 * Filtra a lista (em memória).
 * @param {{dataInicio?:string, dataFim?:string, colaborador?:string, lider?:string}} filtros
 */
export function filtrarFechamentos(lista, { dataInicio, dataFim, colaborador, lider } = {}) {
  return lista.filter(
    (r) =>
      (!dataInicio || r.data >= dataInicio) &&
      (!dataFim || r.data <= dataFim) &&
      (!colaborador || r.colaboradorMatricula === colaborador) &&
      (!lider || r.registradoPorMatricula === lider)
  );
}

/**
 * Agrupa fechamentos por dia com somas de Fechamento X, Dinheiro, Sobras e Faltas.
 * @param {Array} registros Lista de fechamentos
 * @param {'asc'|'desc'} ordenacao Direção da ordenação das datas
 */
export function agruparPorDia(registros, ordenacao = 'desc') {
  const mapa = new Map();
  for (const r of registros) {
    if (!mapa.has(r.data)) mapa.set(r.data, []);
    mapa.get(r.data).push(r);
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => (ordenacao === 'asc' ? a.localeCompare(b) : b.localeCompare(a)))
    .map(([data, itens]) => ({
      data,
      itens,
      quantidade: itens.length,
      totalDinheiro: sumCurrency(itens, (r) => r.valorDinheiro),
      totalFechamentoX: sumCurrency(itens, (r) => r.valorFechamentoX),
      totalSobras: sumCurrency(
        itens.filter((r) => r.divergenciaTipo === DIVERGENCIA.SOBRA),
        (r) => r.divergenciaValor
      ),
      totalFaltas: sumCurrency(
        itens.filter((r) => r.divergenciaTipo === DIVERGENCIA.FALTA),
        (r) => r.divergenciaValor
      ),
      totalValeTroca: sumCurrency(itens, (r) => r.valeTroca || 0),
    }));
}

/**
 * Cálculo do depósito.
 * REGRA: total do depósito = SOMENTE o campo "valorDinheiro".
 * Vale-troca, fechamento X, sobras e faltas NÃO entram na soma do depósito
 * (são retornados para conferência e controle operacional).
 */
export function calcularDeposito(lista, dataInicio, dataFim) {
  const registros = filtrarFechamentos(lista, { dataInicio, dataFim });

  const sobras = registros.filter((r) => r.divergenciaTipo === DIVERGENCIA.SOBRA);
  const faltas = registros.filter((r) => r.divergenciaTipo === DIVERGENCIA.FALTA);

  const porDia = agruparPorDia(registros, 'asc');

  return {
    registros,
    quantidade: registros.length,
    totalDinheiro: sumCurrency(registros, (r) => r.valorDinheiro),
    totalFechamentoX: sumCurrency(registros, (r) => r.valorFechamentoX),
    totalSobras: sumCurrency(sobras, (r) => r.divergenciaValor),
    totalFaltas: sumCurrency(faltas, (r) => r.divergenciaValor),
    totalValeTroca: sumCurrency(registros, (r) => r.valeTroca || 0),
    qtdSobras: sobras.length,
    qtdFaltas: faltas.length,
    porDia,
  };
}

/** Espaço ocupado pelos registros (MB) — informativo */
export function espacoUtilizadoMB() {
  return storage.sizeOf(KEY) / (1024 * 1024);
}

const fechamentoService = {
  listarFechamentos,
  criarFechamento,
  excluirFechamento,
  filtrarFechamentos,
  agruparPorDia,
  calcularDeposito,
  sortByRecent,
  generateId,
  espacoUtilizadoMB,
};
export default fechamentoService;
