# 📋 TEMPLATE DE IMPORTAÇÃO - JSON

## 🎯 COMO FUNCIONA

1. Você prepara seus dados em JSON (fora do sistema)
2. Faz upload do arquivo JSON
3. Sistema mostra preview
4. Você confirma e cria todos de uma vez

**SEM IA, SEM COMPLICAÇÃO!**

---

## 📄 TEMPLATE JSON

Copie e cole este template:

```json
{
  "precatorios": [
    {
      "numero_precatorio": "123456/2023",
      "numero_processo": "0001234-56.2023.8.26.0100",
      "tribunal": "TJ-SP",
      "devedor": "Prefeitura Municipal de São Paulo",
      "credor_nome": "João da Silva",
      "credor_cpf_cnpj": "12345678900",
      "valor_principal": 50000.00,
      "data_base": "2020-01-01",
      "advogado_nome": "Dr. José Santos",
      "advogado_oab": "SP123456",
      "observacoes": "Precatório alimentar"
    },
    {
      "numero_precatorio": "789012/2023",
      "numero_processo": "0007890-12.2023.8.26.0200",
      "tribunal": "TJ-SP",
      "devedor": "Estado de São Paulo",
      "credor_nome": "Maria Oliveira",
      "credor_cpf_cnpj": "98765432100",
      "valor_principal": 75000.00,
      "data_base": "2021-03-15",
      "advogado_nome": "Dra. Ana Costa",
      "advogado_oab": "SP654321",
      "observacoes": "Precatório comum"
    }
  ]
}
```

---

## 📋 CAMPOS DISPONÍVEIS

### **Obrigatórios:**
- `credor_nome` (string)
- `credor_cpf_cnpj` (string - apenas números)
- `valor_principal` (number)

### **Opcionais:**
- `numero_precatorio` (string)
- `numero_processo` (string)
- `numero_oficio` (string)
- `tribunal` (string)
- `devedor` (string)
- `esfera_devedor` (string)
- `credor_profissao` (string)
- `credor_estado_civil` (string)
- `credor_data_nascimento` (string - formato: YYYY-MM-DD)
- `conjuge_nome` (string)
- `conjuge_cpf_cnpj` (string)
- `advogado_nome` (string)
- `advogado_cpf_cnpj` (string)
- `advogado_oab` (string)
- `valor_juros` (number)
- `valor_atualizado` (number)
- `data_base` (string - formato: YYYY-MM-DD)
- `data_expedicao` (string - formato: YYYY-MM-DD)
- `banco` (string)
- `agencia` (string)
- `conta` (string)
- `tipo_conta` (string - "corrente" ou "poupanca")
- `endereco_completo` (string)
- `cep` (string)
- `cidade` (string)
- `estado` (string - sigla: SP, RJ, etc)
- `observacoes` (string)
- `contatos` (string)

---

## 💡 EXEMPLOS

### **Exemplo 1: Mínimo (apenas obrigatórios)**
```json
{
  "precatorios": [
    {
      "credor_nome": "João Silva",
      "credor_cpf_cnpj": "12345678900",
      "valor_principal": 50000
    }
  ]
}
```

### **Exemplo 2: Completo**
```json
{
  "precatorios": [
    {
      "numero_precatorio": "123456/2023",
      "numero_processo": "0001234-56.2023.8.26.0100",
      "numero_oficio": "OF-2023/001",
      "tribunal": "TJ-SP",
      "devedor": "Prefeitura Municipal de São Paulo",
      "esfera_devedor": "Municipal",
      "credor_nome": "João da Silva Santos",
      "credor_cpf_cnpj": "12345678900",
      "credor_profissao": "Servidor Público",
      "credor_estado_civil": "Casado",
      "credor_data_nascimento": "1980-05-15",
      "conjuge_nome": "Maria Silva Santos",
      "conjuge_cpf_cnpj": "98765432100",
      "advogado_nome": "Dr. José Santos",
      "advogado_cpf_cnpj": "11122233344",
      "advogado_oab": "SP123456",
      "valor_principal": 50000.00,
      "valor_juros": 5000.00,
      "valor_atualizado": 55000.00,
      "data_base": "2020-01-01",
      "data_expedicao": "2023-06-15",
      "banco": "Banco do Brasil",
      "agencia": "1234-5",
      "conta": "12345-6",
      "tipo_conta": "corrente",
      "endereco_completo": "Rua das Flores, 123, Centro",
      "cep": "01234567",
      "cidade": "São Paulo",
      "estado": "SP",
      "observacoes": "Precatório alimentar com prioridade",
      "contatos": "Tel: (11) 98765-4321"
    }
  ]
}
```

### **Exemplo 3: Múltiplos precatórios**
```json
{
  "precatorios": [
    {
      "credor_nome": "João Silva",
      "credor_cpf_cnpj": "12345678900",
      "valor_principal": 50000,
      "tribunal": "TJ-SP"
    },
    {
      "credor_nome": "Maria Santos",
      "credor_cpf_cnpj": "98765432100",
      "valor_principal": 75000,
      "tribunal": "TJ-RJ"
    },
    {
      "credor_nome": "Pedro Costa",
      "credor_cpf_cnpj": "11122233344",
      "valor_principal": 30000,
      "tribunal": "TRF-3"
    }
  ]
}
```

---

## ✅ VALIDAÇÕES

O sistema valida automaticamente:
- ✅ CPF/CNPJ válido
- ✅ Valores numéricos
- ✅ Datas no formato correto
- ✅ Campos obrigatórios presentes

---

## 🚀 COMO USAR

1. **Prepare seu JSON** usando o template acima
2. **Salve como arquivo** (ex: `precatorios.json`)
3. **Acesse** `/precatorios` no sistema
4. **Clique** em "Importar JSON"
5. **Selecione** seu arquivo
6. **Revise** o preview
7. **Confirme** para criar todos

---

## 📝 DICAS

### **Para converter Excel para JSON:**
Use ferramentas online como:
- https://www.convertcsv.com/csv-to-json.htm
- https://beautifytools.com/excel-to-json-converter.php

### **Para validar seu JSON:**
Use: https://jsonlint.com/

### **Formato de datas:**
Sempre use: `YYYY-MM-DD` (ex: `2023-12-25`)

### **CPF/CNPJ:**
Apenas números, sem pontos ou traços (ex: `12345678900`)

### **Valores:**
Use ponto para decimal (ex: `50000.50`)

---

**Simples, rápido e sem complicação!**
