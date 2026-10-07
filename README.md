# 💰 Fechamento de Caixa — Loja CE 99

App web corporativo desenvolvido em **React 18 + Vite** para liderança de loja registrar fechamentos de caixa de colaboradores, capturar cupons fiscais e assinaturas digitais, e apurar com precisão o montante em dinheiro destinado a depósito bancário.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Node.js instalado (versão 18 ou superior recomendada)
- Gerenciador de pacotes npm

### Passos de Instalação e Inicialização
No terminal, navegue até a pasta do projeto:

```bash
cd "fechamento-caixa"
npm install
npm run dev
```

Abra o link exibido no terminal no navegador (geralmente `http://localhost:5173`).  
O servidor Vite já está configurado com `host: true`, permitindo também o acesso a partir do celular ou tablet conectado à mesma rede Wi-Fi (usando o IP de *Network* exibido no terminal).

---

## 🔑 Acesso da Liderança (Autenticação)

- **Senha única para todos:** `0099`
- **Matrículas cadastradas:**
  - `101610` → Mateus
  - `33656` → Diego
  - `101875` → Eliene
  - `105696` → Flavia

> **Dica:** Ao digitar uma matrícula válida na tela de login, o nome do líder e uma saudação personalizada aparecem automaticamente.

---

## 📂 Estrutura de Pastas e Arquitetura

O projeto foi construído rigorosamente com a seguinte estrutura:

```
fechamento-caixa/
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/
│   │   └── logo.svg
│   ├── components/
│   │   ├── Button/           # Botão reutilizável com variantes (primary, success, danger, ghost)
│   │   ├── Card/             # Card com títulos, ícones e ações
│   │   ├── Header/           # Cabeçalho com logo, usuário logado e logout
│   │   ├── Input/            # Input comum, textarea, select e máscara de moeda (R$)
│   │   ├── Modal/            # Modal reutilizável e Lightbox de fotos/assinaturas
│   │   ├── NavBar/           # Navegação desktop por abas e barra móvel nativa no celular
│   │   ├── PhotoUpload/      # Câmera traseira nativa, galeria e compressão JPEG
│   │   ├── SignaturePad/     # Canvas HTML5 com Pointer Events (dedo/mouse)
│   │   └── Toast/            # Notificações visuais animadas
│   ├── contexts/
│   │   └── AuthContext.jsx   # Estado global de autenticação e sessão
│   ├── hooks/
│   │   ├── useAuth.js        # Hook de conveniência para AuthContext
│   │   └── useLocalStorage.js# Hook de sincronização reativa com localStorage
│   ├── pages/
│   │   ├── Login/            # Tela de autenticação por matrícula e senha
│   │   ├── NovoFechamento/   # Formulário completo de lançamento com validações
│   │   ├── Historico/        # Lista cronológica, filtros dinâmicos e modais
│   │   └── Deposito/         # Apuração analítica de dinheiro para depósito
│   ├── routes/
│   │   └── PrivateRoute.jsx  # Guarda de rotas protegidas
│   ├── services/
│   │   ├── authService.js    # Lógica de login/logout isolada
│   │   ├── fechamentoService.js # Regras de negócio, cálculos e CRUD
│   │   └── storageService.js # Camada de persistência (fácil migração para nuvem)
│   ├── styles/
│   │   ├── global.css        # Classes utilitárias e estrutura geral
│   │   ├── reset.css         # Reset padronizado cross-browser
│   │   └── variables.css     # Tokens de cores corporativas, tipografia e espaçamentos
│   ├── utils/
│   │   ├── formatCurrency.js # Formatação de moeda BRL e somas com precisão de centavos
│   │   ├── formatDate.js     # Formatação e operações seguras com datas
│   │   └── validators.js     # Validadores de formulários e mensagens de erro
│   ├── App.jsx               # Roteamento central da SPA
│   ├── config.js             # Configurações gerais e dados fixos
│   └── main.jsx              # Entrada do React 18
├── index.html
├── package.json
└── vite.config.js
```

---

## 💼 Regras de Negócio Implementadas

1. **Cálculo de Depósito:**
   - O cálculo do depósito soma **EXCLUSIVAMENTE o campo "Valor em dinheiro"**.
   - Valores como Fechamento X, Vale-troca, Sobras e Faltas **NÃO** são somados ao montante de depósito.
   - Sobras e faltas são apuradas e exibidas na tela de Depósito apenas como **indicadores informativos operacionais**.

2. **Divergências no Fechamento:**
   - 3 opções: *Sem divergência*, *Sobra* e *Falta*.
   - Ao selecionar *Sobra* ou *Falta*, o campo de valor correspondente torna-se obrigatório.

3. **Valores Monetários:**
   - Todos os inputs de moeda contam com máscara automática estilo terminal de caixa: ao digitar os números, o valor é preenchido em centavos da direita para a esquerda (`15000` vira `150,00`).

4. **Comprovantes e Assinatura Digital:**
   - **Foto do Cupom X:** Opção de abrir a câmera traseira no mobile (`capture="environment"`) ou escolher foto da galeria. As imagens são compactadas via Canvas JPEG (qualidade 0.72) antes de salvar, evitando estouro de cota do navegador.
   - **Assinatura:** Componente com suporte a touch/mouse/caneta stylus, traçado suave e conversão para imagem base64.

---

## ☁️ Preparação para Fase 2 (Migração para Supabase / Nuvem)

Toda a lógica de acesso a dados foi desacoplada em services assíncronos:
- `storageService.js` concentra todas as leituras e escritas locais.
- `authService.js` e `fechamentoService.js` já expõem funções assíncronas (`async/await`).

Para migrar para o Supabase no futuro:
1. Instale `@supabase/supabase-js`.
2. Configure as credenciais no `.env`.
3. Substitua as chamadas do `storageService` no `fechamentoService.js` por chamadas à API do Supabase (ex.: `supabase.from('fechamentos').select()`).
4. Nenhuma página ou componente visual precisará ser alterado.
