/**
 * fechamentoService.js
 *
 * Camada unificada de dados para Fechamento de Caixa:
 * - Persistência primária no Supabase (Nuvem).
 * - Fallback automático em localStorage quando offline ou não configurado.
 * - Sincronização automática de lançamentos pendentes quando a rede retorna.
 * - Suporte completo ao cálculo de depósito e Fechamento X diário.
 */

import { DIVERGENCIA, STORAGE_KEYS } from '../config';
import { sumCurrency } from '../utils/formatCurrency';
import { findColaborador } from '../utils/validators';
import storage from './storageService';
import { isSupabaseConfigured, supabase } from './supabase';
import { uploadAssinatura, uploadFotoCupom } from './uploadService';

const KEY = STORAGE_KEYS.REGISTROS;

// ----------------------------------------------------
// Monitoramento do Status de Conexão ('online' | 'offline')
// ----------------------------------------------------
let connectionStatus = isSupabaseConfigured() ? 'online' : 'offline';
const statusListeners = new Set();

export function getConnectionStatus() {
  return connectionStatus;
}

export function subscribeConnectionStatus(listener) {
  statusListeners.add(listener);
  listener(connectionStatus);
  return () => statusListeners.delete(listener);
}

function setConnectionStatus(status) {
  if (connectionStatus !== status) {
    connectionStatus = status;
    statusListeners.forEach((fn) => fn(status));
  }
}

// ----------------------------------------------------
// Utilitários de ID e Ordenação
// ----------------------------------------------------
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function sortByRecent(list) {
  return [...list].sort(
    (a, b) =>
      b.data.localeCompare(a.data) ||
      (b.registradoEm || '').localeCompare(a.registradoEm || '')
  );
}

// ----------------------------------------------------
// Mapeamento entre Schema do Supabase e Modelo do App
// ----------------------------------------------------
export function rowToRegistro(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    data: row.data,
    colaboradorMatricula: row.matricula_colaborador,
    colaboradorNome: row.nome_colaborador,
    valorDinheiro: Number(row.valor_dinheiro || 0),
    divergenciaTipo:
      row.divergencia === 'sem'
        ? DIVERGENCIA.NENHUMA
        : row.divergencia || DIVERGENCIA.NENHUMA,
    divergenciaValor: Number(row.valor_divergencia || 0),
    valeTroca:
      row.vale_troca !== null && row.vale_troca !== undefined
        ? Number(row.vale_troca)
        : null,
    valorFechamentoX: Number(row.valor_fechamento_x || 0),
    fotoCupom: row.foto_cupom_url || null,
    assinatura: row.assinatura_url || null,
    observacoes: row.observacoes || '',
    registradoPorMatricula: row.registrado_por_matricula,
    registradoPorNome: row.registrado_por_nome,
    registradoEm: row.created_at || new Date().toISOString(),
    _pendente: false,
  };
}

export function registroToRow(reg, fotoUrl, assinaturaUrl) {
  return {
    data: reg.data,
    matricula_colaborador: reg.colaboradorMatricula,
    nome_colaborador: reg.colaboradorNome,
    valor_dinheiro: reg.valorDinheiro,
    divergencia:
      reg.divergenciaTipo === DIVERGENCIA.NENHUMA ? 'sem' : reg.divergenciaTipo,
    valor_divergencia: reg.divergenciaValor || 0,
    vale_troca: reg.valeTroca ?? null,
    valor_fechamento_x: reg.valorFechamentoX,
    foto_cupom_url: fotoUrl ?? reg.fotoCupom ?? null,
    assinatura_url: assinaturaUrl ?? reg.assinatura ?? null,
    observacoes: reg.observacoes || '',
    registrado_por_matricula: reg.registradoPorMatricula,
    registrado_por_nome: reg.registradoPorNome,
  };
}

// ----------------------------------------------------
// Acesso ao Armazenamento Local (Cache / Fallback Offline)
// ----------------------------------------------------
function readLocal() {
  const data = storage.get(KEY, []);
  return Array.isArray(data) ? data : [];
}

