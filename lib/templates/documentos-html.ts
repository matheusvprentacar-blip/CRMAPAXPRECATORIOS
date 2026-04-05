/**
 * Gerador de documentos HTML com identidade visual Apax Investimentos.
 * Padrão ABNT: A4, margens 3cm esq/sup, 2cm dir/inf, Times New Roman 12pt, espaço 1,5.
 */

function esc(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => esc(vars[key] ?? ""))
}

// ─── CSS base compartilhado ────────────────────────────────────────────────────

const CSS_BASE = `
  @page {
    size: A4;
    margin: 30mm 20mm 25mm 30mm;

    @top-left {
      content: "APAX INVESTIMENTOS LTDA.";
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 7.5pt;
      color: #94a3b8;
      padding-top: 8mm;
    }
    @top-right {
      content: "CNPJ: 09.121.790/0001-38";
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 7.5pt;
      color: #94a3b8;
      padding-top: 8mm;
    }
    @bottom-left {
      content: "Rua Horeslau Savinski, 443 — Jardim São Pedro — Apucarana/PR — CEP 86809-070";
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 7pt;
      color: #94a3b8;
    }
    @bottom-right {
      content: "Página " counter(page) " de " counter(pages);
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 7.5pt;
      color: #94a3b8;
    }
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #1e293b;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Marca d'água (aparece em todas as páginas na impressão) ── */
  .watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    width: 340px;
    transform: translate(-50%, -50%) rotate(-10deg);
    opacity: 0.06;
    z-index: 0;
    pointer-events: none;
  }

  /* ── Cabeçalho (primeira página) ── */
  .letterhead {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2.5px solid #0f172a;
    padding-bottom: 5mm;
    margin-bottom: 7mm;
    position: relative;
    z-index: 1;
  }

  .letterhead-logo {
    height: 16mm;
    object-fit: contain;
  }

  .letterhead-info {
    text-align: right;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 8.5pt;
    color: #64748b;
    line-height: 1.5;
  }

  .letterhead-info strong {
    display: block;
    font-size: 12pt;
    color: #0f172a;
    text-transform: uppercase;
    margin-bottom: 1mm;
    letter-spacing: 0.03em;
  }

  /* ── Título do documento ── */
  .doc-title {
    text-align: center;
    font-size: 13pt;
    font-weight: bold;
    text-transform: uppercase;
    text-decoration: underline;
    margin: 6mm 0 7mm 0;
    line-height: 1.4;
    position: relative;
    z-index: 1;
  }

  /* ── Corpo do texto ── */
  .doc-body {
    position: relative;
    z-index: 1;
  }

  p {
    text-align: justify;
    margin-bottom: 4mm;
    orphans: 3;
    widows: 3;
  }

  p.indent {
    text-indent: 1.25cm;
  }

  .clause {
    font-weight: bold;
  }

  /* ── Assinaturas ── */
  .signatures {
    margin-top: 18mm;
    page-break-inside: avoid;
    position: relative;
    z-index: 1;
  }

  .sig-location {
    text-align: center;
    margin-bottom: 10mm;
    font-size: 11pt;
  }

  .sig-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10mm 20mm;
  }

  .sig-grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8mm 10mm;
  }

  .sig-box {
    text-align: center;
  }

  .sig-space {
    height: 18mm;
  }

  .sig-line {
    border-top: 1px solid #0f172a;
    margin-bottom: 2mm;
  }

  .sig-name {
    font-size: 10pt;
    font-weight: bold;
    display: block;
  }

  .sig-role {
    font-size: 9pt;
    color: #64748b;
    display: block;
  }

  .witnesses-title {
    font-size: 10pt;
    font-weight: bold;
    text-transform: uppercase;
    margin: 10mm 0 5mm 0;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 2mm;
  }

  /* ── Botão imprimir (oculto na impressão) ── */
  .btn-print {
    position: fixed;
    top: 12mm;
    right: 12mm;
    padding: 8px 20px;
    background: #0f172a;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 11pt;
    font-weight: 700;
    cursor: pointer;
    z-index: 9999;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  }

  .btn-print:hover { background: #1e293b; }

  @media print {
    .btn-print { display: none !important; }
  }
`

// ─── Wrapper HTML ──────────────────────────────────────────────────────────────

