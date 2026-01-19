
import { calcularPrecatorio, DadosEntrada } from "../lib/calculos/calcular-precatorio";

const dadosTeste = {
    valor_principal_original: 1000.00,
    valor_juros_original: 0,
    multa: 0,

    // Janeiro de 1996
    data_base: "1996-01-01",

    // Data final Dezembro 2025 (para pegar até o último índice SELIC)
    // A lógica de soma vai até data_final - 1 mês, então para incluir Dez/2025 na soma, 
    // a data final do cálculo seria JAN/2026.
    // Porem o enunciado diz "data_final: 2025-12-31".
    // Se a regra é "até o mês anterior à data_atual", então data_atual = 2026-01-01 pegaria até Dez/2025.
    // Vamos testar com data_final = 2026-01-01 para garantir que Dez/2025 entra na soma se o user quis dizer "até Dez/2025 INCLUSIVE".
    // Se o user disse "data_final = 2025-12-31" e a regra é "até mês anterior", então a soma iria até Nov/2025.
    // VAMOS USAR A INTERPRETAÇÃO PADRÃO: Data do cálculo é "Hoje". Se hoje é Dez/2025, corrigimos até Nov/2025. 
    // O exemplo diz: "Soma das taxas de Jan/22 a Dez/25". Para ter Dez/25, a data de referência deve ser Jan/2026.
    data_final_calculo: "2026-01-01",

    // Defaults irrelevantes para o teste core
    data_inicial_calculo: "1996-01-01",
    autor_credor_originario: "Teste",
    advogado_acao: "",
    numero_precatorio: "",
    autos_execucao: "",
    numero_oficio_requisitorio: "",
    data_expedicao: new Date(),
    vara_origem: "",
    natureza_ativo: "",
    honorarios_contratuais: 0,
    adiantamento_recebido: 0,
    percentual_adiantamento: 0,
    meses_execucao_anterior: 0,
    salario_minimo_referencia: 0,
    quantidade_salarios_minimos: 0,
    tem_desconto_pss: false,
    isencao_pss: true
} as unknown as DadosEntrada; // Cast simples pois datas serão convertidas

// Helper para converter string em Date (pois o código espera Date objects)
const dadosReais = {
    ...dadosTeste,
    data_base: new Date(dadosTeste.data_base),
    data_final_calculo: new Date(dadosTeste.data_final_calculo),
    data_inicial_calculo: new Date(dadosTeste.data_inicial_calculo),
}

const resultado = calcularPrecatorio(dadosReais);

console.log("-----------------------------------------");
console.log("RESULTADO TESTE EC 113/21");
console.log("-----------------------------------------");
console.log("Input Valor:", dadosTeste.valor_principal_original);
console.log("Input Data Base:", dadosTeste.data_base);
console.log("Input Data Final:", dadosTeste.data_final_calculo);
console.log("-----------------------------------------");
console.log("Valor Etapa A (IPCA):", resultado.memoria_calculo?.etapa_a_ipca.valor_corrigido_ipca.toFixed(2));
console.log("Fator Origem:", resultado.memoria_calculo?.etapa_a_ipca.fator_origem);
console.log("-----------------------------------------");
console.log("Soma SELIC (Etapa B):", resultado.memoria_calculo?.etapa_b_selic.soma_taxas_selic.toFixed(2) + "%");
console.log("Valor Final (Etapa B):", resultado.valor_atualizado.toFixed(2));
console.log("-----------------------------------------");

const esperado = 5111.85;
const diff = Math.abs(resultado.valor_atualizado - esperado);

if (diff <= 0.05) {
    console.log("✅ TESTE PASSOU! Diferença aceitável:", diff.toFixed(4));
} else {
    console.log("❌ TESTE FALHOU. Esperado:", esperado, "Obtido:", resultado.valor_atualizado.toFixed(2));
}
