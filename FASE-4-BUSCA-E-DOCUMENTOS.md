# 🔍 FASE 4: Busca Avançada + Gestão de Documentos

## 📋 Visão Geral

Implementação de duas melhorias críticas:
1. **Busca Global e Filtros Avançados** - Localizar precatórios por qualquer campo
2. **Gestão de Documentos** - Upload, download e controle de documentação

---

## 🎯 PARTE 1: BUSCA E FILTROS AVANÇADOS

### A) Busca Global (Texto Livre)

**Campos Pesquisáveis:**
- ✅ titulo
- ✅ numero_precatorio
- ✅ numero_processo
- ✅ numero_oficio
- ✅ tribunal
- ✅ devedor / esfera_devedor
- ✅ credor_nome
- ✅ credor_cpf_cnpj
- ✅ advogado_nome
- ✅ advogado_cpf_cnpj
- ✅ cessionario
- ✅ observacoes
- ✅ motivo_atraso_calculo
- ✅ responsavel_nome (via join)
- ✅ criador_nome (via join)

**Implementação:**
```sql
-- Função RPC para busca global
CREATE FUNCTION buscar_precatorios(termo TEXT)
RETURNS TABLE (...) AS $$
  SELECT * FROM precatorios_cards
  WHERE deleted_at IS NULL
    AND (
      titulo ILIKE '%' || termo || '%' OR
      numero_precatorio ILIKE '%' || termo || '%' OR
      numero_processo ILIKE '%' || termo || '%' OR
      -- ... todos os campos
    )
$$;
```

### B) Filtros Combináveis

**Filtros Disponíveis:**
1. **Status** (múltipla seleção)
   - novo, em_contato, em_calculo, finalizado, etc.

2. **Responsável Atual** (select)
   - Lista de operadores

3. **Criador** (select)
   - Lista de usuários

4. **Complexidade** (múltipla seleção)
   - baixa, media, alta

5. **SLA** (múltipla seleção)
   - no_prazo, atencao, atrasado, concluido

6. **Tipo de Atraso** (múltipla seleção)
   - titular_falecido, penhora, cessao_parcial, etc.

7. **Impacto do Atraso** (múltipla seleção)
   - baixo, medio, alto

8. **Intervalo de Datas**
   - Data de criação (de/até)
   - Data de entrada em cálculo (de/até)
   - Data de finalização (de/até)

9. **Faixa de Valores**
   - Valor principal (mín/máx)
   - Valor atualizado (mín/máx)

10. **Flags Especiais** (checkboxes)
    - Urgente
    - Titular falecido
    - Com penhora
    - Com cessão

**Componente UI:**
```typescript
<AdvancedFilters
  onFilterChange={handleFilterChange}
  activeFilters={filters}
  onClearFilters={clearFilters}
/>
```

### C) Indicadores Visuais

**Filtros Ativos:**
```
[Status: em_calculo] [Complexidade: alta] [x Limpar Filtros]
```

**Contador de Resultados:**
```
Mostrando 15 de 150 precatórios
```

---

## 📄 PARTE 2: GESTÃO DE DOCUMENTOS

### A) Estrutura de Dados

**Tabela: documentos_precatorio**
```sql
CREATE TABLE documentos_precatorio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  precatorio_id UUID NOT NULL REFERENCES precatorios(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  tamanho_bytes BIGINT,
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  storage_url TEXT,
  enviado_por UUID REFERENCES usuarios(id),
  observacao TEXT,
  opcional BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_documentos_precatorio_id ON documentos_precatorio(precatorio_id);
CREATE INDEX idx_documentos_tipo ON documentos_precatorio(tipo_documento);
```

### B) Tipos de Documentos

**Enum: tipo_documento**
```typescript
enum TipoDocumento {
  OFICIO_REQUISITORIO = 'oficio_requisitorio',
  CREDOR_RG = 'credor_rg',
  CREDOR_CPF = 'credor_cpf',
  CERTIDAO_CASAMENTO = 'certidao_casamento',
  CERTIDAO_NASCIMENTO = 'certidao_nascimento',
  COMPROVANTE_RESIDENCIA = 'comprovante_residencia',
  PROFISSAO_CREDOR = 'profissao_credor',
  PROFISSAO_CONJUGE = 'profissao_conjuge',
  DADOS_BANCARIOS = 'dados_bancarios',
  CERTIDAO_NEGATIVA_MUNICIPAL = 'certidao_negativa_municipal',
  CERTIDAO_NEGATIVA_ESTADUAL = 'certidao_negativa_estadual',
  CERTIDAO_NEGATIVA_FEDERAL = 'certidao_negativa_federal',
  DOCUMENTO_CONJUGE = 'documento_conjuge',
  DOCUMENTO_ADVOGADO = 'documento_advogado',
  OUTROS = 'outros'
}
```

### C) Componentes UI

**1. Seção Documentos (no detalhe do precatório)**
```typescript
<DocumentosSection
  precatorioId={id}
  documentos={documentos}
  onUpload={handleUpload}
  onDownload={handleDownload}
  onDelete={handleDelete}
/>
```

**2. Modal de Upload**
```typescript
<UploadDocumentoModal
  open={modalOpen}
  onClose={() => setModalOpen(false)}
  onUpload={handleUploadSubmit}
  tiposDocumento={TIPOS_DOCUMENTO}
/>
```

**3. Checklist de Documentos**
```typescript
<ChecklistDocumentos
  precatorioId={id}
  documentosAnexados={documentos}
  tiposObrigatorios={TIPOS_OBRIGATORIOS}
/>
```

### D) Storage (Supabase)

