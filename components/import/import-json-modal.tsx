'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileJson, Upload, Loader2, CheckCircle2, XCircle, Download } from 'lucide-react'
import { toast } from 'sonner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ImportJsonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ImportJsonModal({ open, onOpenChange, onSuccess }: ImportJsonModalProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<any>(null)
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setPreview(null)
    setResult(null)

    try {
      // Ler arquivo JSON
      const text = await file.text()
      const json = JSON.parse(text)

      // Validar estrutura
      if (!json.precatorios || !Array.isArray(json.precatorios)) {
        throw new Error('JSON inválido. Deve conter array "precatorios"')
      }

      // Enviar para API para preview
      const response = await fetch('/api/import/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          precatorios: json.precatorios,
          action: 'preview'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar JSON')
      }

      setPreview(data)
      toast.success('JSON validado!', {
        description: `${data.validos} válidos, ${data.invalidos} com erro`
      })

    } catch (error) {
      console.error('[Import JSON] Erro:', error)
      toast.error('Erro ao processar', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function handleCreate() {
    if (!preview) return

    setCreating(true)

    try {
      const response = await fetch('/api/import/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          precatorios: preview.preview.map((p: any) => p.dados),
          action: 'create'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar precatórios')
      }

      setResult(data.resultados)
      toast.success('Importação concluída!', {
        description: `${data.resultados.criados} criados, ${data.resultados.erros} com erro`
      })

      if (onSuccess) {
        onSuccess()
      }

    } catch (error) {
      console.error('[Import JSON Create] Erro:', error)
      toast.error('Erro ao criar', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    } finally {
      setCreating(false)
    }
  }

  function handleClose() {
    setPreview(null)
    setResult(null)
    onOpenChange(false)
  }

  function downloadTemplate() {
    const template = {
      precatorios: [
        {
          // Identificação
          numero_precatorio: "123456/2023",
          numero_processo: "0001234-56.2023.8.26.0100",
          numero_oficio: "OF-2023/001",
          
          // Tribunal e Devedor
          tribunal: "TJ-SP",
          devedor: "Prefeitura Municipal de São Paulo",
          esfera_devedor: "Municipal",
          
          // Credor (OBRIGATÓRIO)
          credor_nome: "João da Silva Santos",
          credor_cpf_cnpj: "12345678900",
          credor_profissao: "Servidor Público",
          credor_estado_civil: "Casado",
          credor_data_nascimento: "1980-05-15",
          
          // Cônjuge
          conjuge_nome: "Maria Silva Santos",
          conjuge_cpf_cnpj: "98765432100",
          
          // Advogado
          advogado_nome: "Dr. José Santos",
          advogado_cpf_cnpj: "11122233344",
          advogado_oab: "SP123456",
          
          // Valores (OBRIGATÓRIO: valor_principal)
          valor_principal: 50000.00,
          valor_juros: 5000.00,
          valor_atualizado: 55000.00,
          
          // Datas
          data_base: "2020-01-01",
          data_expedicao: "2023-06-15",
          
          // Dados Bancários
          banco: "Banco do Brasil",
          agencia: "1234-5",
          conta: "12345-6",
          tipo_conta: "corrente",
          
          // Endereço
          endereco_completo: "Rua das Flores, 123, Centro",
          cep: "01234567",
          cidade: "São Paulo",
          estado: "SP",
          
          // Observações
          observacoes: "Precatório alimentar com prioridade",
          contatos: "Tel: (11) 98765-4321 / Email: joao@email.com"
        },
        {
          // Exemplo 2: Mínimo (apenas obrigatórios)
          credor_nome: "Maria Oliveira",
          credor_cpf_cnpj: "98765432100",
          valor_principal: 75000.00
        }
      ]
    }

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template-precatorios.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Importar Precatórios via JSON
          </DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo JSON com os dados dos precatórios
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload */}
          {!preview && !result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Selecionar Arquivo JSON
                    </>
                  )}
                </Button>

                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Template
                </Button>
              </div>

              <div className="text-sm text-muted-foreground space-y-2">
                <p>📋 <strong>Formato esperado:</strong></p>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`{
  "precatorios": [
    {
      "credor_nome": "João Silva",
      "credor_cpf_cnpj": "12345678900",
      "valor_principal": 50000
    }
  ]
}`}
                </pre>
                <p className="text-xs">
                  💡 Clique em "Baixar Template" para ver todos os campos disponíveis
                </p>
              </div>
            </div>
          )}

          {/* Preview */}
          {preview && !result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Preview da Importação</p>
                  <p className="text-sm text-muted-foreground">
                    {preview.total} precatórios • {preview.validos} válidos • {preview.invalidos} com erro
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setPreview(null)}>
                  Cancelar
                </Button>
              </div>

              <ScrollArea className="h-[400px] border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Avisos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.preview.map((item: any) => (
                      <TableRow key={item.index}>
                        <TableCell>{item.index + 1}</TableCell>
                        <TableCell>{item.dados.credor_nome || '-'}</TableCell>
                        <TableCell>{item.dados.credor_cpf_cnpj || '-'}</TableCell>
                        <TableCell>
                          {item.dados.valor_principal ? 
                            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.dados.valor_principal) 
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {item.valido ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              OK
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Erro
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.avisos && item.avisos.length > 0 ? (
                            <div className="space-y-1">
                              {item.avisos.map((aviso: string, idx: number) => (
                                <div key={idx}>{aviso}</div>
                              ))}
                            </div>
                          ) : (
                            'Nenhum'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {/* Resultado */}
          {result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Resultado da Importação</p>
                  <p className="text-sm text-muted-foreground">
                    {result.criados} criados • {result.erros} com erro
                  </p>
                </div>
              </div>

              <ScrollArea className="h-[400px] border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mensagem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.detalhes.map((item: any) => (
                      <TableRow key={item.index}>
                        <TableCell>{item.index + 1}</TableCell>
                        <TableCell>{item.credor_nome}</TableCell>
                        <TableCell>
                          {item.sucesso ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Criado
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Erro
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.sucesso ? 'Precatório criado com sucesso' : item.erro}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          {preview && !result && (
            <>
              <Button variant="outline" onClick={() => setPreview(null)}>
                Voltar
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={creating || preview.validos === 0}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  `Criar ${preview.validos} Precatórios`
                )}
              </Button>
            </>
          )}
          {result && (
            <Button onClick={handleClose}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