function writeLocal(list) {
  storage.set(KEY, list);
}

// ----------------------------------------------------
// CRUD e Consultas
// ----------------------------------------------------

/**
 * Lista todos os fechamentos cadastrados:
 * 1. Tenta buscar do Supabase se configurado.
 * 2. Em caso de sucesso: atualiza o cache local e mescla eventuais registros pendentes offline.
 * 3. Em caso de falha de conexão: retorna os dados do localStorage.
 */
export async function listarFechamentos() {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('fechamentos')
        .select('*')
        .order('data', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setConnectionStatus('online');

      const remotos = (data || []).map(rowToRegistro);

      // Pega registros locais que estão pendentes de sincronização
      const locais = readLocal();
      const pendentes = locais.filter((r) => r._pendente);

      // Mescla remotos com pendentes locais (evita duplicar)
      const idsRemotos = new Set(remotos.map((r) => r.id));
      const pendentesNaoSalvos = pendentes.filter((p) => !idsRemotos.has(p.id));

      const listaCompleta = sortByRecent([...pendentesNaoSalvos, ...remotos]);

      // Atualiza o cache local mantendo os pendentes
      writeLocal(listaCompleta);

      return listaCompleta;
    } catch (err) {
      console.warn('[fechamentoService] Erro ao buscar do Supabase, usando cache local:', err.message);
      setConnectionStatus('offline');
    }
  } else {
    setConnectionStatus('offline');
  }

  // Fallback offline (localStorage)
  return sortByRecent(readLocal());
}

/**
 * Cria um novo fechamento de caixa:
 * 1. Prepara o objeto com dados do formulário e usuário autenticado.
 * 2. Se houver conexão com o Supabase:
 *    - Faz upload das imagens (foto do cupom e assinatura) nos buckets do Storage.
 *    - Insere o registro na tabela "fechamentos".
 * 3. Se falhar ou estiver offline:
 *    - Salva no localStorage com a flag `_pendente: true` e preserva os base64 originais.
 */
export async function criarFechamento(form, usuario) {
  const colaborador = findColaborador(form.colaboradorMatricula);
  const temDivergencia = form.divergenciaTipo !== DIVERGENCIA.NENHUMA;

  const novoRegistro = {
    id: generateId(),
    data: form.data,
    colaboradorMatricula: colaborador.matricula,
    colaboradorNome: colaborador.nome,
    valorDinheiro: form.valorDinheiro,
    divergenciaTipo: form.divergenciaTipo,
    divergenciaValor: temDivergencia ? form.divergenciaValor : 0,
    valeTroca: form.valeTroca ?? null,
    valorFechamentoX: form.valorFechamentoX,
    fotoCupom: form.fotoCupom, // base64 inicial
    assinatura: form.assinatura, // base64 inicial
    observacoes: (form.observacoes || '').trim(),
    registradoPorMatricula: usuario.matricula,
    registradoPorNome: usuario.nome,
    registradoEm: new Date().toISOString(),
    _pendente: false,
  };

  // Tenta salvar no Supabase se configurado
  if (isSupabaseConfigured() && supabase) {
    try {
      // 1. Upload dos arquivos para o Storage (se houver imagens)
      let fotoUrl = null;
      let assinaturaUrl = null;

      if (form.fotoCupom) {
        fotoUrl = await uploadFotoCupom(form.fotoCupom, colaborador.matricula);
      }
      if (form.assinatura) {
        assinaturaUrl = await uploadAssinatura(form.assinatura, colaborador.matricula);
      }

      // 2. Insere registro na tabela "fechamentos"
      const payload = registroToRow(novoRegistro, fotoUrl, assinaturaUrl);

      const { data, error } = await supabase
        .from('fechamentos')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      setConnectionStatus('online');

      const registroSalvo = rowToRegistro(data);

      // Salva no cache local
      const lista = readLocal().filter((r) => r.id !== novoRegistro.id);
      lista.unshift(registroSalvo);
      writeLocal(lista);

      return registroSalvo;
    } catch (err) {
      console.warn('[fechamentoService] Falha ao salvar no Supabase, salvando offline:', err.message);
      setConnectionStatus('offline');
    }
  } else {
    setConnectionStatus('offline');
  }

  // Fallback offline: marca como pendente e armazena localmente
  novoRegistro._pendente = true;
  const lista = readLocal();
  lista.unshift(novoRegistro);
  writeLocal(lista);

  return novoRegistro;
}

