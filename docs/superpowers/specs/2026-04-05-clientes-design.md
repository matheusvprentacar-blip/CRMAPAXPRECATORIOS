# Refatoração Apax Clay da página de clientes

**Data:** 2026-04-05  
**Arquivo principal:** `app/(dashboard)/clientes/page.tsx`

## Objetivo

Refatorar a página de clientes para o padrão Apax Clay com foco principal em melhorar leitura e navegação, mantendo a lógica atual intacta. A tela deve adotar uma estrutura híbrida: hero e KPIs no topo, barra operacional unificada no meio e base principal mais escaneável para a listagem. O escopo inclui também o modal de detalhes/edição do cliente.

## Contexto atual

A página já concentra boa parte da operação de clientes em um único arquivo, incluindo:
- carregamento e agregação de credores;
- busca, filtros avançados e paginação;
- KPIs de resumo;
- grid de cards de clientes;
- modal de detalhes e edição.

Hoje a tela funciona, mas a hierarquia visual favorece leitura card a card. Isso reduz escaneabilidade quando há muitos clientes e faz a navegação parecer mais pesada do que precisa.

## Objetivo de UX

A nova versão deve priorizar:
- leitura rápida da base de clientes;
- hierarquia clara entre contexto, métricas, busca/filtros e listagem;
- consistência visual com o design system Apax Clay;
- melhor uso no mobile sem perder densidade útil no desktop;
- modal mais claro para consulta e edição rápida.

## Abordagem aprovada

A abordagem escolhida foi a **híbrida Clay focada em escaneabilidade**.

Ela combina:
- **Hero Title Clay obrigatório** no topo;
- **KPIs em faixa executiva** logo abaixo;
- **barra operacional única** para busca, filtros, contadores e atualização;
- **listagem híbrida** em vez de depender principalmente do grid de cards atual;
- **modal de detalhes/edição** redesenhado no mesmo sistema visual.

Essa direção foi escolhida porque melhora leitura e navegação sem exigir mudança de lógica ou transformação radical do fluxo da página.

## Estrutura proposta da página

### 1. Hero Title Clay

O topo da página deve ser reorganizado para seguir o padrão Apax Clay:
- chip contextual do módulo;
- título principal com maior impacto tipográfico;
- subtítulo curto;
- descrição resumida da finalidade da tela.

Esse bloco substitui o cabeçalho atual mais genérico e passa a funcionar como ponto de orientação da página.

### 2. KPIs em faixa clara

Os KPIs permanecem no topo, mas deixam de parecer cards genéricos soltos. Eles passam a ser percebidos como uma faixa de leitura rápida, com destaque adequado para:
- total de clientes;
- carteira atualizada;
- clientes com contato;
- clientes com status.

A carteira atualizada pode seguir como o destaque principal, mas sem introduzir cor decorativa fora da semântica do sistema.

### 3. Barra operacional única

Busca, filtros e ações devem ser agrupados em uma única área visualmente coesa. Essa faixa deve conter:
- campo de busca;
- atalho para filtros avançados;
- contadores resumidos;
- ação de atualizar;
- chips de filtros ativos, quando houver.

O objetivo é reduzir dispersão visual e deixar claro onde acontece a operação principal da tela.

### 4. Base principal mais escaneável

A principal mudança estrutural é na listagem.

#### Desktop

A listagem deve migrar para uma composição híbrida mais próxima de tabela/lista densa, organizada por linha com quatro zonas principais:
1. **Identidade** — avatar ou iniciais, nome, CPF/CNPJ;
2. **Contexto** — cidade/UF, contato, última movimentação;
3. **Negócio** — carteira, quantidade de processos, status;
4. **Ação** — abrir detalhes e menu.

A intenção é permitir varredura rápida sem exigir leitura de um card completo por item.

#### Mobile

No mobile, a mesma informação deve virar um bloco compacto empilhado, com esta prioridade:
1. nome do cliente;
2. status;
3. carteira;
4. contato e metadados;
5. ação principal.

Os blocos devem preservar toque mínimo de 44x44px e leitura clara em telas pequenas.

### 5. Estados da listagem

A estrutura final deve contemplar:
- skeletons no mesmo formato do layout final;
- estado vazio mais limpo e centralizado;
- paginação visualmente consistente com Clay;
- chips de filtros ativos acima da base principal.

## Direção para o modal de detalhes/edição