function wrapDocument(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <style>${CSS_BASE}</style>
</head>
<body>
  <button class="btn-print" onclick="window.print()">Imprimir / Salvar PDF</button>

  <img src="/logo-apax.png" class="watermark" alt=""
    onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='../logo-apax.png';}">

  <div class="letterhead">
    <img src="/logo-apax.png" class="letterhead-logo" alt="Apax Investimentos"
      onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='../logo-apax.png';}">
    <div class="letterhead-info">
      <strong>Apax Investimentos Ltda.</strong>
      CNPJ: 09.121.790/0001-38<br>
      Rua Horeslau Savinski, 443 — Jardim São Pedro<br>
      Apucarana/PR — CEP 86809-070
    </div>
  </div>

  <div class="doc-body">
    ${body}
  </div>
</body>
</html>`
}

// ─── ESCRITURA PÚBLICA ────────────────────────────────────────────────────────

const TEMPLATE_ESCRITURA = `
<h1 class="doc-title">Escritura Pública de Cessão de Direitos Creditórios</h1>

<p class="indent">
  <span class="clause">ESCRITURA PÚBLICA DE CESSÃO DE DIREITOS CREDITÓRIOS</span> que fazem
  <strong>{{credor_nome}}</strong>, em favor de <strong>APAX INVESTIMENTOS LTDA</strong>, na forma abaixo:
</p>

<p class="indent">
  Saibam quantos que a presente Escritura Pública de Direitos Creditórios virem que, no dia
  <strong>{{data_cessao_dia}}</strong> dias do mês de <strong>{{data_cessao_mes}}</strong> de
  <strong>{{data_cessao_ano}}</strong>, nesta cidade de <strong>{{cidade_cartorio}}</strong> — Estado do
  <strong>{{uf_cartorio}}</strong>, as partes entre si justas e contratadas, onde de um lado figurado como
  <strong>OUTORGANTE CEDENTE:</strong> {{credor_nome}}, {{credor_nacionalidade}}, maior e capaz,
  {{credor_profissao}}, {{credor_estado_civil}}, portador do RG nº {{credor_rg}} e CPF nº {{credor_cpf_cnpj}},
  nascido em {{credor_data_nascimento}}, residente na cidade de {{credor_cidade}}, Estado do {{credor_uf}},
  domiciliado {{credor_endereco}}, nº {{credor_numero}}, Bairro {{credor_bairro}}, CEP {{credor_cep}},
  neste ato representado por seu procurador Arnaldo Alberto de Moraes Filho, brasileiro, empresário,
  divorciado judicialmente, portador do CPF nº 917.770.209-30 e RG nº 5.195.508-0; e de outro lado figurado
  como <strong>OUTORGADO CESSIONÁRIO: APAX INVESTIMENTOS LTDA</strong>, pessoa jurídica de direito privado,
  inscrita no CNPJ nº 09.121.790/0001-38, NIRE nº 41211072641, com suas atividades iniciadas em 08/10/2007,
  com endereço comercial na Rua Horeslau Savinski nº 443, Jardim São Pedro, Apucarana, Paraná, neste ato
  representado por seu administrador Arnaldo Alberto de Moraes Filho, brasileiro, empresário, divorciado
  judicialmente, portador do CPF nº 917.770.209-30 e RG nº 5.195.508-0, residente e domiciliado na cidade
  de Maringá, Estado do Paraná, nascido na cidade de Londrina em 17/01/1975. Resolvem entre as partes
  contratantes, declarando cada um por sua vez o seguinte:
</p>

<p class="indent">
  <span class="clause">CLÁUSULA PRIMEIRA:</span> O OUTORGANTE CEDENTE declara que é único e legítimo credor
  original de <strong>{{proposta_menor_percentual}}%</strong> dos direitos creditórios descritos e
  relacionados da verba indenizatória do Ofício Requisitório Judicial nº <strong>{{numero_oficio}}</strong>,
  Precatório Requisitório nº <strong>{{numero_precatorio}}</strong>, em trâmite na Central de Precatórios do
  TJ/PR, extraído dos Autos de Ação de Execução contra a Fazenda Pública nos Autos nº
  <strong>{{numero_processo}}</strong>, em trâmite perante <strong>{{vara_origem}}</strong>, em que são
  partes {{credor_nome}} e o {{devedor}}, expedido no valor de
  <strong>R$ {{valor_atualizado}} ({{valor_atualizado_extenso}})</strong>, expedido em
  <strong>{{data_expedicao}}</strong>. Que este valor representa o total do referido crédito expedido em nome
  do {{credor_nome}}.
</p>

