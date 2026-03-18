# Esquema do Banco de Dados - CRM Precatórios

O sistema utiliza o **Supabase (PostgreSQL)** como base de dados robusta, com lógica de negócio implementada via Funções SQL, Triggers e Políticas de Segurança (RLS).

## 📊 Tabelas Principais

### `usuarios`
Estende o `auth.users` do Supabase com metadados do CRM.
- **Campos**: `id`, `nome`, `email`, `role`, `foto_url`, `ativo`.
- **Roles**: `admin`, `operador_comercial`, `operador_calculo`, `analista`, `gestor`.

### `precatorios`
A tabela central que armazena todos os ativos judiciais.
- **Identificação**: Título, números (precatório, processo, ofício), tribunal, devedor.
- **Valores**: Principal, juros, SELIC, valor atualizado, saldo líquido.
- **Workflow**: `status` (novo, em_calculo, calculado, aguardando_cliente, concluido, cancelado), `localizacao_kanban`.
- **Responsáveis**: `dono_usuario_id`, `responsavel_calculo_id`.

### `atividades`
Log de auditoria e histórico de alterações em cada precatório.
- **Tipos**: Criação, atualização, cálculo, mudança de status/localização.

### `comentarios`
Sistema de chat interno e anotações vinculadas aos precatórios.

### `financeiro` / `economic_indices`
Armazena dados para simulações financeiras e índices como IPCA e SELIC para atualização de valores.

---

## 🔒 Row Level Security (RLS)

O banco é protegido por políticas granulares para garantir que:
- **Administradores**: Têm acesso total de leitura e escrita em tudo.
- **Operadores Comerciais**: Veem e editam apenas os precatórios onde são os "donos" (`dono_usuario_id`).
- **Operadores de Cálculo**: Veem e editam apenas os precatórios atribuídos a eles para cálculo (`responsavel_calculo_id`).
- **Usuários em Geral**: Podem visualizar seu próprio perfil e comentários onde participam.

---

## ⚙️ Lógica em Banco (SQL)

### Score de Complexidade
Implementada via função SQL que analisa critérios (ex: herdeiros, complexidade de cálculo) e atribui uma nota de 0-100, classificando em **Baixa**, **Média** ou **Alta**.

### SLA de Cálculo
Triggers que monitoram o tempo que um precatório permanece em cada fase e alertam caso extrapole o prazo definido pela complexidade.

### View `precatorios_cards`
Uma visualização otimizada que unifica dados de várias tabelas (nomes de credores, responsáveis, status do Kanban) para carregamento rápido no frontend.