/**
 * Exclui um fechamento pelo ID
 */
export async function excluirFechamento(id) {
  // Exclui do cache local imediatamente
  const listaLocal = readLocal().filter((r) => r.id !== id);
  writeLocal(listaLocal);

  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from('fechamentos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setConnectionStatus('online');
    } catch (err) {
      console.warn('[fechamentoService] Erro ao excluir no Supabase:', err.message);
      setConnectionStatus('offline');
    }
  }
}

/**
 * Sincroniza registros pendentes que foram salvos em modo offline
 * @returns {Promise<{ sincronizados: number, falhas: number }>}
 */
export async function sincronizarPendentes() {
  if (!isSupabaseConfigured() || !supabase) {
    return { sincronizados: 0, falhas: 0 };
  }

  const locais = readLocal();
  const pendentes = locais.filter((r) => r._pendente);

  if (pendentes.length === 0) {
    return { sincronizados: 0, falhas: 0 };
  }

  let sincronizados = 0;
  let falhas = 0;
  const listaAtualizada = [...locais];

  for (const item of pendentes) {
    try {
      let fotoUrl = item.fotoCupom;
      let assinaturaUrl = item.assinatura;

      // Se ainda for base64, sobe pro Storage
      if (fotoUrl && fotoUrl.startsWith('data:')) {
        fotoUrl = await uploadFotoCupom(fotoUrl, item.colaboradorMatricula);
      }
      if (assinaturaUrl && assinaturaUrl.startsWith('data:')) {
        assinaturaUrl = await uploadAssinatura(assinaturaUrl, item.colaboradorMatricula);
      }

      const payload = registroToRow(item, fotoUrl, assinaturaUrl);

      const { data, error } = await supabase
        .from('fechamentos')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      // Atualiza o item local com o ID remoto e remove flag pendente
      const indice = listaAtualizada.findIndex((r) => r.id === item.id);
      if (indice !== -1) {
        listaAtualizada[indice] = rowToRegistro(data);
      }
      sincronizados++;
    } catch (err) {
      console.error('[fechamentoService] Falha ao sincronizar registro pendente:', err);
      falhas++;
    }
  }

  writeLocal(listaAtualizada);
  if (sincronizados > 0) {
    setConnectionStatus('online');
  }

  return { sincronizados, falhas };
}

// ----------------------------------------------------
// Filtros e Cálculos em Memória
// ----------------------------------------------------

/**
 * Filtra lista de fechamentos por período, colaborador e líder
 */
export function filtrarFechamentos(
  lista,
  { dataInicio, dataFim, colaborador, lider } = {}
) {
  return lista.filter(
    (r) =>
      (!dataInicio || r.data >= dataInicio) &&
      (!dataFim || r.data <= dataFim) &&
      (!colaborador || r.colaboradorMatricula === colaborador) &&
      (!lider || r.registradoPorMatricula === lider)
  );
}

/**
 * Agrupa fechamentos por dia com somas de Fechamento X, Dinheiro, Sobras e Faltas
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
 * REGRA ESTREITA: total do depósito = SOMENTE o campo "valorDinheiro".
 * Fechamento X, vale-troca, sobras e faltas NÃO entram na soma do depósito,
 * sendo exibidos para conferência analítica da loja.
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

export default {
  listarFechamentos,
  criarFechamento,
  excluirFechamento,
  sincronizarPendentes,
  filtrarFechamentos,
  agruparPorDia,
  calcularDeposito,
  sortByRecent,
  generateId,
  getConnectionStatus,
  subscribeConnectionStatus,
};