<p class="indent">
  <span class="clause">CLÁUSULA SEGUNDA:</span> Que assim, por este instrumento e na melhor forma de direito,
  o OUTORGANTE CEDENTE cede e transfere ao OUTORGADO CESSIONÁRIO, de forma <strong>IRREVOGÁVEL e
  IRRETRATÁVEL</strong>, a totalidade dos seus direitos líquidos que possui no precatório descrito na
  Cláusula Primeira supra, ou seja, o OUTORGANTE CEDENTE cede 100% (cem por cento) dos direitos creditórios
  descritos e relacionados no precatório supramencionado, declarando que esses 100% (cem por cento)
  representam o percentual de {{proposta_menor_percentual}} do total expedido em seu nome, reservando tão
  somente o percentual de <strong>{{honorarios_percentual}}%</strong> a título de honorários contratuais
  pertencentes ao patrono da ação <strong>{{advogado_nome}}</strong>, CPF nº {{advogado_cpf_cnpj}}, que não
  fazem parte desta cessão. O OUTORGANTE CEDENTE transfere a totalidade de seus direitos sobre o precatório,
  englobando todos os juros e correção monetária que o credor originário faz jus, declarando que esse
  percentual ora cedido é fruto de proventos de trabalho pessoal e, portanto, atende o dispositivo do Código
  Civil Art. 1.659, Inciso VI, da Lei 10.406/2002.
</p>

<p class="indent">
  <span class="clause">CLÁUSULA TERCEIRA — DO PAGAMENTO:</span> Que a presente cessão de direitos
  creditórios judiciais será realizada pelo preço justo e acertado de
  <strong>R$ {{proposta_menor_valor}} ({{proposta_menor_valor_extenso}})</strong>, que será pago à vista em
  moeda corrente nacional, creditado na conta do <strong>{{banco}}</strong>, agência
  <strong>{{agencia}}</strong>, conta <strong>{{conta}}</strong>, sendo o titular o CEDENTE. Que após os
  valores pagos pelo CESSIONÁRIO, o CEDENTE declara ter recebido o valor entabulado no presente negócio
  jurídico e outorga a mais ampla, geral e irrevogável quitação ao CESSIONÁRIO quanto ao presente negócio
  jurídico.
</p>

<p class="indent">
  <span class="clause">CLÁUSULA QUARTA:</span> O OUTORGANTE CEDENTE declara que não realizou cessão anterior
  e nem recebeu qualquer valor anterior pertinente ao referido crédito, e que referidos direitos creditórios
  atualmente se encontram livres e desembaraçados de quaisquer ônus e gravames, razão pela qual estão
  plenamente hábeis de serem cedidos em favor do CESSIONÁRIO por meio da presente escritura.
</p>

<p class="indent">
  <span class="clause">CLÁUSULA QUINTA:</span> De comum acordo as partes concordam que os valores totais das
  indenizações poderão ser conferidos e atualizados com base nos cálculos equivalentes já juntados nos
  referidos autos judiciais que deram origem ao precatório citado, de pleno conhecimento e fácil acesso do
  CESSIONÁRIO.
</p>

<p class="indent">
  <span class="clause">CLÁUSULA SEXTA:</span> Que a partir da presente data, o CESSIONÁRIO se sub-roga em
  todos os direitos e garantias legais previstas quanto aos percentuais cedidos e seus acréscimos, inclusive
  futuros.
</p>

<p class="indent">
  <span class="clause">CLÁUSULA SÉTIMA:</span> Que o CESSIONÁRIO e/ou o terceiro que vier a adquirir estes
  créditos do CESSIONÁRIO se comprometem a requerer a sucessão processual e/ou homologação desta cessão de
  créditos junto ao Juízo competente, bem como a requerer e informar a Secretaria do Estado da Fazenda, o
  Tribunal de Justiça do Estado do Paraná, e a Procuradoria Geral do Estado do Paraná sobre a cessão ora
  formalizada, para que estes órgãos promovam as anotações que couberem, devendo tomar todas as medidas
  cabíveis para que a sucessão processual ocorra imediatamente, isentando o CEDENTE de qualquer
  responsabilidade caso tais atos não sejam praticados pelo CESSIONÁRIO ou terceiros.
</p>

<p class="indent">
  <span class="clause">CLÁUSULA OITAVA:</span> O CEDENTE declara que a presente cessão de Direitos
  Creditórios ao CESSIONÁRIO não configura fraude contra credores, fraude à execução ou fraude à execução
  fiscal, e que irão assinar todos e quaisquer documentos que sejam necessários para que os pagamentos dos
  Direitos Creditórios sejam realizados em favor do CESSIONÁRIO.
</p>

