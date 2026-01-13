# 🔍 Guia: Error Tracker - Sistema de Rastreamento de Erros

## 📋 Visão Geral

O Error Tracker é um sistema de rastreamento de erros que captura e loga automaticamente todos os erros do frontend, facilitando debugging e troubleshooting.

---

## ✅ Implementado

### 1. Utilitário Principal
**`lib/utils/error-tracker.ts`** ✅
- Captura erros globais (window.error)
- Captura promises rejeitadas
- Intercepta console.error
- Categoriza erros (supabase, network, storage, react, general)
- Severidade (low, medium, high, critical)
- Logs detalhados com contexto

### 2. Integração nos Componentes
**`components/admin/upload-oficios-modal.tsx`** ✅
- Rastreia erros de Storage
- Rastreia erros de Supabase
- Logs detalhados de cada etapa do upload

**`app/(dashboard)/admin/precatorios/page.tsx`** ✅
- Rastreia erros de carregamento
- Rastreia erros de distribuição
- Rastreia erros de exclusão

---

## 🎯 Como Usar

### No Console do Navegador

#### Ver Todos os Erros
```javascript
errorTracker.getLogs()
```

#### Filtrar por Tipo
```javascript
// Apenas erros do Supabase
errorTracker.getLogs({ type: 'supabase' })

// Apenas erros de Storage
errorTracker.getLogs({ type: 'storage' })

// Apenas erros de rede
errorTracker.getLogs({ type: 'network' })
```

#### Filtrar por Severidade
```javascript
// Apenas erros críticos
errorTracker.getLogs({ severity: 'critical' })

// Apenas erros altos
errorTracker.getLogs({ severity: 'high' })
```

#### Últimos N Erros
```javascript
// Últimos 10 erros
errorTracker.getLogs({ limit: 10 })
```

#### Ver Estatísticas
```javascript
errorTracker.getStats()
// Retorna:
// {
//   total: 15,
//   byType: { supabase: 5, storage: 3, network: 7 },
//   bySeverity: { high: 10, critical: 5 },
//   last24h: 12
// }
```

#### Baixar Logs
```javascript
errorTracker.downloadLogs()
// Baixa arquivo JSON com todos os logs
```

#### Limpar Logs
```javascript
errorTracker.clearLogs()
```

---

## 📊 Formato dos Logs

Cada erro é logado com:

```javascript
{
  timestamp: "2024-01-10T15:30:00.000Z",
  type: "supabase",  // supabase, storage, network, react, general
  severity: "high",  // low, medium, high, critical
  message: "Supabase Error: select precatorios admin",
  details: {
    code: "PGRST116",
    message: "...",
    hint: "...",
    statusCode: 400
  },
  stack: "Error: ...\n  at ...",
  url: "http://localhost:3000/admin/precatorios",
  context: {
    operation: "select precatorios admin",
    userId: "c927ea68-7299-4406-a17a-d9b77498964c"
  }
}
```

---

## 🔧 Exemplo de Uso no Código

### Rastrear Erro do Supabase
```typescript
import { trackSupabaseError } from '@/lib/utils/error-tracker'

const { data, error } = await supabase
  .from('precatorios')
  .select('*')

if (error) {
  trackSupabaseError('select precatorios', error, {
    userId: user.id,
    filters: { status: 'novo' }
  })
  throw error
}
```

### Rastrear Erro de Storage
```typescript
import { trackStorageError } from '@/lib/utils/error-tracker'

const { error } = await supabase.storage
  .from('documentos')
  .upload('file.pdf', file)

if (error) {
  trackStorageError('upload', error, {
    fileName: 'file.pdf',
    fileSize: file.size
  })
  throw error
}
```

### Rastrear Erro Genérico
```typescript
import { trackError } from '@/lib/utils/error-tracker'

try {
  // código
} catch (error) {
  trackError('Erro ao processar', {
    error,
    additionalInfo: '...'
  }, 'high')
}
```

---

## 🎨 Logs Formatados no Console

Os erros aparecem formatados no console:

```
🔴 [SUPABASE] Supabase Error: select precatorios admin
  ⏰ Timestamp: 2024-01-10T15:30:00.000Z
  📍 URL: http://localhost:3000/admin/precatorios
  📊 Severity: high
  🔍 Context: { operation: "select precatorios admin", userId: "..." }
  📝 Details: { code: "PGRST116", message: "...", ... }
  📚 Stack: Error: ...
```

---

## 🚀 Benefícios

✅ **Debugging Facilitado**: Todos os erros em um só lugar
✅ **Contexto Rico**: Informações detalhadas de cada erro
✅ **Categorização**: Erros organizados por tipo e severidade
✅ **Histórico**: Mantém últimos 100 erros
✅ **Exportação**: Baixa logs como JSON
✅ **Estatísticas**: Visão geral dos erros

---

## 📈 Próximos Passos

### Integração com Serviços de Monitoramento

Descomente e configure em `lib/utils/error-tracker.ts`:

```typescript
private sendToMonitoring(log: ErrorLog) {
  // Sentry
  Sentry.captureException(new Error(log.message), {
    extra: log.details,
    tags: { type: log.type, severity: log.severity }
  })
  
  // LogRocket
  LogRocket.captureException(new Error(log.message), {
    extra: log.details
  })
}
```

---

## 🧪 Testar Error Tracker

1. Abra o console do navegador (F12)
2. Digite: `errorTracker.getStats()`
3. Faça upload de um PDF (vai gerar erros se bucket não existir)
4. Digite: `errorTracker.getLogs({ type: 'storage' })`
5. Veja os erros detalhados
6. Digite: `errorTracker.downloadLogs()` para baixar

---

## 📝 Exemplo de Saída

```javascript
// errorTracker.getLogs({ type: 'storage', limit: 1 })
[
  {
    timestamp: "2024-01-10T15:30:00.000Z",
    type: "storage",
    severity: "high",
    message: "Storage Error: upload",
    details: {
      error: "Bucket not found",
      statusCode: 400,
      name: "StorageApiError"
    },
    url: "http://localhost:3000/admin/precatorios",
    context: {
      operation: "upload",
      fileName: "1768109387622-wvoqyf-teste1.pdf",
      fileSize: 245678,
      fileType: "application/pdf"
    }
  }
]
```

---

## ✨ Resultado

Agora você tem:
- 🔍 Rastreamento automático de erros
- 📊 Logs detalhados e categorizados
- 🎯 Debugging mais rápido e eficiente
- 📈 Estatísticas de erros
- 💾 Exportação de logs
