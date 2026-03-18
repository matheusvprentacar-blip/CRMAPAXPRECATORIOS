# Guia de Módulos - CRMAPAXPRECATORIOS

Este guia detalha a responsabilidade de cada pasta principal do projeto.

## 📁 `app/` (Next.js App Router)
As rotas são organizadas por grupos de parênteses para layouts compartilhados.
- **`(dashboard)/`:** Contém todos os módulos de negócio (precatorios, clientes, financeiro, juridico).
- **`(auth)/`:** Lógica de entrada e autenticação.
- **`api/`:** Proxies e endpoints para integrações que não podem rodar no client (ex: Gemini, Webhooks).

## 📁 `components/` (Interface)
- **`ui/`:** Componentes atômicos (Button, Input, Card) baseados em Shadcn/HeroUI.
- **`kanban/`:** Implementação complexa de quadros de arrastar e soltar usando `@hello-pangea/dnd`.
- **`calculo/`:** Componentes de interface para os diversos simuladores financeiros.

## 📁 `services/` (Lógica de Integração)
- **`finance-service.ts`:** Centraliza cálculos e chamadas relacionadas a ativos.
- **`market-data/`:** Módulos para buscar taxas (SELIC, IPCA) de fontes externas.

## 📁 `lib/` (Core Utilities)
- **`supabase/`:** Configuração do cliente Supabase para browser e servidor.
- **`calculos/`:** O "Motor" do sistema. Scripts puramente matemáticos para juros e mora.
- **`utils/`:** Formatadores de data, moeda e máscaras de entrada.

## 📁 `precatorio_ocr_pipeline/` (Inteligência)
- **`pipeline.py`:** Orquestrador que recebe um PDF e devolve um JSON estruturado.
- **`llm_resolver.py`:** Integração com Gemini Pro para limpeza e normalização dos dados do OCR.

## 📁 `supabase/` (Banco de Dados)
- **`migrations/`:** Histórico de evolução do esquema. Fundamental para subir novos ambientes.