<p class="indent">
  <span class="clause">CLÁUSULA NONA:</span> O CEDENTE cede ao CESSIONÁRIO o referido precatório declarando
  que não há qualquer empecilho para que ele possa promover as devidas habilitações da cessão visando superar
  exigências formais da Vara Cível, Câmara de Conciliação de Precatórios, Procuradoria Geral do Estado do
  Paraná, Receita Estadual do Paraná, Secretaria da Fazenda do Estado do Paraná, Tribunal de Justiça do
  Paraná, etc.
</p>

<p class="indent">
  <span class="clause">CLÁUSULA DÉCIMA — DAS DECLARAÇÕES:</span> Pelos contratantes, cada um por sua vez,
  foi dito que: (A) assumem integral responsabilidade civil e criminal por todas as declarações, valores e
  documentos apresentados para lavratura da presente escritura, inclusive por sua veracidade, isentando este
  Cartório de quaisquer encargos judiciais e/ou extrajudiciais, presentes ou futuros; (B) se obrigam por si,
  seus herdeiros e/ou sucessores ao fiel cumprimento de todas as cláusulas e condições presentes tanto nesta
  escritura como as fixadas no instrumento particular firmado que estabelece a modalidade de pagamento;
  (C) acordam as partes o caráter de título executivo extrajudicial, na forma do artigo 784, III, do Código
  de Processo Civil; (D) a presente Escritura permanecerá em vigor até que todas as obrigações relacionadas
  a ou decorrentes dos Direitos Creditórios estejam integralmente cumpridas; (E) para dirimir quaisquer
  questões oriundas do presente instrumento, fica eleito, desde já, com a exclusão e renúncia de qualquer
  outro, por mais privilegiado que seja, o foro desta Comarca; (F) que estão de inteiro e pleno acordo com
  os termos presentes na presente escritura; (G) que autorizam expressamente a realização das gestões e
  diligências necessárias ao preparo do ato; e (H) que os dados e elementos declaratórios constantes desta
  escritura foram fornecidos e conferidos pelas partes e, após as assinaturas, são inalteráveis.
</p>

<div class="signatures">
  <p class="sig-location">{{cidade_cartorio}}/{{uf_cartorio}}, {{data_cessao_dia}} de {{data_cessao_mes}} de {{data_cessao_ano}}.</p>
  <div class="sig-grid">
    <div class="sig-box">
      <div class="sig-space"></div>
      <div class="sig-line"></div>
      <span class="sig-name">{{credor_nome}}</span>
      <span class="sig-role">OUTORGANTE CEDENTE</span>
    </div>
    <div class="sig-box">
      <div class="sig-space"></div>
      <div class="sig-line"></div>
      <span class="sig-name">APAX INVESTIMENTOS LTDA</span>
      <span class="sig-role">Arnaldo Alberto de Moraes Filho — CESSIONÁRIO</span>
    </div>
  </div>

  <p class="witnesses-title">Testemunhas:</p>
  <div class="sig-grid">
    <div class="sig-box">
      <div class="sig-space"></div>
      <div class="sig-line"></div>
      <span class="sig-name">Luíz Fernando Braga</span>
      <span class="sig-role">RG: 6.223.837-2 — CPF: 005.349.479-21</span>
    </div>
    <div class="sig-box">
      <div class="sig-space"></div>
      <div class="sig-line"></div>
      <span class="sig-name">Priscilla Marques Moraes</span>
      <span class="sig-role">RG: 1.108.581-16 — CPF: 084.790.779-13</span>
    </div>
  </div>
</div>
`

// ─── CONTRATO PARTICULAR ──────────────────────────────────────────────────────

const TEMPLATE_CONTRATO = `
<h1 class="doc-title">Contrato Particular de Cessão de Direitos Creditórios</h1>

<p class="indent">
  <span class="clause">CONTRATO PARTICULAR DE CESSÃO DE DIREITOS CREDITÓRIOS</span> que faz
  <strong>{{credor_nome}}</strong>, em favor de <strong>APAX INVESTIMENTOS LTDA</strong>, na forma abaixo:
</p>

