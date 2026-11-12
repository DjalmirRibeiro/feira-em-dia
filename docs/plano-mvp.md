# Plano do MVP — Compras e estoque doméstico

Data: 12/11/2026. Estado: primeira versão PWA implementada; MVP completo em desenvolvimento.

## 1. Objetivo e decisões confirmadas

Construir um aplicativo independente para compras mensais e diárias, com câmera,
carrinho, listas reutilizáveis, catálogo pessoal, histórico de preços, estoque e
previsões de reposição. Não integrar ao AlumiCalc: esta pasta contém apenas o plano.

O MVP poderá demonstrar todo o ciclo com dados fictícios. A câmera será testada
com produtos domésticos e etiquetas impressas, seguida por validação em mercado.
Plataforma confirmada: aplicativo web instalável (PWA), para celulares, tablets e
computadores. Primeira implementação com HTML, CSS e JavaScript, sem APK ou loja.
Instalação depende de ação do usuário e suporte do navegador; em iPhone/iPad,
orientar a instalação pelo Safari usando Adicionar à Tela de Início.
Nome provisório: Feira em Dia. Repositório independente: feira-em-dia.
Publicação inicial: GitHub Pages, com HTTPS; serviços de IA em backend separado.

Atualização confirmada: incluir assistente de IA opcional, com chave de API do
próprio usuário, para analisar fotos e executar comandos ou responder perguntas por
texto/voz com base nos dados do aplicativo. Primeiro provedor de teste: OpenAI,
com a chave do proprietário configurada em ambiente seguro na fase de integração.
Nenhuma chave foi solicitada, registrada ou utilizada nesta etapa de planejamento.

## 2. Fluxo completo

1. Criar lista vazia, selecionar produtos do catálogo ou copiar compra anterior.
2. Informar supermercado, data e orçamento opcional.
3. Capturar etiqueta/embalagem, consultar código de barras ou selecionar produto.
4. Revisar os campos incertos, informar quantidade e adicionar ao carrinho.
5. Somar valores e atualizar quantidades pendentes da lista planejada.
6. Editar, excluir, substituir ou dispensar itens, com opção de desfazer.
7. Finalizar a compra e confirmar os itens que entrarão no estoque.
8. Registrar consumo, descarte e ajustes ao longo do tempo.
9. Consultar gastos, cobertura estimada e sugestões para a próxima lista.

## 3. Modo de demonstração

- Base de demonstração separada da base pessoal; indicação visível em todas as telas.
- Carregar cenário inicial, avançar a data simulada e restaurar cenário.
- O relógio simulado não altera a data do aparelho nem gera notificações reais.
- Restaurar demonstração nunca apaga dados pessoais.
- Câmera real e leitura simulada são opções explicitamente distintas.
- Dados demonstrativos nunca são misturados aos indicadores pessoais.
- Cenários reproduzíveis: os mesmos dados devem gerar os mesmos resultados.
- Assistente simulado sem cobrança e integração real com OpenAI são modos distintos.
  Chamadas reais com dados fictícios continuam consumindo a API; sinalizar isso.

### Massa de dados proposta

- 60 apresentações de produtos em alimentação, limpeza, higiene e medicamentos.
- 3 supermercados fictícios e 6 meses de histórico fechado.
- Compras mensais e pequenas reposições, incluindo um mês parcial.
- Uma lista em andamento, com itens pendentes, parciais e substituídos.
- Estoque com lotes, datas de abertura, validades, consumo e descarte.
- Variações de preços, embalagens, marcas e quantidades.
- Fotos de referência com origem e licença registradas; imagens próprias ou
  placeholders identificados quando não houver permissão de uso.
- Preços sintéticos identificados como fictícios. Preços pesquisados terão fonte,
  data, embalagem e loja, sem serem apresentados como oferta atual garantida.
- Produtos comuns servirão como exemplos, não como recomendação alimentar ou médica.

### Cenários com respostas conhecidas

