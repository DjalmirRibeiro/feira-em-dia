# Serviço opcional de IA

O GitHub Pages executa a PWA estática. Este serviço Node separado faz chamadas
à OpenAI com a chave fornecida pelo próprio usuário. O aplicativo publicado pode
ser usado com OCR e assistente local sem este serviço.

## Desenvolvimento

Requer Node 22 ou superior. Na raiz do projeto:

```powershell
Copy-Item server/.env.example server/.env
# Edite server/.env e substitua GATEWAY_TOKEN por um segredo aleatório longo.
node --env-file=server/.env server/gateway.mjs
```

Abra a PWA local em `http://127.0.0.1:4174/`. Em Assistente → Conectar minha API,
informe `http://127.0.0.1:8787`, o código privado do serviço, sua chave OpenAI e
um identificador de modelo habilitado em sua conta que aceite imagem e ferramentas
estritas. O modelo de transcrição é opcional e deve aceitar a API de transcrição.
Não coloque chaves em arquivos do frontend ou neste repositório.

## Hospedagem para celular

Hospede o processo em um servidor sob seu controle, atrás de HTTPS, mantendo
`HOST=127.0.0.1` e usando um proxy reverso até a porta interna. Defina
`ALLOWED_ORIGINS` com as origens exatas autorizadas, separadas por vírgula; para
esta PWA, a origem é `https://djalmirribeiro.github.io` (sem caminho). Configure
o proxy para limitar tamanho, tempo de requisição e tentativas. Preserve o
segredo `GATEWAY_TOKEN` em configuração privada do serviço.

O projeto não configura automaticamente uma conta de hospedagem. O gateway ainda
não foi publicado: não existe endereço de IA real predefinido no app. Localhost
no celular refere-se ao próprio celular, portanto não alcança o computador.

Este gateway atende um MVP privado: quem conhecer o código de acesso pode criar
sessões. CORS restringe navegadores, não substitui autenticação. Um serviço público
para múltiplos usuários exige contas individuais, proteção contra abuso e gestão
de segredos adequadas à hospedagem escolhida.

## Funcionamento

- `/connect` recebe chave/modelos com código de acesso e cria sessão de 30 minutos.
- A chave e o token da sessão ficam somente na memória do processo e da aba,
  respectivamente. Recarregar a aba exige reconectar; reiniciar o serviço remove
  todas as sessões. Não há persistência de credenciais nem logs de pedidos.
- `/respond` envia fatos selecionados e, quando solicitada, a foto recortada ao
  endpoint fixo Responses da OpenAI com `store:false` e contrato estrito.
- `/transcribe` envia áudio de até 20 segundos gravado pelo aplicativo ao endpoint
  de transcrição. O ditado nativo pode usar o serviço do próprio navegador.
- `/session` com DELETE revoga a sessão. Há limites de corpo, chamadas e sessões.
- Respostas são propostas: somente ações permitidas, alvos válidos e quantidades
  compatíveis passam pela validação local. Confirmação precede cada alteração.
- Saúde fica fora do contexto por padrão. Não se calculam doses ou tratamentos;
  consumo de Saúde permanece manual. Previsão representa saldo, não orientação clínica.

O provedor pode cobrar pelo uso. `store:false` não é uma promessa de ausência de
qualquer retenção: aplicam-se as políticas e os controles da conta do provedor.
Chave inválida, cota ou modelo incompatível aparecem na primeira chamada;
conectar uma sessão não valida a chave junto à OpenAI.

## Verificação

`npm test` inclui testes HTTP do gateway com chave e provedor fictícios, sem
chamadas pagas. Autenticação, origem, expiração, revogação, contrato estrito,
`store:false` e recusa de imagens remotas foram verificados. Integração com uma
chave OpenAI real, HTTPS da hospedagem e microfone físico ainda requer teste no
ambiente final.

Referências oficiais: [saídas estruturadas](https://developers.openai.com/api/docs/guides/structured-outputs)
e [chaves de API](https://developers.openai.com/api/docs/guides/api-keys).
