/**
 * Configurações centrais do app.
 *
 * Separação estrita de usuários:
 * 1. LIDERANÇA: têm acesso com login (matrícula + senha) e registram fechamentos.
 * 2. COLABORADORES: não fazem login, apenas realizam fechamento de caixa na loja.
 */

export const APP_NAME = 'Fechamento de Caixa';
export const STORE_NAME = 'Loja CE 99';

/** Senha única da liderança (temporária — fase 1) */
export const SENHA_PADRAO = '0099';

/** Chaves usadas no localStorage */
export const STORAGE_KEYS = {
  REGISTROS: 'fechamento_caixa_registros',
  AUTH: 'fechamento_caixa_auth',
  FILTROS_HISTORICO: 'fechamento_caixa_filtros_historico',
};

/**
 * 1. LIDERANÇA (acesso exclusivo com login)
 * Nomes em formato amigável para saudações e assinaturas de registro.
 */
export const LIDERANCA = [
  { matricula: '101610', nome: 'Mateus' },
  { matricula: '33656', nome: 'Diego' },
  { matricula: '101875', nome: 'Eliene' },
  { matricula: '105696', nome: 'Flavia' }, // FLAVIANE PEREIRA DE FREITAS
];

/**
 * 2. COLABORADORES DO FECHAMENTO DE CAIXA (quem opera o caixa)
 * Nomes em CAIXA ALTA (padrão oficial do sistema de vendas).
 * A liderança também opera e fecha caixa na loja, por isso também consta aqui.
 */
export const COLABORADORES = [
  { matricula: '101610', nome: 'MATEUS' },
  { matricula: '33656', nome: 'DIEGO' },
  { matricula: '101875', nome: 'ELIENE' },
  { matricula: '105696', nome: 'FLAVIANE PEREIRA DE FREITAS' },
  { matricula: '114735', nome: 'BRUNA MOTA DE OLIVEIRA' },
  { matricula: '122244', nome: 'MATEUS SERRANO MENEZ DE CASTRO' },
  { matricula: '127041', nome: 'AMANDA CAROLINE DOS SANTOS SOARES' },
  { matricula: '114734', nome: 'BRENO RYANN BARBOSA DA FONSECA' },
  { matricula: '124110', nome: 'MAURICIO ALVES PUGAS' },
  { matricula: '118959', nome: 'BRUNO FONSECA BRANQUINHO' },
  { matricula: '124681', nome: 'IZABELLA NIARA FERREIRA CARDOSO' },
  { matricula: '127039', nome: 'GUILHERME AUGUSTO VIEIRA SILVA' },
  { matricula: '122265', nome: 'GUSTAVO DE PAULA E SOUZA' },
];

/** Compressão da foto do cupom (economiza espaço no localStorage) */
export const PHOTO_CONFIG = {
  maxSize: 1280, // px no maior lado
  quality: 0.72, // qualidade JPEG (0 a 1)
};

/** Tipos de divergência */
export const DIVERGENCIA = {
  NENHUMA: 'nenhuma',
  SOBRA: 'sobra',
  FALTA: 'falta',
};