O modal atual deve ser mantido funcionalmente, mas redesenhado visualmente.

### 1. Cabeçalho do modal

O topo do modal deve evidenciar:
- nome do cliente;
- CPF/CNPJ;
- status atual;
- quantidade de processos.

As ações de editar, salvar e cancelar devem ganhar hierarquia mais clara. O menu secundário deve continuar existindo, mas com menos protagonismo visual.

### 2. Bloco-resumo

Os três blocos iniciais devem ser convertidos para o padrão de value blobs Clay:
- total de processos;
- carteira atualizada;
- último status/última movimentação.

A carteira deve ser o dado de maior destaque visual.

### 3. Navegação por abas

As abas devem continuar as mesmas do fluxo atual:
- Dados do cliente;
- Processos;
- Histórico.

Mas devem passar a seguir a navegação Clay, com estado ativo mais claro e menos aparência de componente genérico.

### 4. Aba de dados do cliente

#### Modo leitura
- grid de info-fields mais organizado;
- labels mais discretos e valores com melhor hierarquia;
- layout responsivo com boa leitura em desktop e mobile.

#### Modo edição
- campos com consistência visual Clay;
- melhor separação entre grupos de informação;
- botão “Importar do precatório” tratado como ação secundária.

### 5. Aba de processos

A aba de processos deve priorizar leitura operacional, destacando:
- número do processo/precatório;
- status;
- valor;
- data.

No desktop, a apresentação pode ser mais densa. No mobile, deve virar lista vertical compacta.

### 6. Mobile no modal

O modal deve se comportar como bottom sheet no mobile, com:
- header compacto;
- ações fáceis de alcançar;
- áreas internas com melhor empilhamento;
- leitura confortável sem sensação de tela espremida.

## Limites de implementação

A refatoração deve respeitar os seguintes limites:
- não alterar lógica de carregamento, busca, filtros, paginação ou persistência;
- não alterar regras de negócio;
- não modificar APIs, Supabase ou contratos de dados;
- não mudar o comportamento funcional do fluxo, apenas sua apresentação e hierarquia visual;
- permitir reorganização interna leve do JSX se isso ajudar a clareza do arquivo, sem refactor estrutural amplo e sem abstrações desnecessárias.

## Regras visuais obrigatórias

A refatoração deve seguir as regras do Apax Clay:
- usar Hero Title padrão;
- usar Plus Jakarta Sans como referência tipográfica do sistema;
- evitar cores decorativas;
- usar azul petróleo apenas como ação principal/ênfase semântica;
- usar sombras clay e superfícies neutras do sistema;
- não usar emojis;
- manter mobile-first;
- garantir consistência entre listagem, chips, KPIs, ações e modal.

## Riscos e mitigação

### Risco 1 — densidade excessiva no desktop
A lista pode ficar compacta demais e perder legibilidade.

**Mitigação:** manter agrupamentos claros por zona e preservar espaçamento suficiente entre identidade, contexto, negócio e ações.

### Risco 2 — quebra de layout no mobile
Busca, filtros ativos e ações do modal são os pontos mais sensíveis.

**Mitigação:** tratar a composição mobile como primeira classe, empilhando conteúdo de forma explícita e reduzindo competição visual.

### Risco 3 — visual híbrido inconsistente
Se parte da tela continuar com estética anterior, o resultado fica incoerente.

**Mitigação:** aplicar o sistema Clay de forma uniforme no hero, KPIs, barra operacional, listagem e modal.

## Critérios de sucesso

A refatoração será considerada bem-sucedida se entregar:
- leitura mais rápida da base de clientes;
- hero, KPIs e barra operacional com hierarquia clara;
- listagem mais escaneável no desktop e mais clara no mobile;
- modal de detalhes/edição mais limpo e eficiente;
- nenhuma regressão funcional na lógica atual.

## Arquivos impactados

### Principal
- `app/(dashboard)/clientes/page.tsx`

### Possíveis apoios visuais
- `app/globals.css` apenas se for estritamente necessário para tokens/utilitários já alinhados ao sistema.

A preferência é concentrar a refatoração no arquivo da página e evitar expansão de escopo.

## Fora de escopo

Não fazem parte desta refatoração:
- criação de novas funcionalidades de negócio;
- alteração de consultas, RPCs ou regras de filtro;
- extração grande de componentes por conveniência;
- revisão global da página de clientes fora do objetivo visual e de navegação;
- mudanças em outras páginas do sistema.