| Cenário | Entrada | Resultado esperado |
|---|---|---|
| Soma | 2 × R$ 24,90 + 3 × R$ 5,20 | R$ 65,40 |
| Edição | Alterar arroz de 2 para 1 no cenário acima | R$ 40,50 |
| Exclusão | Excluir os três itens de R$ 5,20 do cenário inicial | R$ 49,80 |
| Atendimento parcial | Planejado: 4 cafés; comprado: 2 | Faltam 2 cafés |
| Peso | 0,750 kg a R$ 12,00/kg | R$ 9,00 |
| Consumo | Entrada de 5 kg e baixa de 3 kg | Estoque de 2 kg |
| Cobertura | Consumo de 3 kg em 15 dias; saldo de 2 kg | Estimativa de 10 dias |
| Planejamento | 200 g/dia por 30 dias; saldo de 2 kg | Necessidade de 4 kg antes do ajuste à embalagem |
| Preço | Mesma apresentação de R$ 10 para R$ 12 | Aumento de 20% |
| Histórico insuficiente | Produto sem consumo registrado | Não inventar duração |

## 4. Captura e etiquetas de teste

Separar reconhecimento de texto, interpretação do preço e identificação do produto.
O código de barras identifica a apresentação; não informa sozinho o preço da loja.
Guardar opcionalmente foto do produto e foto da etiqueta, além do valor confirmado.

Criar etiquetas imprimíveis com: preço comum, preço por kg, preço por unidade,
promoção por quantidade, preço de clube, descrição abreviada e múltiplos preços.
Incluir casos com campos ausentes e preço ilegível. Nunca preencher preço desconhecido
com zero de forma silenciosa.

Utilizar códigos válidos de embalagens próprias para testar identificação real.
Códigos internos fictícios devem ser identificados como tal, sem atribuição a marcas.
Decodificação do código e correspondência no catálogo são verificações separadas.

Testar distância, inclinação, pouca luz, reflexo e etiquetas próximas. Permitir
recorte, nova captura e preenchimento manual. Evitar adicionar o mesmo item várias
vezes enquanto a câmera permanece apontada; nova inclusão exige ação do usuário.

Critério inicial proposto: conjunto de 30 capturas anotadas, incluindo casos difíceis.
Medir separadamente acerto de preço, produto, marca, tempo até inclusão e correções.
Registrar resultados observados antes de definir uma meta de precisão para lançamento.
Etiquetas impressas validam o fluxo, mas não substituem a rodada em supermercado.

## 5. Regras de compras e listas

- Lista planejada e compra realizada são registros distintos e vinculados.
- Copiar lista ou compra cria novo registro; não altera o histórico de origem.
- Quantidade pendente = máximo entre zero e quantidade prevista menos atendida.
- Substituições exigem vínculo confirmado, considerando diferenças de embalagem.
- Compra finalizada conserva nome, apresentação, preço e descontos daquele momento.
- Dinheiro usa centavos inteiros ou decimal exato; peso e volume usam precisão definida.
- Descontos e arredondamentos têm regra explícita e são mostrados no fechamento.
- Finalização e entrada de estoque não podem duplicar após repetição de toque ou falha.
- Compra finalizada pode ser corrigida por fluxo que também reconcilie o estoque.

## 6. Estoque e previsões

Estoque é calculado por movimentações: entrada, consumo, descarte, devolução e ajuste.
Lotes permitem validades diferentes para o mesmo produto. Quantidades usam unidades
compatíveis: pacote de 5 kg pode entrar como 5.000 g para permitir baixas parciais.
Bloquear conversões sem equivalência conhecida e saldos negativos acidentais.

Previsões iniciais usam consumo registrado dividido pelo intervalo observado.
Compra não é automaticamente consumo. Descartes e ajustes não entram como consumo.
Períodos sem registros ou com ruptura de estoque reduzem a confiança da estimativa.
Mostrar janela analisada, quantidade de observações e data da última atualização.

