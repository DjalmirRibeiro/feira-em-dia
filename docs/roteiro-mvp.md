# Roteiro de teste do ciclo demonstrativo

1. Na visão geral, use **Carregar demonstração completa**. Confirme a reinicialização
   da base fictícia. Compras pessoais não são substituídas.
2. Em **Produtos**, busque arroz, feijão ou banana. Há 60 cadastros e 12 fotos
   ilustrativas. Fotografe uma etiqueta ou escolha a imagem sintética em
   `assets/testes/etiqueta-ficticia.png`, recorte e faça a leitura local. Revise
   preço, nome e código antes de salvar e adicionar à lista.
3. Em **Minha compra**, informe a quantidade pega, altere o preço quando necessário
   e acompanhe o total. Pegue apenas parte de um item para conferir o saldo pendente.
   Exclua e desfaça para conferir o retorno da quantidade à lista.
4. Conclua com data e supermercado. Revise a entrada no estoque: dois pacotes de
   arroz de 5 kg podem virar 10 kg, enquanto sabonetes podem continuar em unidades.
   A revisão da mesma compra no histórico não duplica entradas já registradas.
5. Em **Estoque**, o cenário inicial tem 2 kg de arroz. Registre consumo de 200 g:
   o saldo passa a 1,8 kg. Abra o histórico de movimentos e desfaça; volta a 2 kg.
   Teste descarte e correção de saldo. Uma baixa maior que o saldo é recusada.
6. Em **Ver duração e reposição**, o arroz inicial indica dez dias, a partir de
   cinco baixas em quinze dias. Para trinta dias, faltam 4 kg: a sugestão é um
   pacote de 5 kg. Lotes vencidos ficam fora da cobertura. Itens sem histórico
   mostram que ainda não há previsão; não se inventa uma duração.
7. Em **Gastos**, compare os meses e alterne dias equivalentes. Configure orçamento.
   Observe supermercados, categorias e preços das mesmas apresentações. Variação
   de gasto total e variação de preço são medidas diferentes.
8. Em **Assistente**, pergunte o que falta, quanto gastou ou quanto dura o arroz.
   Use **Simular comando de voz** e **Analisar pedido**: a transcrição fictícia
   pede consumo de 200 g de arroz. Confira e confirme. Nenhum áudio é gravado
   nessa simulação. Experimente também adicionar sabonete e cancelar a proposta.
9. Avance o relógio demonstrativo para testar validade e mudança de previsões.
   As estimativas dependem das baixas registradas; não garantem uma dieta completa.
10. Em **Sobre o aplicativo**, escolha incluir fotos e, opcionalmente, Saúde.
    Exporte e restaure o JSON na mesma base. A mesclagem preserva registros com
    identificadores existentes. Restaurar outra vez não duplica esses registros.
11. Use **Voltar aos meus dados** e confirme a separação das bases. O backup não
    contém chave de API. Limpar dados do navegador pode apagar o banco local.

O ditado real depende do navegador, permissão e, em alguns casos, conexão. A
simulação permite testar os fluxos sem depender do microfone. O gateway OpenAI
foi implementado e testado com respostas fictícias; a chamada paga real exige
publicação separada e configuração descritas em `server/README.md`.