<p class="indent">
  Saibam quantos que o presente Contrato Particular de Cessão de Direitos Creditórios que, aos
  <strong>{{data_cessao_dia}}</strong> dias do mês de <strong>{{data_cessao_mes}}</strong> de
  <strong>{{data_cessao_ano}}</strong>, nesta cidade de <strong>{{cidade_cartorio}}</strong> — Estado do
  <strong>{{uf_cartorio}}</strong>, as partes entre si justas e contratadas, onde de um lado figurado como
  <strong>OUTORGANTE CEDENTE:</strong> {{credor_nome}}, {{credor_nacionalidade}}, maior e capaz,
  {{credor_profissao}}, {{credor_estado_civil}}, portador do RG nº {{credor_rg}} e CPF nº {{credor_cpf_cnpj}},
  nascido em {{credor_data_nascimento}}, residente na cidade de {{credor_cidade}}, Estado do {{credor_uf}},
  domiciliado {{credor_endereco}}, nº {{credor_numero}}, Bairro {{credor_bairro}}, CEP {{credor_cep}}; e de
  outro lado figurado como <strong>OUTORGADO CESSIONÁRIO: APAX INVESTIMENTOS LTDA</strong>, pessoa jurídica
  de direito privado, inscrita no CNPJ nº 09.121.790/0001-38, com endereço comercial na Rua Horeslau
  Savinski nº 443, Jardim São Pedro, Apucarana, Paraná, neste ato representado por seu administrador
  Arnaldo Alberto de Moraes Filho, brasileiro, empresário, divorciado judicialmente, portador do CPF nº
  917.770.209-30 e RG nº 5.195.508-0, residente e domiciliado na cidade de Maringá, Estado do Paraná,
  nascido na cidade de Londrina em 17/01/1975. Resolvem entre as partes contratantes, declarando cada um
  por sua vez o seguinte:
</p>

<p class="indent">
  <span class="clause">CLÁUSULA PRIMEIRA:</span> O OUTORGANTE CEDENTE declara que é único e legítimo credor
  original de <strong>{{proposta_menor_percentual}}%</strong> dos direitos creditórios descritos e
  relacionados da verba indenizatória do Ofício Requisitório Judicial nº <strong>{{numero_oficio}}</strong>,
  Precatório Requisitório nº <strong>{{numero_precatorio}}</strong>, em trâmite na Central de Precatórios do
  TJ/PR, extraído dos Autos de Ação de Execução contra a Fazenda Pública nos Autos nº
  <strong>{{numero_processo}}</strong>, em trâmite perante <strong>{{vara_origem}}</strong>, em que são
  partes {{credor_nome}} e o {{devedor}}, expedido no valor de
  <strong>R$ {{valor_atualizado}} ({{valor_atualizado_extenso}})</strong>, expedido em
  <strong>{{data_expedicao}}</strong>. Que este valor representa o total do referido crédito expedido em
  nome do {{credor_nome}}.
</p>

<p class="indent">
  <span class="clause">CLÁUSULA SEGUNDA:</span> Que assim, por este instrumento e na melhor forma de direito,
  o OUTORGANTE CEDENTE cede e transfere ao OUTORGADO CESSIONÁRIO, de forma <strong>IRREVOGÁVEL e
  IRRETRATÁVEL</strong>, a totalidade dos seus direitos líquidos que possui no precatório descrito na
  Cláusula Primeira supra, ou seja, o OUTORGANTE CEDENTE cede 100% (cem por cento) dos direitos creditórios
  descritos e relacionados no precatório supramencionado, declarando que esses 100% (cem por cento)
  representam o percentual de {{proposta_menor_percentual}} do total expedido em seu nome, reservando tão
  somente o percentual de <strong>{{honorarios_percentual}}%</strong> a título de honorários contratuais
  pertencentes ao patrono da ação <strong>{{advogado_nome}}</strong>, CPF nº {{advogado_cpf_cnpj}}, que não
  fazem parte desta cessão. O OUTORGANTE CEDENTE transfere a totalidade de seus direitos sobre o precatório,
  englobando todos os juros e correção monetária que o credor originário faz jus, declarando que esse
  percentual ora cedido é fruto de proventos de trabalho pessoal e, portanto, atende o dispositivo do Código
  Civil Art. 1.659, Inciso VI, da Lei 10.406/2002.
</p>

<p class="indent">
  <span class="clause">CLÁUSULA TERCEIRA — DO PAGAMENTO:</span> Que a presente cessão de direitos
  creditórios judiciais será realizada pelo preço justo e acertado de
  <strong>R$ {{proposta_menor_valor}} ({{proposta_menor_valor_extenso}})</strong>, que será pago à vista em
  moeda corrente nacional, creditado na conta do <strong>{{banco}}</strong>, agência
  <strong>{{agencia}}</strong>, conta <strong>{{conta}}</strong>, sendo o titular o CEDENTE. Que após os
  valores pagos pelo CESSIONÁRIO, o CEDENTE declara ter recebido o valor entabulado no presente negócio
  jurídico e outorga a mais ampla, geral e irrevogável quitação ao CESSIONÁRIO.