Cobertura = saldo disponível / consumo diário estimado.
Reposição = máximo entre zero e consumo diário × horizonte desejado − saldo.
Ajustar a reposição à embalagem escolhida, exibindo eventual sobra prevista.
Validade deve limitar a cobertura utilizável; comunicar premissas e incerteza.

Para medicamentos, usar apenas o consumo ou a rotina explicitamente informados.
Não inferir doses, tratamentos ou substituições. Proteção de acesso e escolha de
inclusão em backup para registros de medicamentos fazem parte do desenho.

## 7. Consultas e dashboards

Primeiras respostas podem ser calculadas por regras e botões, sem serviço de IA:

Com IA configurada, essas mesmas consultas estarão disponíveis por texto ou voz.
A IA consultará funções do aplicativo; os cálculos e saldos continuarão sendo
produzidos pelas regras de negócio. Ver seção 12 para comandos e integração.

- O que falta? → itens e quantidades pendentes.
- Esqueci algo? → pendências e sugestões justificadas por histórico/estoque.
- Quanto falta gastar? → preços históricos datados, claramente estimados.
- Para quantos dias tenho este produto? → cobertura e confiança.

Dashboard: total mensal, orçamento, compras por data/loja, categorias, itens baixos,
validade e evolução de preços. Separar gasto total de variação de preço para a mesma
apresentação. Comparar embalagens por unidade equivalente quando possível.
Identificar meses parciais e produtos sem equivalente; não atribuir toda diferença
de gasto à inflação. Médias devem declarar a ponderação utilizada.

## 8. Telas e identidade

Navegação: Início, Listas, Comprar, Estoque e Histórico. Catálogo acessível por busca.
Telas adicionais: captura/revisão, ficha do produto, detalhe da compra e demonstração.
Acrescentar Configurações de IA e painel do assistente, com botão de microfone,
entrada de texto, câmera opcional, transcrição e resultado da ação.

Paleta proposta: laranja #FFB27A, lilás #B9A0E8, fundo #FFF9F5 e texto #302B3A.
Degradês nos destaques; listas claras, botões grandes e estados com texto/ícone.
Conferir contraste e ampliação de fonte antes de fechar o desenho visual.

## 9. Arquitetura proposta

PWA com persistência local e camadas de interface, regras de negócio e dados.
Manifesto, ícones e service worker permitem instalação e cache da interface.
URLs relativas garantem funcionamento em subpasta do GitHub Pages. Usar IndexedDB
para fotos e dados estruturados na evolução do MVP; a versão inicial pode usar
localStorage para pequenos registros, com exportação e tratamento de falta de espaço.
Armazenamento do navegador não é backup: limpeza de dados pode apagar registros.
Câmera e microfone requerem HTTPS, permissão e teste de compatibilidade. Não depender
de reconhecimento de voz ou código de barras disponível apenas em alguns navegadores.
Usar captura de foto como alternativa e transcrição no backend quando habilitada.
Interfaces substituíveis para câmera, OCR, catálogo, relógio e repositórios permitem
usar a mesma lógica com cenários fictícios e dispositivos reais.
Acrescentar interfaces para provedor de IA, transcrição, saída de voz e executor
de comandos. O executor é compartilhado entre botões, texto e voz.

Entidades principais: produto genérico, apresentação, código identificador, foto,
supermercado, preço observado, lista/item planejado, compra/item comprado,
vínculo de atendimento, lote e movimentação de estoque.

Salvar cada alteração relevante localmente e recuperar compra após fechar o app.
Validar migrações, exportação e restauração. Login e sincronização entre dispositivos
podem vir depois da validação local, com política explícita de conflitos.

A integração real de IA introduz um backend autenticado para intermediar chamadas
e proteger chaves. Ele é necessário para essa função conectada, mesmo que a
sincronização geral permaneça para depois. O banco local continua sendo a fonte
dos dados domésticos; compartilhar com a IA somente o contexto necessário.

## 10. Sequência de entrega

