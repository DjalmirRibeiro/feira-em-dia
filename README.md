# Feira em Dia

PWA de compras e estoque doméstico. Interface responsiva com cores suaves de
laranja e lilás, instalável em navegadores compatíveis, sem APK ou publicação em loja.

## Versão 0.3.0 — Catálogo e fotos

- Cadastro de nome, marca, apresentação, categoria, código e unidade de cobrança.
- Preço de referência opcional com data e supermercado.
- Foto do produto e foto da etiqueta pela câmera/seletor de imagens do navegador.
- Revisão manual: ainda não há reconhecimento automático de texto, produto ou preço.
- Fotos reduzidas para até 1280 px e salvas como JPEG em IndexedDB, sem upload.
- Busca sem acentos por nome, marca, embalagem ou código; filtro por categoria.
- Arquivar/restaurar produtos e incluir um cadastro na lista com quantidade revisável.
- 60 exemplos fictícios em catálogo separado, com códigos internos DEMO.
- Exportação JSON inclui metadados e fotos da base aberta; restauração ainda não implementada.

## Compras e listas

- Carrinho com produto, preço, quantidade e unidade (unidade, kg ou litro).
- Lista planejada separada do carrinho, com preço opcional e atendimento parcial.
- Produtos pendentes, totalmente pegos ou dispensados apenas nesta compra.
- Consulta “O que falta?” e total fixo na tela de compra.
- Histórico cria uma nova lista pendente, com carrinho vazio e preços de referência.
- Edição, exclusão com desfazer e total calculado em centavos.
- Compra com supermercado e data, histórico e reutilização de itens.
- Demonstração com produtos fictícios em armazenamento separado das compras pessoais.
- Migração da versão inicial preserva carrinho/histórico e guarda cópia dos dados v1.
- Persistência local e exportação de JSON; restauração ainda não implementada.
- Manifesto PWA, ícones e cache offline após o primeiro acesso completo.

OCR, assistente de IA, voz, estoque e previsões estão **planejados** e ainda
não implementados. A câmera usa captura de imagem, sem análise automática.
O plano completo está em [docs/plano-mvp.md](docs/plano-mvp.md).

## Acessar e instalar

Endereço do aplicativo: https://djalmirribeiro.github.io/feira-em-dia/.
No Android, usar Instalar aplicativo no navegador. No iPhone/iPad, abrir no Safari
e usar Compartilhar → Adicionar à Tela de Início. O navegador exige ação do usuário;
abrir a página não instala automaticamente. Também funciona como página comum.

## Executar localmente

Sem dependências de execução. Na pasta do projeto:

```powershell
python scripts/serve.py
```

Abrir http://127.0.0.1:4174/. HTTPS é necessário em publicação; localhost é aceito
para desenvolvimento. Um telefone não acessa o localhost do computador.

```powershell
npm test
npm run check
```

## Publicação

GitHub Pages, branch `main`, pasta raiz. `.nojekyll` evita processamento Jekyll.
Todos os caminhos de assets são relativos para suportar a subpasta do repositório.
Atualizações do cache exigem incrementar a versão em `sw.js` quando necessário.

## Dados e segurança

Compras ficam no localStorage; produtos e fotos ficam no IndexedDB deste navegador,
não no GitHub. Não há login nem
sincronização nesta versão. Limpar dados do navegador pode apagar compras; exporte
uma cópia antes. Não registrar informações sensíveis na versão inicial.

O navegador pode abrir a câmera ou oferecer um seletor, conforme dispositivo e
suporte a `capture="environment"`. Há opção separada para escolher imagem existente.
Cancelamentos e falhas de imagem não criam produto automaticamente. Não há upload
de fotos. Códigos são digitados nesta etapa; decodificação por câmera ainda não existe.
Caso o catálogo não possa ser lido, a exportação das compras continua possível,
identificada como cópia parcial sem catálogo/fotos.

Nunca colocar chaves de API em JavaScript, localStorage, commits ou GitHub Pages.
A futura integração OpenAI usará um backend autenticado e credenciais protegidas.
GitHub Pages hospeda somente o frontend estático.

## Verificação

Testes cobrem centavos, peso, arredondamento, entradas inválidas, atendimento parcial,
edição vinculada, retirada do carrinho, dispensas, reutilização e migração do histórico.
Também cobrem validação do catálogo, datas, busca sem acentos, arquivamento, 60
exemplos únicos e preservação do vínculo com o cadastro nas compras.
No navegador foram verificados salvamento das duas fotos, recarga, busca, inclusão
na lista, arquivamento/restauração, isolamento dos exemplos e exportação com imagens.
Instalação, câmera/microfone e comportamento offline devem ser validados nos
aparelhos Android e iOS usados no piloto. Ainda não há validação física nesses aparelhos.
