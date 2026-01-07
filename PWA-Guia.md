# HomeFinance PWA — Guia de Instalação e Uso

## Pré-requisitos
- Navegador moderno (Chrome, Edge, Firefox — offline via SW no Chrome/Edge).
- Opcional: Docker Desktop para rodar via container.

## Rodando localmente (sem Docker)
1. Abra a pasta `HomeFinance`.
2. Inicie um servidor simples:
   - Python: `python -m http.server 8080`
3. Abra `http://localhost:8080`.

## Rodando com Docker
1. Instale o Docker Desktop.
2. Abra um terminal na pasta do projeto.
3. Construa a imagem: `docker compose build`
4. Suba o container: `docker compose up -d`
5. Verifique se está rodando: `docker ps`
6. Acesse: `http://localhost:8080`
7. Ver logs (opcional): `docker compose logs -f`
8. Parar/remover: `docker compose down`
9. Atualizar após mudanças: `docker compose build && docker compose up -d`
10. Alterar porta (opcional): edite `docker-compose.yml` e troque `8080:80` pela porta desejada.

## Instalação como App (Desktop e Mobile)
1. Abra o site.
2. Chrome/Edge: menu → “Instalar HomeFinance”.
3. Android: botão “Adicionar à tela inicial” (A2HS) quando aparecer.

## Funcionamento Offline
- O app usa Service Worker para cache de:
  - `index.html`, `styles.css`, `script.js`, `manifest.json`, ícones.
- Primeiro acesso online é necessário para popular o cache.
- Após isso, o app abre offline e atualiza em segundo plano quando online.

## Atualizações
- Ao publicar novas versões, o SW atualiza os arquivos em background.
- Forçar atualização:
  - Reabra o app após alguns segundos ou faça “Ctrl+F5”.

## Ícones e Manifest
- Ícones SVG: `icons/icon-192.svg`, `icons/icon-512.svg`.
- Manifesto: `manifest.json` já referenciado no `index.html`.

## Backup
- Script: `backup_homefinance.bat`.
- Gera snapshot com timestamp e espelho em `F:\backup_HomeFinance\latest`.

## Dicas
- Se quiser suporte total a iOS para ícones, use PNG 180x180 (`apple-touch-icon`).
- Para cache de dados, considerar IndexedDB no futuro.