| Etapa | Entrega | Aceite |
|---|---|---|
| A | Protótipo navegável e cenários de demonstração | Fluxo completo compreensível com dados fictícios |
| B | Catálogo, listas, carrinho e persistência | Totais corretos, edição/exclusão e recuperação após fechar |
| C | Câmera, OCR e etiquetas de teste | Resultado medido, revisão e alternativa manual funcionais |
| D | Reutilização de listas e fechamento | Pendências corretas, histórico preservado e estoque sem duplicação |
| E | Lotes, consumo, validade e ajustes | Saldos e reversões consistentes |
| F | Dashboards e previsões | Cenários conhecidos corretos e incerteza explícita |
| F1 | Configuração de IA e análise de fotos com OpenAI | Chave protegida, campos revisáveis, custos visíveis e alternativa sem IA |
| F2 | Assistente por texto e microfone, com câmera opcional | Comandos executados uma vez, consultas fundamentadas e ambiguidades esclarecidas |
| G | Piloto doméstico e em supermercado | Problemas reais registrados e corrigidos antes da publicação |

Todas as etapas pertencem ao escopo planejado do MVP; a ordem evita depender de
meses de uso real para construir as funções. A demonstração cobre as etapas, mas
não será apresentada como comprovação de precisão de captura ou previsão pessoal.

## 11. Próxima execução

Criar projeto independente, catálogo demonstrativo e protótipo do ciclo completo.
Começar com dados sintéticos e imagens identificadas; pesquisar imagens licenciadas
e referências de preços ao preparar a massa definitiva. Não instalar serviços,
contratar nuvem ou publicar aplicativo apenas com base neste documento.
Incluir no protótipo o assistente simulado e a tela de configuração de IA. Validar
primeiro o executor com comandos fictícios; depois conectar a OpenAI para testar
fotos e áudios reais usando a chave do proprietário em configuração segura.

## 12. Assistente opcional de IA com chave do usuário

### 12.1. Objetivo e disponibilidade

O usuário poderá cadastrar sua própria chave de API e ativar recursos de IA.
O MVP implementará primeiro OpenAI, com estrutura de adaptadores para incorporar
outros provedores depois. Ter uma assinatura de um assistente não comprova acesso
à API: validar a credencial, os recursos disponíveis e a autorização de uso.
Não prometer suporte a qualquer provedor apenas por aceitar uma chave.

Sem chave, sem internet ou com limite atingido, manter disponíveis catálogo,
listas, carrinho, estoque e cálculos locais, além da captura por OCR quando disponível.
Não executar automaticamente depois uma alteração que ficou pendente por falha.

### 12.2. Configurações de IA e proteção da chave

- Tela com provedor, cadastro/substituição da chave, testar conexão, ativar/desativar
  recursos, remover credencial e consultar uso estimado.
- Chave digitada em campo protegido, transmitida por TLS ao backend autenticado e
  armazenada em cofre de segredos ou com criptografia cuja chave fica separada.
- O celular mantém apenas referência da configuração e credencial de sessão em
  armazenamento seguro. Não persistir a chave do provedor no banco local, no APK,
  código-fonte, Git, logs, relatórios de erro, backups ou conversa com o assistente.
- Isolar as credenciais por usuário; validar autenticação e autorização no backend.
  A chave de teste do proprietário nunca será distribuída aos demais usuários.
- Remover a credencial armazenada e permitir substituição. Explicar que revogar a
  chave no provedor é uma ação separada, necessária quando houver exposição.
- No desenvolvimento, configurar a chave do proprietário no ambiente seguro do
  serviço de teste. Não pedir para colar a chave no chat nem incluí-la neste plano.
- Modelo de imagem/texto e transcrição configuráveis conforme capacidades reais;
  validar disponibilidade antes do uso, sem fixar aqui um modelo ou preço.
- Limites de requisições, tamanho de imagem, duração de áudio e uso por usuário.
  Exibir estimativa de custo com data da tabela utilizada e controlar cotas no
  próprio backend. Não tratar estimativa como valor final da fatura.
- Botão de teste deve informar quando fizer uma chamada com possível cobrança.

### 12.3. Captura inteligente de um ou mais produtos