</p>

<p class="indent">
  <span class="clause">CLÁUSULA QUARTA:</span> O OUTORGANTE CEDENTE declara que jamais realizou qualquer
  cessão, total ou parcial, dos direitos creditórios judiciais relacionados na Cláusula Primeira do presente
  contrato, e que referidos direitos creditórios atualmente se encontram livres e desembaraçados de quaisquer
  ônus e gravames, razão pela qual estão plenamente hábeis de serem cedidos em favor do CESSIONÁRIO.
</p>

<p class="indent">
  <span class="clause">CLÁUSULA QUINTA:</span> De comum acordo as partes concordam que os valores totais das
  indenizações poderão ser conferidos e atualizados com base nos cálculos equivalentes já juntados nos
  referidos autos judiciais que deram origem ao precatório citado, de pleno conhecimento e fácil acesso do
  CESSIONÁRIO.
</p>

<p class="indent">
  <span class="clause">CLÁUSULA SEXTA:</span> Que a partir da presente data, o CESSIONÁRIO se sub-roga em
  todos os direitos e garantias legais previstas quanto aos percentuais cedidos e seus acréscimos, inclusive
  futuros.
</p>

<p class="indent">
  <span class="clause">CLÁUSULA SÉTIMA:</span> Que o CESSIONÁRIO e/ou o terceiro que vier a adquirir estes
  créditos do CEDENTE comprometem-se a requerer a sucessão processual e/ou homologação desta cessão de
  créditos junto ao Juízo competente, bem como a requerer e informar a Secretaria do Estado da Fazenda, o
  Tribunal de Justiça do Estado do Paraná e a Procuradoria Geral do Estado do Paraná sobre a cessão ora
  formalizada, isentando o CEDENTE de qualquer responsabilidade caso tais atos não sejam praticados pelo
  CESSIONÁRIO ou terceiros.
</p>

<p class="indent">
  <span class="clause">CLÁUSULA OITAVA:</span> O CEDENTE declara que a presente cessão de Direitos
  Creditórios ao CESSIONÁRIO não configura fraude contra credores, fraude à execução ou fraude à execução
  fiscal, e que irão assinar todos e quaisquer documentos necessários para que os pagamentos sejam realizados
  em favor do CESSIONÁRIO.
</p>

<p class="indent">
  <span class="clause">CLÁUSULA NONA:</span> O CEDENTE confere ainda ao CESSIONÁRIO poderes para
  representá-lo perante qualquer tabelionato de Notas para promover a retificação do presente contrato no
  que for necessário, visando superar exigências formais da Câmara de Conciliação de Precatórios,
  Procuradoria Geral do Estado do Paraná, Receita Estadual do Paraná, Secretaria da Fazenda do Estado do
  Paraná, Tribunal de Justiça do Paraná, etc. O presente mandato é outorgado em caráter irrevogável,
  irretratável e isento de prestação de contas, inclusive para agir em causa própria, ficando o
  procurador autorizado a celebrar negócio consigo mesmo, nos termos do Art. 117 do Código Civil Brasileiro.
</p>

<p class="indent">
  <span class="clause">CLÁUSULA DÉCIMA:</span> O CESSIONÁRIO assume todo e qualquer imposto e custas para a
  realização de inventário e partilha do bem, bem como todo e qualquer imposto, taxa ou emolumentos que,
  porventura, decorram desta transação.
</p>

<p class="indent">
  <span class="clause">CLÁUSULA DÉCIMA PRIMEIRA — DAS DECLARAÇÕES:</span> Pelos contratantes, cada um por
  sua vez, foi dito que: (A) assumem integral responsabilidade civil e criminal por todas as declarações,
  valores e documentos apresentados, inclusive por sua veracidade; (B) se obrigam por si, seus herdeiros
  e/ou sucessores ao fiel cumprimento de todas as cláusulas e condições; (C) acordam as partes o caráter
  de título executivo extrajudicial, na forma do artigo 784, III, do Código de Processo Civil; (D) o
  presente contrato permanecerá em vigor até que todas as obrigações estejam integralmente cumpridas;
  (E) para dirimir quaisquer questões oriundas do presente instrumento, fica eleito o foro da Comarca de
  Londrina/PR; (F) que estão de inteiro e pleno acordo com os termos presentes no contrato; (G) que
  autorizam expressamente a realização das gestões e diligências necessárias; e (H) que os dados e
  elementos declaratórios constantes deste instrumento foram fornecidos e conferidos pelas partes e,
  após as assinaturas, são inalteráveis.
