import { useEffect, useMemo, useState } from 'react';
import {
  FiAlertCircle,
  FiArrowDownRight,
  FiArrowUpRight,
  FiCalendar,
  FiCheckCircle,
  FiDollarSign,
  FiFileText,
  FiInfo,
  FiTrendingUp
} from 'react-icons/fi';

import Button from '../../components/Button/Button';
import Card from '../../components/Card/Card';
import Input from '../../components/Input/Input';
import { useToast } from '../../components/Toast/Toast';
import { calcularDeposito, listarFechamentos } from '../../services/fechamentoService';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  firstDayOfMonth,
  formatDate,
  todayISO,
  weekdayShort
} from '../../utils/formatDate';
import styles from './Deposito.module.css';

export default function Deposito() {
  const toast = useToast();

  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);

  // Período padrão: do primeiro dia do mês até hoje (ou só hoje)
  const [dataInicio, setDataInicio] = useState(firstDayOfMonth(todayISO()));
  const [dataFim, setDataFim] = useState(todayISO());

  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true);
        const dados = await listarFechamentos();
        setRegistros(dados);
      } catch {
        toast.error('Erro ao carregar dados para cálculo de depósito.');
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [toast]);

  // Atalhos rápidos de data
  const setHoje = () => {
    const hoje = todayISO();
    setDataInicio(hoje);
    setDataFim(hoje);
  };

  const setMesAtual = () => {
    const hoje = todayISO();
    setDataInicio(firstDayOfMonth(hoje));
    setDataFim(hoje);
  };

  // Cálculo reativo usando a regra estrita
  const resultado = useMemo(() => {
    if (!dataInicio || !dataFim || dataInicio > dataFim) {
      return null;
    }
    return calcularDeposito(registros, dataInicio, dataFim);
  }, [registros, dataInicio, dataFim]);

  const dataInvalida = dataInicio && dataFim && dataInicio > dataFim;

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Cálculo de Depósito</h2>
          <p>Selecione o período para apurar o montante em dinheiro a ser depositado.</p>
        </div>
      </div>

      {/* Regra de Ouro em Destaque */}
      <div className={styles.ruleBanner}>
        <div className={styles.ruleIcon}>
          <FiInfo />
        </div>
        <div className={styles.ruleText}>
          <strong>Regra Estrita de Depósito:</strong>
          <span>
            A soma do depósito considera <b>exclusivamente o campo “Valor em dinheiro”</b> dos fechamentos.
            Valores de vale-troca, fechamento X, sobras e faltas não compõem esta soma (sendo exibidos apenas como indicativo operacional).
          </span>
        </div>
      </div>

      {/* Seletor de Período */}
      <Card title="Período de Apuração" icon={<FiCalendar />}>
        <div className={styles.periodRow}>
          <div className={styles.inputsGrid}>
            <Input
              label="Data Inicial"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              error={dataInvalida ? 'Data inicial maior que final.' : undefined}
            />
            <Input
              label="Data Final"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>

          <div className={styles.shortcuts}>
            <Button variant="ghost" size="sm" onClick={setHoje}>
              Somente Hoje
            </Button>
            <Button variant="ghost" size="sm" onClick={setMesAtual}>
              Mês Atual
            </Button>
          </div>
        </div>
      </Card>

      {dataInvalida ? (
        <Card className={styles.errorBox}>
          <FiAlertCircle className={styles.errorIcon} />
          <p>A <b>Data Inicial</b> não pode ser posterior à <b>Data Final</b>. Ajuste as datas para calcular.</p>
        </Card>
      ) : resultado ? (
        <>
          {/* Card Gigante com o Total em Dinheiro para Depósito */}
          <div className={styles.heroTotal}>
            <div className={styles.heroHead}>
              <span className={styles.heroBadge}>
                <FiCheckCircle /> Montante Oficial para Depósito
              </span>
              <span className={styles.heroPeriod}>
                Período: {formatDate(dataInicio)} {dataInicio !== dataFim && `a ${formatDate(dataFim)}`}
              </span>
            </div>

            <div className={styles.heroValueRow}>
              <small className={styles.heroCurrency}>R$</small>
              <span className={`${styles.heroAmount} tabular`}>
                {formatCurrency(resultado.totalDinheiro).replace('R$', '').trim()}
              </span>
            </div>

            <p className={styles.heroNote}>
              Soma referente a <b>{resultado.quantidade}</b> fechamento(s) registrado(s) no período selecionado.
            </p>
          </div>

          {/* Cards Informativos Secundários */}
          <div className={styles.summaryGrid}>
            <Card className={styles.statCard}>
              <div className={styles.statTop}>
                <span className={styles.statLabel}>Fechamentos</span>
                <span className={styles.statIcon}><FiFileText /></span>
              </div>
              <strong className={`${styles.statValue} tabular`}>{resultado.quantidade}</strong>
              <small className={styles.statSub}>Total no período</small>
            </Card>

            <Card className={styles.statCard}>
              <div className={styles.statTop}>
                <span className={styles.statLabel}>Total Fechamento X</span>
                <span className={`${styles.statIcon} text-primary`}><FiFileText /></span>
              </div>
              <strong className={`${styles.statValue} text-primary tabular`}>
                {formatCurrency(resultado.totalFechamentoX)}
              </strong>
              <small className={styles.statSub}>Soma cupons fiscais</small>
            </Card>

            <Card className={styles.statCard}>
              <div className={styles.statTop}>
                <span className={styles.statLabel}>Total Sobras (Info)</span>
                <span className={`${styles.statIcon} text-warning`}><FiArrowUpRight /></span>
              </div>
              <strong className={`${styles.statValue} text-warning tabular`}>
                {formatCurrency(resultado.totalSobras)}
              </strong>
              <small className={styles.statSub}>
                {resultado.qtdSobras} ocorrência(s) · Não entra no depósito
              </small>
            </Card>

            <Card className={styles.statCard}>
              <div className={styles.statTop}>
                <span className={styles.statLabel}>Total Faltas (Info)</span>
                <span className={`${styles.statIcon} text-danger`}><FiArrowDownRight /></span>
              </div>
              <strong className={`${styles.statValue} text-danger tabular`}>
                {formatCurrency(resultado.totalFaltas)}
              </strong>
              <small className={styles.statSub}>
                {resultado.qtdFaltas} ocorrência(s) · Não entra no depósito
              </small>
            </Card>
          </div>

          {/* Detalhamento por Dia */}
          <Card title="Detalhamento Diário do Período (Fechamento X e Depósito)" icon={<FiTrendingUp />}>
            {resultado.porDia.length === 0 ? (
              <p className={styles.noDataText}>
                Nenhum fechamento registrado no período de {formatDate(dataInicio)} a {formatDate(dataFim)}.
              </p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Dia</th>
                      <th className={styles.textCenter}>Fechamentos</th>
                      <th className={styles.textRight}>Total Fechamento X</th>
                      <th className={styles.textRight}>Total Dinheiro (Depósito)</th>
                      <th className={styles.textRight}>Sobras (Info)</th>
                      <th className={styles.textRight}>Faltas (Info)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.porDia.map((dia) => (
                      <tr key={dia.data}>
                        <td className={styles.fontBold}>{formatDate(dia.data)}</td>
                        <td className="text-muted">{weekdayShort(dia.data)}</td>
                        <td className={`${styles.textCenter} tabular`}>{dia.quantidade}</td>
                        <td className={`${styles.textRight} tabular ${styles.fontBold} text-primary`}>
                          {formatCurrency(dia.totalFechamentoX)}
                        </td>
                        <td className={`${styles.textRight} ${styles.fontBold} text-success tabular`}>
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
                      <td colSpan={2}><b>Total Geral do Período</b></td>
                      <td className={`${styles.textCenter} tabular`}><b>{resultado.quantidade}</b></td>
                      <td className={`${styles.textRight} tabular text-primary`}>
                        <b style={{ fontSize: 16 }}>{formatCurrency(resultado.totalFechamentoX)}</b>
                      </td>
                      <td className={`${styles.textRight} text-success tabular`}>
                        <b style={{ fontSize: 17 }}>{formatCurrency(resultado.totalDinheiro)}</b>
                      </td>
                      <td className={`${styles.textRight} tabular text-warning`}>
                        <b>{resultado.totalSobras > 0 ? formatCurrency(resultado.totalSobras) : '—'}</b>
                      </td>
                      <td className={`${styles.textRight} tabular text-danger`}>
                        <b>{resultado.totalFaltas > 0 ? formatCurrency(resultado.totalFaltas) : '—'}</b>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : null}
    </>
  );
}