Ao tirar uma foto, permitir escolher leitura local ou análise por IA. Extrair
nome, marca, apresentação, conteúdo da embalagem, preço, unidade de cobrança e
condições de promoção quando estiverem legíveis. Reconhecer vários produtos quando
possível e apresentar cada candidato separadamente para revisão e inclusão.

O fluxo deve distinguir:

- Cadastrar produto → salvar ficha e foto no catálogo, sem comprar nem gerar estoque.
- Adicionar à lista → criar ou atualizar intenção de compra na lista selecionada.
- Adicionar ao carrinho → registrar quantidade e preço da compra em andamento.
- Guardar preço observado → registrar loja, data e condição, sem alterar compras antigas.

Não inferir preço ausente da foto nem substituir por um preço histórico sem avisar.
Quantidades visíveis na imagem são sugestões e não prova de quantas unidades serão
compradas. Se faltar quantidade, perguntar; só usar um padrão quando definido pelo
usuário e exibido no resultado. Preservar opção de salvar as fotos conforme escolha.

### 12.4. Microfone, câmera e linguagem natural

Botão de microfone disponível no assistente e na tela de captura. Ao tocar, mostrar
estado de gravação, permitir apontar a câmera e associar uma foto ao comando.
Capturar uma imagem no momento indicado, sem transmitir vídeo continuamente no MVP.
Microfone e câmera só ficam ativos durante a interação iniciada pelo usuário.

Fluxo inicial: gravar comando → transcrever → combinar texto, imagem opcional e
contexto da tela → interpretar intenção → validar → executar → mostrar resultado.
Permitir corrigir a transcrição e cancelar antes da execução. Resposta por texto
sempre disponível; leitura em voz alta opcional, inicialmente pela síntese do sistema.
Conversação contínua em tempo real pode ser avaliada depois do fluxo por turnos.

| Comando de exemplo | Comportamento esperado |
|---|---|
| “Cadastre esse produto para mim” + foto | Identificar e cadastrar no catálogo; pedir somente os dados essenciais ausentes |
| “Adicione esse produto à minha lista” + foto | Usar a lista selecionada e obter a quantidade quando não estiver definida |
| “Coloque dois desses no carrinho” + foto | Identificar produto e preço; inserir 2 unidades na compra ativa |
| “Retire 2 quilos de feijão da minha lista” | Reduzir 2 kg da quantidade planejada; não dar baixa no estoque |
| “Usei 500 gramas de feijão” | Registrar consumo de 500 g do estoque, com resolução de produto/lote |
| “Quanto já gastei nesta compra?” | Consultar o total calculado pelo carrinho |
| “O que falta comprar?” | Consultar a lista selecionada e as quantidades atendidas |
| “Esqueci alguma coisa?” | Mostrar pendências e sugestões justificadas, sem afirmar certeza |
| “Quanto gastei a mais neste mês?” | Comparar períodos explícitos e distinguir mês parcial |
| “Meu arroz dura até quando?” | Consultar a previsão calculada e comunicar as limitações |

Se houver duas listas, vários feijões, unidade incompatível ou pedido maior que o
saldo da lista/estoque, perguntar apenas o que falta resolver. “Retire da lista”
e “dei baixa no estoque” são ações distintas. Reduzir quantidade não pode tornar
o planejamento negativo nem apagar compra já realizada.

Quando produto, quantidade, destino e ação estiverem claros, executar comandos
reversíveis com retorno curto e opção de desfazer, sem confirmação repetitiva.
Pedir confirmação em alterações amplas, como apagar uma lista inteira ou finalizar
uma compra. Em ações ambíguas, esclarecer antes de escrever dados.

### 12.5. Acesso aos dados e execução confiável

A IA não terá acesso irrestrito ao banco, SQL livre ou credenciais. Disponibilizar
funções com parâmetros estruturados, como buscar produto, consultar lista, somar
carrinho, comparar períodos, consultar cobertura, cadastrar produto, adicionar item,
reduzir quantidade e registrar consumo.

