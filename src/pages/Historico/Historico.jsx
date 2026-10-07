import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiCalendar,
  FiClock,
  FiDollarSign,
  FiEye,
  FiFilter,
  FiInbox,
  FiList,
  FiTable,
  FiTrash2,
  FiUser,
  FiX
} from 'react-icons/fi';

import Button from '../../components/Button/Button';
import Card from '../../components/Card/Card';
import Input from '../../components/Input/Input';
import Modal, { Lightbox } from '../../components/Modal/Modal';
import { useToast } from '../../components/Toast/Toast';
import { COLABORADORES, DIVERGENCIA, LIDERANCA } from '../../config';
import {
  agruparPorDia,
  excluirFechamento,
  filtrarFechamentos,
  listarFechamentos
} from '../../services/fechamentoService';
import { formatCurrency, sumCurrency } from '../../utils/formatCurrency';
import {
  dayOf,
  formatDate,
  formatDateTime,
  monthShort,
  weekdayShort
} from '../../utils/formatDate';
import styles from './Historico.module.css';

export default function Historico() {
  const toast = useToast();

  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [colaborador, setColaborador] = useState('');
  const [lider, setLider] = useState('');

  // Modo de visualização: 'tabela' (consolidada por dia) ou 'cards' (por lançamento)
  const [visao, setVisao] = useState('tabela');

  // Modais
  const [detalheItem, setDetalheItem] = useState(null);
  const [itemParaExcluir, setItemParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      const dados = await listarFechamentos();
      setRegistros(dados);
    } catch {
      toast.error('Erro ao carregar histórico de fechamentos.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Lista filtrada
  const filtrados = useMemo(() => {
    return filtrarFechamentos(registros, {
      dataInicio,
      dataFim,
      colaborador,
      lider
    });
  }, [registros, dataInicio, dataFim, colaborador, lider]);

  // Totais do que está visível
  const totalDinheiro = useMemo(() => {
    return sumCurrency(filtrados, (r) => r.valorDinheiro);
  }, [filtrados]);

  const totalFechamentoX = useMemo(() => {
    return sumCurrency(filtrados, (r) => r.valorFechamentoX);
  }, [filtrados]);

  const qtdDivergencias = useMemo(() => {
    return filtrados.filter((r) => r.divergenciaTipo !== DIVERGENCIA.NENHUMA).length;
  }, [filtrados]);

  // Agrupado por dia com somas de Fechamento X e Dinheiro
  const porDia = useMemo(() => {
    return agruparPorDia(filtrados, 'desc');
  }, [filtrados]);

  const limparFiltros = () => {
    setDataInicio('');
    setDataFim('');
    setColaborador('');
    setLider('');
  };

  const temFiltroAtivo = !!(dataInicio || dataFim || colaborador || lider);

  // Exclusão
  const confirmarExclusao = async () => {
    if (!itemParaExcluir) return;
    try {
      setExcluindo(true);
      await excluirFechamento(itemParaExcluir.id);
      toast.success('Fechamento excluído com sucesso.');
      setItemParaExcluir(null);
      if (detalheItem?.id === itemParaExcluir.id) {
        setDetalheItem(null);
      }
      carregarDados();
    } catch {
      toast.error('Erro ao excluir fechamento.');
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Histórico de Fechamentos</h2>
          <p>Consulte, filtre e visualize os fechamentos salvos.</p>
        </div>
      </div>

      {/* Filtros */}
      <Card title="Filtros de Busca" icon={<FiFilter />}>
        <div className={styles.filterGrid}>
          <Input
            label="Data Início"
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
          <Input
            label="Data Fim"
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
          <Input
            as="select"
            label="Colaborador"
            value={colaborador}
            onChange={(e) => setColaborador(e.target.value)}
          >
            <option value="">Todos os colaboradores</option>
            {COLABORADORES.map((c) => (
              <option key={c.matricula} value={c.matricula}>
                {c.nome} ({c.matricula})
              </option>
            ))}
          </Input>
          <Input
            as="select"
            label="Registrado por"
            value={lider}
            onChange={(e) => setLider(e.target.value)}
          >
            <option value="">Todos os líderes</option>
            {LIDERANCA.map((l) => (
              <option key={l.matricula} value={l.matricula}>
                {l.nome} ({l.matricula})
              </option>
            ))}
          </Input>
        </div>

        {temFiltroAtivo && (
          <div className={styles.filterActions}>
            <Button variant="ghost" size="sm" icon={<FiX />} onClick={limparFiltros}>
              Limpar Filtros
            </Button>
          </div>
        )}
      </Card>

      {/* Cards de Resumo */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Fechamento X</span>
          <strong className={`${styles.statValue} text-primary tabular`}>
            {formatCurrency(totalFechamentoX)}
          </strong>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total em Dinheiro</span>
          <strong className={`${styles.statValue} text-success tabular`}>
            {formatCurrency(totalDinheiro)}
          </strong>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Fechamentos</span>
          <strong className={`${styles.statValue} tabular`}>{filtrados.length}</strong>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Com Divergência</span>
          <strong className={`${styles.statValue} tabular text-warning`}>
            {qtdDivergencias}
          </strong>
        </div>
      </div>

      {/* Alternador de Visualização */}
      <div className={styles.viewBar}>
        <span className={styles.viewTitle}>
          {visao === 'tabela' ? 'Tabela com Fechamento X por Dia' : 'Lançamentos Detalhados'} ({filtrados.length} registros)
        </span>
        <div className={styles.viewToggles}>
          <button
            type="button"
            className={`${styles.viewBtn} ${visao === 'tabela' ? styles.activeViewBtn : ''}`}
            onClick={() => setVisao('tabela')}
            title="Ver tabela com soma do Fechamento X de cada dia"
          >
            <FiTable /> Tabela por Dia
          </button>
          <button
            type="button"
            className={`${styles.viewBtn} ${visao === 'cards' ? styles.activeViewBtn : ''}`}
            onClick={() => setVisao('cards')}
            title="Ver lançamentos detalhados"
          >
            <FiList /> Por Lançamento
          </button>
        </div>
      </div>

      {/* Conteúdo: Tabela Diária ou Lista de Registros */}
      {loading ? (
        <div className={styles.empty}>
          <p>Carregando registros...</p>
        </div>
      ) : filtrados.length === 0 ? (
        <Card className={styles.emptyCard}>
          <div className={styles.emptyIcon}>
            <FiInbox />
          </div>
          <h3>Nenhum fechamento encontrado</h3>
          <p className="text-muted">
            {temFiltroAtivo
              ? 'Nenhum resultado para os filtros selecionados. Tente ajustar ou limpar os filtros.'
              : 'Ainda não há fechamentos registrados no sistema.'}
          </p>
          {temFiltroAtivo && (
            <Button variant="ghost" size="sm" onClick={limparFiltros} style={{ marginTop: 12 }}>
              Limpar Filtros
            </Button>
          )}
        </Card>
      ) : visao === 'tabela' ? (
        <Card>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Dia</th>
                  <th className={styles.textCenter}>Fechamentos</th>
                  <th className={styles.textRight}>Total Fechamento X</th>
                  <th className={styles.textRight}>Total Dinheiro</th>
                  <th className={styles.textRight}>Sobras</th>
                  <th className={styles.textRight}>Faltas</th>
                </tr>
              </thead>
              <tbody>
                {porDia.map((dia) => (
                  <tr key={dia.data}>
                    <td className={styles.fontBold}>{formatDate(dia.data)}</td>
                    <td className="text-muted">{weekdayShort(dia.data)}</td>
                    <td className={`${styles.textCenter} tabular`}>{dia.quantidade}</td>
                    <td className={`${styles.textRight} tabular ${styles.fontBold} text-primary`}>
                      {formatCurrency(dia.totalFechamentoX)}
                    </td>
                    <td className={`${styles.textRight} tabular ${styles.fontBold} text-success`}>
                      {formatCurrency(dia.totalDinheiro)}
                    </td>
                    <td className={`${styles.textRight} tabular ${dia.totalSobras > 0 ? 'text-warning' : 'text-muted'}`}>
                      {dia.totalSobras > 0 ? formatCurrency(dia.totalSobras) : '—'}
                    </td>
                    <td className={`${styles.textRight} tabular ${dia.totalFaltas > 0 ? 'text-danger' : 'text-muted'}`}>
                      {dia.totalFaltas > 0 ? formatCurrency(dia.totalFaltas) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>
                    <b>Total Geral ({porDia.length} dias)</b>
                  </td>
                  <td className={`${styles.textCenter} tabular`}>
                    <b>{filtrados.length}</b>
                  </td>
                  <td className={`${styles.textRight} tabular text-primary`}>
                    <b style={{ fontSize: 16 }}>{formatCurrency(totalFechamentoX)}</b>
                  </td>
                  <td className={`${styles.textRight} tabular text-success`}>
                    <b style={{ fontSize: 16 }}>{formatCurrency(totalDinheiro)}</b>
                  </td>
                  <td className={`${styles.textRight} tabular text-warning`}>
                    <b>
                      {sumCurrency(
                        filtrados.filter((r) => r.divergenciaTipo === DIVERGENCIA.SOBRA),
                        (r) => r.divergenciaValor
                      ) > 0
                        ? formatCurrency(
                            sumCurrency(
                              filtrados.filter((r) => r.divergenciaTipo === DIVERGENCIA.SOBRA),
                              (r) => r.divergenciaValor
                            )
                          )
                        : '—'}
                    </b>
                  </td>
                  <td className={`${styles.textRight} tabular text-danger`}>
                    <b>
                      {sumCurrency(
                        filtrados.filter((r) => r.divergenciaTipo === DIVERGENCIA.FALTA),
                        (r) => r.divergenciaValor
                      ) > 0
                        ? formatCurrency(
                            sumCurrency(
                              filtrados.filter((r) => r.divergenciaTipo === DIVERGENCIA.FALTA),
                              (r) => r.divergenciaValor
                            )
                          )
                        : '—'}
                    </b>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      ) : (
        <div className={styles.list}>
          {filtrados.map((item) => {
            const hasDiv = item.divergenciaTipo !== DIVERGENCIA.NENHUMA;
            const isSobra = item.divergenciaTipo === DIVERGENCIA.SOBRA;

            return (
              <article
                key={item.id}
                className={styles.recordItem}
                onClick={() => setDetalheItem(item)}
              >
                <div className={styles.recordDate}>
                  <span className={styles.recordDay}>{dayOf(item.data)}</span>
                  <span className={styles.recordMonth}>{monthShort(item.data)}</span>
                </div>

                <div className={styles.recordMain}>
                  <div className={styles.recordHeader}>
                    <strong className={styles.colabName}>{item.colaboradorNome}</strong>
                    <span className={styles.colabMat}>#{item.colaboradorMatricula}</span>
                    {hasDiv ? (
                      <span
                        className={`${styles.badge} ${
                          isSobra ? styles.badgeSobra : styles.badgeFalta
                        }`}
                      >
                        {isSobra ? '+' : '-'} {item.divergenciaTipo}:{' '}
                        {formatCurrency(item.divergenciaValor)}
                      </span>
                    ) : (
                      <span className={`${styles.badge} ${styles.badgeOk}`}>Sem divergência</span>
                    )}
                  </div>

                  <div className={styles.recordSub}>
                    <span>
                      <FiClock /> {formatDateTime(item.registradoEm)}
                    </span>
                    <span>
                      <FiUser /> Por: <b>{item.registradoPorNome}</b>
                    </span>
                  </div>

                  <div className={styles.recordValues}>
                    <span>
                      Fech. X: <b>{formatCurrency(item.valorFechamentoX)}</b>
                    </span>
                    {item.valeTroca !== null && item.valeTroca !== undefined && (
                      <span>
                        Vale-troca: <b>{formatCurrency(item.valeTroca)}</b>
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.recordRight}>
                  <div className={styles.cashBox}>
                    <span className={styles.cashLabel}>Dinheiro</span>
                    <strong className={`${styles.cashValue} tabular`}>
                      {formatCurrency(item.valorDinheiro)}
                    </strong>
                  </div>
                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      title="Ver detalhes"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetalheItem(item);
                      }}
                    >
                      <FiEye />
                    </button>
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.btnDelete}`}
                      title="Excluir"
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemParaExcluir(item);
                      }}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal de Detalhes Completos */}
      <Modal
        open={!!detalheItem}
        onClose={() => setDetalheItem(null)}
        title={`Detalhes · ${detalheItem?.colaboradorNome || ''}`}
        size="md"
        footer={
          <>
            <Button
              variant="dangerSoft"
              icon={<FiTrash2 />}
              onClick={() => setItemParaExcluir(detalheItem)}
            >
              Excluir
            </Button>
            <Button variant="primary" onClick={() => setDetalheItem(null)}>
              Fechar
            </Button>
          </>
        }
      >
        {detalheItem && (
          <div className={styles.detailsContent}>
            <div className={styles.detailGrid}>
              <div className={styles.detailCard}>
                <span className={styles.detailLabel}>Data do Fechamento</span>
                <strong>{formatDate(detalheItem.data)}</strong>
              </div>
              <div className={styles.detailCard}>
                <span className={styles.detailLabel}>Colaborador</span>
                <strong>
                  {detalheItem.colaboradorNome} ({detalheItem.colaboradorMatricula})
                </strong>
              </div>
              <div className={`${styles.detailCard} ${styles.detailCash}`}>
                <span className={styles.detailLabel}>Valor em Dinheiro (Depósito)</span>
                <strong className="text-success tabular">
                  {formatCurrency(detalheItem.valorDinheiro)}
                </strong>
              </div>
              <div className={styles.detailCard}>
                <span className={styles.detailLabel}>Fechamento X</span>
                <strong className="tabular">{formatCurrency(detalheItem.valorFechamentoX)}</strong>
              </div>
              <div className={styles.detailCard}>
                <span className={styles.detailLabel}>Vale-troca</span>
                <strong className="tabular">
                  {detalheItem.valeTroca != null
                    ? formatCurrency(detalheItem.valeTroca)
                    : 'Nenhum'}
                </strong>
              </div>
              <div className={styles.detailCard}>
                <span className={styles.detailLabel}>Divergência</span>
                {detalheItem.divergenciaTipo !== DIVERGENCIA.NENHUMA ? (
                  <strong
                    className={
                      detalheItem.divergenciaTipo === DIVERGENCIA.SOBRA
                        ? 'text-warning'
                        : 'text-danger'
                    }
                  >
                    {detalheItem.divergenciaTipo === DIVERGENCIA.SOBRA ? 'Sobra' : 'Falta'} de{' '}
                    {formatCurrency(detalheItem.divergenciaValor)}
                  </strong>
                ) : (
                  <strong className="text-success">Sem divergência</strong>
                )}
              </div>
              <div className={styles.detailCard}>
                <span className={styles.detailLabel}>Registrado Por</span>
                <strong>
                  {detalheItem.registradoPorNome} ({detalheItem.registradoPorMatricula})
                </strong>
              </div>
              <div className={styles.detailCard}>
                <span className={styles.detailLabel}>Data e Hora do Registro</span>
                <strong>{formatDateTime(detalheItem.registradoEm)}</strong>
              </div>
              {detalheItem.observacoes && (
                <div className={`${styles.detailCard} ${styles.detailFull}`}>
                  <span className={styles.detailLabel}>Observações</span>
                  <p className={styles.detailObs}>{detalheItem.observacoes}</p>
                </div>
              )}
            </div>

            <div className={styles.previewSection}>
              <h4>Foto do Cupom X (toque para ampliar)</h4>
              {detalheItem.fotoCupom ? (
                <img
                  src={detalheItem.fotoCupom}
                  alt="Cupom X"
                  className={styles.zoomableImg}
                  onClick={() => setLightboxSrc(detalheItem.fotoCupom)}
                />
              ) : (
                <p className="text-muted">Sem foto registrada.</p>
              )}
            </div>

            <div className={styles.previewSection}>
              <h4>Assinatura do Colaborador (toque para ampliar)</h4>
              {detalheItem.assinatura ? (
                <img
                  src={detalheItem.assinatura}
                  alt="Assinatura"
                  className={`${styles.zoomableImg} ${styles.sigPreview}`}
                  onClick={() => setLightboxSrc(detalheItem.assinatura)}
                />
              ) : (
                <p className="text-muted">Sem assinatura registrada.</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        open={!!itemParaExcluir}
        onClose={() => setItemParaExcluir(null)}
        title="Confirmar Exclusão"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setItemParaExcluir(null)} disabled={excluindo}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              icon={<FiTrash2 />}
              loading={excluindo}
              onClick={confirmarExclusao}
            >
              Excluir
            </Button>
          </>
        }
      >
        {itemParaExcluir && (
          <div className={styles.deleteConfirm}>
            <div className={styles.deleteWarningIcon}>🗑️</div>
            <p>
              Deseja realmente excluir o fechamento de{' '}
              <b>{itemParaExcluir.colaboradorNome}</b> do dia{' '}
              <b>{formatDate(itemParaExcluir.data)}</b> no valor de{' '}
              <b>{formatCurrency(itemParaExcluir.valorDinheiro)}</b>?
            </p>
            <small className="text-muted">Esta ação não poderá ser desfeita.</small>
          </div>
        )}
      </Modal>

      {/* Lightbox para fotos e assinaturas */}
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </>
  );
}