</p>

<div class="signatures">
  <p class="sig-location">{{cidade_cartorio}}, {{data_cessao_dia}} de {{data_cessao_mes}} de {{data_cessao_ano}}.</p>
  <div class="sig-grid">
    <div class="sig-box">
      <div class="sig-space"></div>
      <div class="sig-line"></div>
      <span class="sig-name">{{credor_nome}}</span>
      <span class="sig-role">CEDENTE</span>
    </div>
    <div class="sig-box">
      <div class="sig-space"></div>
      <div class="sig-line"></div>
      <span class="sig-name">APAX INVESTIMENTOS LTDA</span>
      <span class="sig-role">Arnaldo Alberto de Moraes Filho — CESSIONÁRIO</span>
    </div>
  </div>

  <p class="witnesses-title">Testemunhas:</p>
  <div class="sig-grid">
    <div class="sig-box">
      <div class="sig-space"></div>
      <div class="sig-line"></div>
      <span class="sig-name">Luíz Fernando Braga</span>
      <span class="sig-role">RG: 6.223.837-2 — CPF: 005.349.479-21</span>
    </div>
    <div class="sig-box">
      <div class="sig-space"></div>
      <div class="sig-line"></div>
      <span class="sig-name">Priscilla Marques Moraes</span>
      <span class="sig-role">RG: 1.108.581-16 — CPF: 084.790.779-13</span>
    </div>
  </div>
</div>
`

// ─── PROCURAÇÃO ───────────────────────────────────────────────────────────────

const TEMPLATE_PROCURACAO = `
<h1 class="doc-title">Procuração — Cessão de Direitos Creditórios</h1>

<p class="indent">
  <span class="clause">PROCURAÇÃO BASTANTE QUE FAZ {{credor_nome}}, na forma abaixo:</span>
</p>

<p class="indent">
  SAIBAM quantos que por este público instrumento de procuração virem que, compareceu como Outorgante:
  <strong>{{credor_nome}}</strong>, {{credor_nacionalidade}}, maior e capaz, {{credor_profissao}},
  {{credor_estado_civil}}, portador do RG nº {{credor_rg}} e CPF nº {{credor_cpf_cnpj}}, nascido em
  {{credor_data_nascimento}}, residente na cidade de {{credor_cidade}}, Estado do {{credor_uf}},
  domiciliado {{credor_endereco}}, nº {{credor_numero}}, Bairro {{credor_bairro}}, CEP {{credor_cep}}.
  Sendo o presente reconhecido como o próprio pelos documentos de identificação apresentados.
</p>

<p class="indent">
  Então, aí pelo outorgante, foi dito que por este público instrumento nomeia e constitui seu procurador:
  <strong>Arnaldo Alberto de Moraes Filho</strong>, brasileiro, empresário, divorciado judicialmente,
  portador do CPF nº 917.770.209-30 e RG nº 5.195.508-0, residente e domiciliado na cidade de Maringá,
  Estado do Paraná, nascido na cidade de Londrina em 17/01/1975.
</p>

<p class="indent">
  A quem confere, de forma <strong>IRREVOGÁVEL e IRRETRATÁVEL</strong>, poderes amplos, gerais e
  ilimitados, inclusive para agir em causa própria, nos termos do art. 685 do Código Civil Brasileiro,
  negociar, vender e/ou ceder a quem lhe convier, fazer escritura de cessão de direitos, no todo ou em
  parte, pelo preço, prazo, cláusulas e condições que ajustar e convencionar, inclusive poderes para
  receber, por si ou por procurador que delegar, toda e qualquer importância a que tem direito o Outorgante
  correspondente a <strong>{{proposta_menor_percentual}}% ({{proposta_menor_percentual_extenso}})</strong>
  dos direitos creditórios e dos juros e correção monetária incidentes sobre o mesmo, pertencentes ao
  credor originário dos direitos expedidos em seu nome, relativos ao Ofício Requisitório Judicial nº
  <strong>{{numero_oficio}}</strong>, Precatório Requisitório nº <strong>{{numero_precatorio}}</strong>,
  em trâmite na Central de Precatórios do TJ/PR, extraído dos Autos de Ação de Execução contra a Fazenda
  Pública nos Autos nº <strong>{{numero_processo}}</strong>, em trâmite perante
  <strong>{{vara_origem}}</strong>, em que são partes {{credor_nome}} e o {{devedor}}.