O modelo propõe a função e seus argumentos. O aplicativo valida esquema, permissões,
identificadores, unidades, quantidades e contexto; então executa pelas mesmas regras
usadas pela interface. A resposta de sucesso só aparece após confirmação da gravação.
Atualizar a interface e permitir desfazer por operação compensatória consistente.

Utilizar identificador único de comando para impedir duplicação por repetição,
timeout ou nova tentativa. Se o estado mudar durante a análise, reler e validar
antes de aplicar. Comandos com vários produtos devem declarar inclusões e falhas
individualmente; não anunciar sucesso total quando houver execução parcial.

Consultas usam dados efetivamente retornados pelo app, com período e contexto.
Valores, saldos e previsões vêm das funções de cálculo; a IA explica os resultados.
Ausência de dados deve gerar resposta explícita, sem inventar produtos ou preços.
Texto em embalagens, imagens ou cadastros é dado, nunca instrução para executar ações.

### 12.6. Privacidade e funcionamento conectado

Antes de ativar o recurso, explicar que fotos, áudio/transcrição e contexto escolhido
serão enviados ao serviço intermediário e ao provedor. Compartilhar apenas os dados
necessários; não enviar toda a base a cada pergunta. Informar a política de retenção
do serviço e conferir a política vigente do provedor antes da disponibilização.

Histórico de conversa é opcional e pode ser apagado. Não guardar áudio por padrão;
guardar imagens do produto apenas conforme a escolha já prevista no aplicativo.
Medicamentos e seus registros ficam fora do contexto da IA por padrão, com opção
explícita de inclusão. Manter os limites de uso de medicamentos da seção 6.

Mostrar estados: ouvindo, transcrevendo, analisando, aguardando informação,
executando, concluído e falha. Tratar credencial inválida, cota, indisponibilidade,
recusa do modelo, resposta inválida e falta de conexão sem perder dados locais.

### 12.7. Testes de demonstração e integração OpenAI

1. Simular transcrições, fotos reconhecidas, propostas de função e falhas sem API.
2. Testar o executor com ações estruturadas, usando os resultados conhecidos do plano.
3. Configurar a chave do proprietário no ambiente seguro e verificar conexão.
4. Rodar conjunto pequeno e limitado de fotos de casa, etiquetas e comandos reais.
5. Comparar saída da IA com anotações humanas; registrar erros por campo e por intenção.
6. Validar consultas com base fictícia de seis meses e comparar com os cálculos locais.
7. Medir tempo até resultado, correções necessárias e consumo estimado da API.

Casos obrigatórios: “dois quilos”/“200 gramas”, ruído e transcrição incorreta,
múltiplas listas, produto duplicado, preço ilegível, embalagem diferente, chave
inválida, queda de conexão, timeout após gravação, comando repetido, resposta fora
do esquema, instrução maliciosa na imagem e pedido sem dados suficientes.

Aceite: ações corretas no destino correto, confirmação apenas quando necessária,
nenhuma duplicação ou saldo inválido, totais locais preservados e consultas sem
afirmações inventadas. Separar taxa de sucesso da interpretação e do executor;
testes reais de IA não exigem frases idênticas às respostas simuladas.

### 12.8. Referências oficiais para implementação

Consultadas em 12/11/2026 com a skill OpenAI Docs. Revalidar recursos e custos
na implementação, antes de escolher os modelos.

- Imagens: https://developers.openai.com/api/docs/guides/images-vision
- Funções estruturadas: https://developers.openai.com/api/docs/guides/function-calling
- Transcrição: https://developers.openai.com/api/docs/guides/transcription
- Credenciais: https://developers.openai.com/api/docs/guides/api-keys

## 13. Primeira entrega PWA — 12/11/2026

- Repositório público: https://github.com/DjalmirRibeiro/feira-em-dia
- Endereço configurado no GitHub Pages: https://djalmirribeiro.github.io/feira-em-dia/
- Pasta independente: A:/AlumicalcFlutter/feira-em-dia.
- Implementados: interface responsiva, instalação PWA, carrinho manual com edição e
  exclusão, total, data/loja, fechamento, histórico, reutilização e exportação JSON.
