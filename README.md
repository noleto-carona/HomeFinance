# Controle Financeiro - Janeiro 2026

Este é um aplicativo web simples e responsivo para controle financeiro, criado com base na sua planilha.

## Como usar

Como seu ambiente não possui Node.js ou Python configurados, fiz uma versão que **não requer instalação**.

1. Navegue até a pasta `c:\Users\nolet\HomeFinance` no seu Explorador de Arquivos.
2. Dê um clique duplo no arquivo **`index.html`**.
3. O aplicativo abrirá no seu navegador padrão (Chrome, Edge, etc.).

## Funcionalidades

*   **Visualização Mobile:** O layout foi feito pensando em telas de celular, mas funciona bem no computador.
*   **Dados Iniciais:** Já incluí todas as despesas da sua imagem (OCR).
*   **Adicionar/Editar:** Você pode adicionar novas despesas ou editar as existentes clicando nelas.
*   **Status de Pagamento:** Marque contas como pagas e veja a cor mudar.
*   **Cálculo Automático:** O saldo e o total de despesas são atualizados automaticamente.
*   **Persistência:** Os dados ficam salvos no navegador. Se você fechar e abrir de novo, eles estarão lá.

## Estrutura de Arquivos

*   `index.html`: A estrutura da página.
*   `styles.css`: O estilo visual (cores, layout moderno).
*   `script.js`: A lógica (cálculos, salvar dados, interatividade).