</p>

<p class="indent">
  Podendo para tanto, firmar compromisso, fazer transação, assinar escritura pública de cessão de créditos,
  de retificação ou de distrato, dar anuência, receber o preço, passar recibo, dar quitação, tudo livre de
  qualquer prestação de contas, bem como praticar todos os demais atos que forem necessários para o fim a
  que se destina o presente mandato. Sendo autorizado o substabelecimento.
</p>

<p class="indent">
  O presente mandato é outorgado em caráter <strong>irrevogável, irretratável e isento de prestação de
  contas</strong>, ficando o dito procurador autorizado a celebrar negócio consigo mesmo, nos termos e
  para que surta os efeitos do Art. 117 do Código Civil Brasileiro.
</p>

<p class="indent">
  Certifico que a qualificação do procurador, bem como a descrição dos dados objeto deste mandato, foram
  fornecidos pelo Outorgante, que declara se responsabilizar civil e criminalmente, nos termos do artigo
  299 do Código Penal, por todas as declarações e informações aqui prestadas.
</p>

<p class="indent">
  Por fim o OUTORGANTE declara: (a) que jamais realizou qualquer cessão, total ou parcial, dos direitos
  creditórios judiciais relacionados no presente instrumento público, e que referidos direitos creditórios
  atualmente se encontram livres e desembaraçados de quaisquer ônus e gravames; (b) que pelo presente
  instrumento público, recebeu valor justo, razão pela qual confere ao ora OUTORGADO PROCURADOR a mais
  ampla, plena, geral, rasa, total, irrevogável e irretratável quitação, para mais nada reclamar, a que
  título for, no presente, passado e futuro, seja em juízo ou fora dele, sob qualquer fundamento ou
  alegação relacionada ao Ofício Requisitório Judicial nº {{numero_oficio}}, Precatório Requisitório nº
  {{numero_precatorio}}; e (c) que o presente instrumento tem prazo de validade por tempo indeterminado,
  bem como que se responsabiliza civil e criminalmente pela veracidade das informações e declarações
  prestadas.
</p>

<div class="signatures">
  <p class="sig-location">&nbsp;</p>
  <div class="sig-grid">
    <div class="sig-box">
      <div class="sig-space"></div>
      <div class="sig-line"></div>
      <span class="sig-name">{{credor_nome}}</span>
      <span class="sig-role">OUTORGANTE</span>
    </div>
    <div class="sig-box">
      <div class="sig-space"></div>
      <div class="sig-line"></div>
      <span class="sig-name">Arnaldo Alberto de Moraes Filho</span>
      <span class="sig-role">OUTORGADO PROCURADOR — CPF: 917.770.209-30</span>
    </div>
  </div>

  <p class="witnesses-title">Testemunhas:</p>
  <div class="sig-grid">
    <div class="sig-box">
      <div class="sig-space"></div>
      <div class="sig-line"></div>
      <span class="sig-name">Luíz Fernando Braga</span>
      <span class="sig-role">RG: 6.223.837-2 — CPF: 005.349.479-21</span>
    </div>
    <div class="sig-box">
      <div class="sig-space"></div>
      <div class="sig-line"></div>
      <span class="sig-name">Priscilla Marques Moraes</span>
      <span class="sig-role">RG: 1.108.581-16 — CPF: 084.790.779-13</span>
    </div>
  </div>
</div>
`

// ─── Funções públicas ──────────────────────────────────────────────────────────

export function gerarHtmlEscritura(vars: Record<string, string>): string {
  return wrapDocument(
    `Escritura — ${vars.credor_nome || "Cessão"}`,
    fill(TEMPLATE_ESCRITURA, vars)
  )
}

export function gerarHtmlContrato(vars: Record<string, string>): string {
  return wrapDocument(
    `Contrato — ${vars.credor_nome || "Cessão"}`,
    fill(TEMPLATE_CONTRATO, vars)
  )
}

export function gerarHtmlProcuracao(vars: Record<string, string>): string {
  return wrapDocument(
    `Procuração — ${vars.credor_nome || "Cessão"}`,
    fill(TEMPLATE_PROCURACAO, vars)
  )
}

/** Abre o HTML gerado numa nova aba do navegador */
export function abrirDocumentoEmNovaAba(html: string): void {
  const win = window.open("", "_blank")
  if (!win) {
    throw new Error("O navegador bloqueou a abertura da nova aba. Verifique as configurações de pop-up.")
  }
  win.document.write(html)
  win.document.close()
}