- Exemplos fictícios identificados e excluídos dos indicadores de compras reais.
- Persistência inicial via localStorage; interface com cache pelo service worker.
- Câmera, IA/voz, estoque, previsões, catálogo completo de 60 produtos, seis meses
  simulados e demonstração em base separada permanecem como próximas entregas.
- Testes automatizados: soma em centavos, peso, arredondamento, entradas inválidas
  e total dos exemplos. Verificação de sintaxe dos módulos e do service worker.
- Verificação no navegador: exemplos, edição, exclusão, totais e fechamento no histórico.
- Instalação e permissões em Android/iOS físicos ainda precisam ser validadas.

## 14. Referências incorporadas e segunda entrega — 12/11/2026

Referências de comportamento consultadas nos sites dos produtos; não houve acesso
ao código, à base de produtos ou testes internos desses aplicativos. Usar padrões
de interação como referência, preservando a identidade e os textos do Feira em Dia.

| Referência | Decisão no projeto |
|---|---|
| GroceryBudget — https://grocerybudget.app/ | Manter total acessível durante a compra; próxima etapa de foto terá revisão de produto, unidade e preço antes de incluir |
| Listonic — https://listonic.com/features/total-cost | Separar intenção de compra do carrinho, com pendências e preços históricos explicitamente estimados |
| KitchenPal — https://kitchenpalapp.com/en/faqs/kitchen.html | Usar revisão de candidatos identificados na foto e edição rápida antes de salvar |
| NoWaste — https://www.nowasteapp.com/home/ | Próxima etapa de estoque usará local, saldo, lote e validade; consumo e descarte terão ações distintas |
| The Pantry — https://thepantry.app/ | Conectar consumo registrado à reposição, com acesso pela PWA e alternativas à digitação |
| Bring! — https://www.getbring.com/ | Priorizar poucos toques, identificação visual e acesso fácil às listas; manter textos grandes |

### Entregue na versão 0.2.0

- Lista planejada separada dos produtos efetivamente colocados no carrinho.
- Abas “Falta comprar” e “No carrinho”, com contagem de produtos pendentes.
- Preço opcional ao planejar; preço atual obrigatório ao colocar no carrinho.
- Atendimento parcial por unidade, peso ou volume, sem permitir quantidade acima
  do planejado sem edição prévia. Excluir do carrinho devolve a quantidade à lista.
- Ação “Não levar agora” dispensa o saldo apenas nesta compra e permite reativá-lo.
- “O que falta?” funciona por regras locais; não depende de IA.
- Total fixo na tela de compra, com quantidade de produtos ainda pendentes.
- Histórico guarda itens comprados, preço pago e planejamento, inclusive pendências.
- Reutilizar histórico cria planejamento integral com novos identificadores e
  carrinho vazio. O último preço pago serve de referência, sempre revisável.
- Exemplos passam a usar chave de armazenamento própria, com entrada e saída
  explícitas; os dados pessoais não são substituídos ao carregar demonstração.
- Migração dos dados v1 preserva carrinho/histórico e mantém uma cópia local prévia.
- Formulários em diálogos, mensagens de erro dentro deles e botões acessíveis.

### Verificação e próximos passos

Onze testes automatizados cobrem cálculos, atendimento parcial, quantidades
fracionárias, edição vinculada, remoção, dispensas, reutilização e migração.
Fluxos de compra parcial, recusa de excesso, exclusão/desfazer, persistência,
finalização com pendências e novo planejamento foram verificados no navegador.

Próxima entrega prioritária: catálogo pessoal e captura de foto real com revisão.
Organizar persistência de fotos em IndexedDB antes de salvá-las; depois integrar OCR
e IA conforme a seção 12. Não exibir botões de câmera/voz como funcionais antes de
essas capacidades estarem disponíveis. Estoque e previsões seguem na sequência.