**Bucket: precatorios-documentos**
```typescript
// Estrutura de pastas
precatorios-documentos/
  {precatorio_id}/
    {tipo_documento}/
      {timestamp}_{nome_arquivo}
```

**Validações:**
- Tamanho máximo: 10MB por arquivo
- Extensões aceitas: .pdf, .jpg, .jpeg, .png, .doc, .docx
- Nome do arquivo: sanitizado (sem caracteres especiais)

### E) Permissões (RLS)

```sql
-- Usuários podem ver documentos dos precatórios que têm acesso
CREATE POLICY "Ver documentos" ON documentos_precatorio
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM precatorios p
      WHERE p.id = documentos_precatorio.precatorio_id
        AND (
          p.criado_por = auth.uid() OR
          p.responsavel = auth.uid() OR
          p.responsavel_calculo_id = auth.uid() OR
          is_admin()
        )
    )
  );

-- Usuários podem anexar documentos aos precatórios que têm acesso
CREATE POLICY "Anexar documentos" ON documentos_precatorio
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM precatorios p
      WHERE p.id = documentos_precatorio.precatorio_id
        AND (
          p.criado_por = auth.uid() OR
          p.responsavel = auth.uid() OR
          p.responsavel_calculo_id = auth.uid() OR
          is_admin()
        )
    )
  );

-- Apenas admin ou quem anexou pode remover
CREATE POLICY "Remover documentos" ON documentos_precatorio
  FOR DELETE USING (
    enviado_por = auth.uid() OR is_admin()
  );
```

---

## 📊 Arquivos a Criar/Modificar

### Scripts SQL (3):
1. ✅ `scripts/48-busca-avancada.sql` - Função de busca global
2. ✅ `scripts/49-tabela-documentos.sql` - Tabela e RLS
3. ✅ `scripts/50-bucket-documentos.sql` - Configuração do bucket

### Componentes React (8):
1. ✅ `components/precatorios/advanced-filters.tsx` - Painel de filtros
2. ✅ `components/precatorios/filter-badge.tsx` - Badge de filtro ativo
3. ✅ `components/precatorios/documentos-section.tsx` - Seção de documentos
4. ✅ `components/precatorios/upload-documento-modal.tsx` - Modal de upload
5. ✅ `components/precatorios/checklist-documentos.tsx` - Checklist
6. ✅ `components/precatorios/documento-card.tsx` - Card de documento
7. ✅ `components/ui/file-upload.tsx` - Componente de upload
8. ✅ `lib/utils/documento-upload.ts` - Utilitários de upload

### Páginas Modificadas (3):
1. ✅ `app/(dashboard)/precatorios/page.tsx` - Adicionar filtros
2. ✅ `app/(dashboard)/calculo/page.tsx` - Adicionar busca
3. ✅ `app/(dashboard)/precatorios/[id]/page.tsx` - Adicionar seção documentos

### Types (1):
1. ✅ `lib/types/documento.ts` - Interfaces de documentos

---

## 🔄 Fluxo de Implementação

### ETAPA 1: Busca e Filtros (Estimativa: 2-3h)
1. Criar função SQL de busca global
2. Criar componente AdvancedFilters
3. Integrar na listagem de precatórios
4. Integrar na fila de cálculo
5. Testar performance

### ETAPA 2: Estrutura de Documentos (Estimativa: 1-2h)
1. Criar tabela documentos_precatorio
2. Configurar bucket no Supabase
3. Criar RLS policies
4. Criar types TypeScript

### ETAPA 3: Upload de Documentos (Estimativa: 2-3h)
1. Criar modal de upload
2. Implementar lógica de upload
3. Validações (tamanho, tipo)
4. Integrar com storage

### ETAPA 4: Visualização e Download (Estimativa: 1-2h)
1. Criar seção de documentos
2. Listar documentos anexados
3. Implementar download
4. Implementar remoção

### ETAPA 5: Checklist (Estimativa: 1h)
1. Criar componente de checklist
2. Lógica de controle
3. Indicadores visuais

**TOTAL ESTIMADO: 7-11 horas**

---

## ✅ Checklist de Implementação

### Busca e Filtros:
- [ ] Script SQL 48 criado
- [ ] Função buscar_precatorios() implementada
- [ ] Componente AdvancedFilters criado
- [ ] Integrado na listagem
- [ ] Integrado na fila de cálculo
- [ ] Indicadores de filtros ativos
- [ ] Botão limpar filtros
- [ ] Performance testada

### Documentos:
- [ ] Script SQL 49 criado
- [ ] Tabela documentos_precatorio criada
- [ ] Script SQL 50 criado
- [ ] Bucket configurado
- [ ] RLS policies criadas
- [ ] Types TypeScript criados
- [ ] Modal de upload criado
- [ ] Seção de documentos criada
- [ ] Download implementado
- [ ] Remoção implementada
- [ ] Checklist criado
- [ ] Validações implementadas

---

## 🎯 Critérios de Sucesso

### Busca:
- ✅ Busca retorna resultados em < 1s
- ✅ Busca funciona com texto parcial
- ✅ Filtros combinam corretamente (AND)
- ✅ Indicadores visuais claros
- ✅ Performance mantida com 1000+ registros

### Documentos:
- ✅ Upload funciona para todos os tipos
- ✅ Download funciona corretamente
- ✅ Validações impedem uploads inválidos
- ✅ Checklist mostra status correto
- ✅ Permissões respeitadas (RLS)
- ✅ Storage organizado por precatório

---

**Status:** 📋 Planejamento Completo  
**Próximo Passo:** Iniciar ETAPA 1 (Busca e Filtros)  
**Data:** Janeiro 2025
