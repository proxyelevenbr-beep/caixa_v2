/**
 * Validações de formulários.
 * Cada função retorna um objeto { campo: 'mensagem de erro' }.
 * Objeto vazio = tudo válido.
 */
import { COLABORADORES, DIVERGENCIA, LIDERANCA } from '../config';
import { todayISO } from './formatDate';

/** Busca colaborador pela matrícula (lista de quem realiza fechamento) */
export function findColaborador(matricula) {
  return COLABORADORES.find((c) => c.matricula === String(matricula).trim()) || null;
}

/** Busca líder pela matrícula (lista de quem tem login e autorização) */
export function findLider(matricula) {
  return LIDERANCA.find((l) => l.matricula === String(matricula).trim()) || null;
}

/** Mantém apenas dígitos (para campos de matrícula) */
export function onlyDigits(value, max = 10) {
  return String(value ?? '').replace(/\D/g, '').slice(0, max);
}

export const hasErrors = (errors) => Object.keys(errors).length > 0;

/** Validação da tela de login (apenas liderança pode acessar) */
export function validarLogin({ matricula, senha }) {
  const errors = {};
  const matLimpa = String(matricula || '').trim();

  if (!matLimpa) {
    errors.matricula = 'Informe sua matrícula.';
  } else if (!findLider(matLimpa)) {
    errors.matricula = 'Matrícula não autorizada.';
  }

  if (!senha) {
    errors.senha = 'Informe a senha.';
  }

  return errors;
}

/** Validação do formulário de novo fechamento */
export function validarFechamento(form) {
  const errors = {};

  if (!form.data) {
    errors.data = 'Informe a data do fechamento.';
  } else if (form.data > todayISO()) {
    errors.data = 'A data não pode ser futura.';
  }

  const mat = String(form.colaboradorMatricula || '').trim();
  if (!mat) {
    errors.colaboradorMatricula = 'Informe a matrícula do colaborador.';
  } else if (!findColaborador(mat)) {
    // Se a matrícula for de um líder que não faz fechamento de caixa
    if (findLider(mat)) {
      errors.colaboradorMatricula = 'Esta matrícula pertence à liderança e não está cadastrada como colaborador de caixa.';
    } else {
      errors.colaboradorMatricula = 'Matrícula não encontrada na lista de colaboradores.';
    }
  }

  if (form.valorDinheiro === null || form.valorDinheiro === undefined) {
    errors.valorDinheiro = 'Informe o valor em dinheiro (pode ser 0,00).';
  }

  if (form.valorFechamentoX === null || form.valorFechamentoX === undefined) {
    errors.valorFechamentoX = 'Informe o valor do fechamento X.';
  }

  if (form.divergenciaTipo !== DIVERGENCIA.NENHUMA) {
    if (!form.divergenciaValor || form.divergenciaValor <= 0) {
      errors.divergenciaValor = `Informe o valor da ${form.divergenciaTipo} (maior que zero).`;
    }
  }

  if (!form.fotoCupom) {
    errors.fotoCupom = 'Adicione a foto do cupom X.';
  }

  if (!form.assinatura) {
    errors.assinatura = 'A assinatura do colaborador é obrigatória.';
  }

  return errors;
}
