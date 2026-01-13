/**
 * Error Tracker - Sistema de Rastreamento de Erros
 * 
 * Captura e loga erros detalhados do frontend e backend
 * para facilitar debugging e troubleshooting
 */

interface ErrorLog {
  timestamp: string
  type: 'supabase' | 'network' | 'react' | 'storage' | 'general'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  details: any
  stack?: string
  url?: string
  user?: string
  context?: Record<string, any>
}

class ErrorTracker {
  private logs: ErrorLog[] = []
  private maxLogs = 100
  private enabled = true

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupGlobalHandlers()
    }
  }

  /**
   * Configurar handlers globais de erro
   */
  private setupGlobalHandlers() {
    // Capturar erros não tratados
    window.addEventListener('error', (event) => {
      this.logError({
        type: 'general',
        severity: 'high',
        message: event.message,
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        },
        stack: event.error?.stack
      })
    })

    // Capturar promises rejeitadas
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        type: 'general',
        severity: 'high',
        message: 'Unhandled Promise Rejection',
        details: {
          reason: event.reason,
          promise: event.promise
        }
      })
    })

    // Interceptar console.error
    const originalError = console.error
    console.error = (...args) => {
      this.logError({
        type: 'general',
        severity: 'medium',
        message: 'Console Error',
        details: args
      })
      originalError.apply(console, args)
    }
  }

  /**
   * Logar erro
   */
  logError(error: Partial<ErrorLog>) {
    if (!this.enabled) return

    const log: ErrorLog = {
      timestamp: new Date().toISOString(),
      type: error.type || 'general',
      severity: error.severity || 'medium',
      message: error.message || 'Unknown error',
      details: error.details || {},
      stack: error.stack,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      context: error.context
    }

    this.logs.push(log)

    // Limitar número de logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // Logar no console em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      this.printError(log)
    }

    // Em produção, enviar para serviço de monitoramento
    // (Sentry, LogRocket, etc.)
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(log)
    }
  }

  /**
   * Logar erro do Supabase
   */
  logSupabaseError(operation: string, error: any, context?: Record<string, any>) {
    this.logError({
      type: 'supabase',
      severity: 'high',
      message: `Supabase Error: ${operation}`,
      details: {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        statusCode: error?.statusCode
      },
      context: {
        operation,
        ...context
      }
    })
  }

  /**
   * Logar erro de rede
   */
  logNetworkError(url: string, status: number, response: any, context?: Record<string, any>) {
    this.logError({
      type: 'network',
      severity: status >= 500 ? 'critical' : 'high',
      message: `Network Error: ${status}`,
      details: {
        url,
        status,
        response,
        method: context?.method || 'GET'
      },
      url,
      context
    })
  }

  /**
   * Logar erro de Storage
   */
  logStorageError(operation: string, error: any, context?: Record<string, any>) {
    this.logError({
      type: 'storage',
      severity: 'high',
      message: `Storage Error: ${operation}`,
      details: {
        error: error?.message || error,
        statusCode: error?.statusCode,
        name: error?.name
      },
      context: {
        operation,
        ...context
      }
    })
  }

  /**
   * Logar erro do React
   */
  logReactError(error: Error, errorInfo: any) {
    this.logError({
      type: 'react',
      severity: 'high',
      message: error.message,
      details: {
        componentStack: errorInfo?.componentStack,
        errorInfo
      },
      stack: error.stack
    })
  }

  /**
   * Imprimir erro formatado no console
   */
  private printError(log: ErrorLog) {
    const emoji = {
      low: '💡',
      medium: '⚠️',
      high: '🔴',
      critical: '🚨'
    }

    console.group(`${emoji[log.severity]} [${log.type.toUpperCase()}] ${log.message}`)
    console.log('⏰ Timestamp:', log.timestamp)
    console.log('📍 URL:', log.url)
    console.log('📊 Severity:', log.severity)
    
    if (log.context) {
      console.log('🔍 Context:', log.context)
    }
    
    console.log('📝 Details:', log.details)
    
    if (log.stack) {
      console.log('📚 Stack:', log.stack)
    }
    
    console.groupEnd()
  }

  /**
   * Enviar para serviço de monitoramento
   */
  private sendToMonitoring(log: ErrorLog) {
    // Implementar integração com Sentry, LogRocket, etc.
    // Exemplo:
    // Sentry.captureException(new Error(log.message), {
    //   extra: log.details,
    //   tags: { type: log.type, severity: log.severity }
    // })
  }

  /**
   * Obter todos os logs
   */
  getLogs(filter?: { type?: string; severity?: string; limit?: number }) {
    let filtered = this.logs

    if (filter?.type) {
      filtered = filtered.filter(log => log.type === filter.type)
    }

    if (filter?.severity) {
      filtered = filtered.filter(log => log.severity === filter.severity)
    }

    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit)
    }

    return filtered
  }

  /**
   * Limpar logs
   */
  clearLogs() {
    this.logs = []
  }

  /**
   * Exportar logs como JSON
   */
  exportLogs() {
    return JSON.stringify(this.logs, null, 2)
  }

  /**
   * Baixar logs como arquivo
   */
  downloadLogs() {
    const blob = new Blob([this.exportLogs()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `error-logs-${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Habilitar/desabilitar tracking
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  /**
   * Obter estatísticas
   */
  getStats() {
    const stats = {
      total: this.logs.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      last24h: 0
    }

    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    this.logs.forEach(log => {
      // Por tipo
      stats.byType[log.type] = (stats.byType[log.type] || 0) + 1
      
      // Por severidade
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1
      
      // Últimas 24h
      if (new Date(log.timestamp) > yesterday) {
        stats.last24h++
      }
    })

    return stats
  }
}

// Singleton
export const errorTracker = new ErrorTracker()

// Helper functions
export function trackSupabaseError(operation: string, error: any, context?: Record<string, any>) {
  errorTracker.logSupabaseError(operation, error, context)
}

export function trackNetworkError(url: string, status: number, response: any, context?: Record<string, any>) {
  errorTracker.logNetworkError(url, status, response, context)
}

export function trackStorageError(operation: string, error: any, context?: Record<string, any>) {
  errorTracker.logStorageError(operation, error, context)
}

export function trackError(message: string, details?: any, severity?: 'low' | 'medium' | 'high' | 'critical') {
  errorTracker.logError({
    type: 'general',
    severity: severity || 'medium',
    message,
    details
  })
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  (window as any).errorTracker = errorTracker
}
