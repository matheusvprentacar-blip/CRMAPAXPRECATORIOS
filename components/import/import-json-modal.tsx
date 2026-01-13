'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileJson, Upload, Loader2, CheckCircle2, XCircle, Download } from 'lucide-react'
import { toast } from 'sonner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { createBrowserClient } from '@/lib/supabase/client'

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
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ==============================================================================
  // HELPERS DE VALIDAÇÃO (Locais)
  // ==============================================================================
  function normalizarCPFCNPJ(v: string) { return v.replace(/[^\d]/g, '') }

  function validarCPF(cpf: string) {
    cpf = cpf.replace(/[^\d]/g, '')
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
    let s = 0; for (let i = 0; i < 9; i++) s += parseInt(cpf.charAt(i)) * (10 - i);
    let r = 11 - (s % 11); let d1 = r >= 10 ? 0 : r;
    s = 0; for (let i = 0; i < 10; i++) s += parseInt(cpf.charAt(i)) * (11 - i);
    r = 11 - (s % 11); let d2 = r >= 10 ? 0 : r;
    return parseInt(cpf.charAt(9)) === d1 && parseInt(cpf.charAt(10)) === d2
  }

  function validarCNPJ(cnpj: string) {
    cnpj = cnpj.replace(/[^\d]/g, '')
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false
    return true // Validação simplificada
  }

  function normalizarData(v: string) {
    if (!v) return null
    const formats = [/(\d{2})\/(\d{2})\/(\d{4})/, /(\d{4})-(\d{2})-(\d{2})/, /(\d{2})-(\d{2})-(\d{4})/]
    for (const f of formats) {
      const m = v.match(f)
      if (m) return (f === formats[1]) ? m[0] : `${m[3]}-${m[2]}-${m[1]}`
    }
    return null
  }

  function confirmDate(target: any, key: string, value: string) {
    const d = normalizarData(value)
    if (d) target[key] = d
  }

  function confirmFloat(target: any, key: string, value: any) {
    if (!value) return
    const v = parseFloat(String(value))
    if (!isNaN(v)) target[key] = v
  }

  // ==============================================================================
  // PROCESSAMENTO DO ARQUIVO
  // ==============================================================================
  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setPreview(null)
    setResult(null)

    try {
      const text = await file.text()
      const json = JSON.parse(text)

      if (!json.precatorios || !Array.isArray(json.precatorios)) {
        throw new Error('JSON inválido. Deve conter array "precatorios"')
      }

      // Processamento Local (Preview)
      const processedPreview = json.precatorios.map((p: any, index: number) => {
        const avisos: string[] = []
        let temErro = false

        if (!p.credor_nome || !p.credor_nome.trim()) {
          temErro = true
          avisos.push('Nome do credor é obrigatório')
        }

        if (!p.credor_cpf_cnpj) {
          avisos.push('CPF/CNPJ não informado')
        } else {
          const cpfCnpj = normalizarCPFCNPJ(p.credor_cpf_cnpj)
          if (cpfCnpj.length === 11 && !validarCPF(cpfCnpj)) {
            temErro = true
            avisos.push('CPF inválido')
          } else if (cpfCnpj.length === 14 && !validarCNPJ(cpfCnpj)) {
            temErro = true
            avisos.push('CNPJ inválido')
          } else if (cpfCnpj.length > 0 && cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
            avisos.push('Formato inválido (esperado 11 ou 14 dígitos)')
          }
        }

        if (!p.valor_principal || p.valor_principal <= 0) {
          avisos.push('Valor principal não informado/inválido')
        }

        return { index, dados: p, avisos, valido: !temErro }
      })

      const totalValidos = processedPreview.filter((p: any) => p.valido).length

      setPreview({
        total: json.precatorios.length,
        validos: totalValidos,
        invalidos: json.precatorios.length - totalValidos,
        preview: processedPreview
      })

      // Selecionar válidos automaticamente
      const validIndices = new Set<number>(
        processedPreview
          .filter((p: any) => p.valido)
          .map((p: any) => p.index as number)
      )
      setSelectedIndices(validIndices)

      toast.success('Arquivo analisado com sucesso!')

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

  // ==============================================================================
  // CRIAÇÃO (INSERT)
  // ==============================================================================
  async function handleCreate() {
    if (!preview || selectedIndices.size === 0) return

    setCreating(true)

    // Preparar Supabase Client
    const supabase = createBrowserClient()
    if (!supabase) throw new Error('Cliente Supabase não inicializado')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const itemsToCreate = preview.preview
        .filter((p: any) => selectedIndices.has(p.index))

      const resultados = { total: itemsToCreate.length, criados: 0, erros: 0, detalhes: [] as any[] }

      // Processar em lote ou sequencial?
      // Sequencial é mais seguro para feedback de progresso e tratamento de erro individual
      for (let i = 0; i < itemsToCreate.length; i++) {
        const item = itemsToCreate[i]
        const precatorio = item.dados

        try {
          const dadosNormalizados: any = {
            titulo: precatorio.credor_nome?.trim(),
            credor_nome: precatorio.credor_nome?.trim(),
            criado_por: user.id,
            responsavel: user.id,
            status: 'novo',
            // Valores padrão se não existirem
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          // Campos Opcionais Strings
          const optFields = [
            'numero_precatorio', 'numero_processo', 'numero_oficio', 'tribunal',
            'devedor', 'esfera_devedor', 'credor_profissao', 'credor_estado_civil',
            'conjuge_nome', 'advogado_nome', 'advogado_oab',
            'banco', 'agencia', 'conta', 'tipo_conta', 'endereco_completo',
            'observacoes', 'contatos'
          ]

          optFields.forEach(f => {
            if (precatorio[f] && typeof precatorio[f] === 'string' && precatorio[f].trim()) {
              dadosNormalizados[f] = precatorio[f].trim()
            }
          })

          // Tratamentos Específicos
          if (precatorio.credor_cpf_cnpj) {
            const cpfCnpj = normalizarCPFCNPJ(precatorio.credor_cpf_cnpj)
            if (cpfCnpj) dadosNormalizados.credor_cpf_cnpj = cpfCnpj
          }

          if (precatorio.estado) dadosNormalizados.estado = precatorio.estado.trim().toUpperCase()

          if (precatorio.cep && typeof precatorio.cep === 'string') {
            dadosNormalizados.cep = precatorio.cep.replace(/\D/g, '')
          }

          // Datas
          if (precatorio.credor_data_nascimento) confirmDate(dadosNormalizados, 'credor_data_nascimento', precatorio.credor_data_nascimento)
          if (precatorio.data_base) confirmDate(dadosNormalizados, 'data_base', precatorio.data_base)
          if (precatorio.data_expedicao) confirmDate(dadosNormalizados, 'data_expedicao', precatorio.data_expedicao)

          // Valores Numéricos
          confirmFloat(dadosNormalizados, 'valor_principal', precatorio.valor_principal)
          confirmFloat(dadosNormalizados, 'valor_juros', precatorio.valor_juros)
          confirmFloat(dadosNormalizados, 'valor_atualizado', precatorio.valor_atualizado)

          // INSERT
          const { data: criado, error: insertError } = await supabase
            .from('precatorios')
            .insert(dadosNormalizados)
            .select()
            .single()

          if (insertError) throw insertError

          resultados.criados++
          resultados.detalhes.push({
            index: item.index,
            sucesso: true,
            credor_nome: dadosNormalizados.credor_nome,
            precatorio_id: criado.id
          })

        } catch (err: any) {
          console.error(`Erro ao criar item ${item.index}:`, err)
          resultados.erros++
          resultados.detalhes.push({
            index: item.index,
            sucesso: false,
            credor_nome: precatorio.credor_nome || 'Desconhecido',
            erro: err.message || 'Erro ao inserir'
          })
        }
      }

      setResult(resultados)

      if (resultados.criados > 0) {
        toast.success('Processamento concluído', {
          description: `${resultados.criados} precatórios criados com sucesso.`
        })
        if (onSuccess) onSuccess()
      } else {
        toast.warning('Nenhum precatório foi criado.')
      }

    } catch (error) {
      console.error('[Import Create] Erro Geral:', error)
      toast.error('Erro crítico na importação')
    } finally {
      setCreating(false)
    }
  }

  function toggleSelection(index: number) {
    const newSelected = new Set(selectedIndices)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedIndices(newSelected)
  }

  function toggleSelectAll() {
    if (!preview) return

    if (selectedIndices.size === preview.preview.filter((p: any) => p.valido).length) {
      setSelectedIndices(new Set<number>())
    } else {
      const allValid = new Set<number>(
        preview.preview
          .filter((p: any) => p.valido)
          .map((p: any) => p.index as number)
      )
      setSelectedIndices(allValid)
    }
  }

  function handleClose() {
    setPreview(null)
    setResult(null)
    setSelectedIndices(new Set())
    onOpenChange(false)
  }

  function downloadTemplate() {
    const template = {
      precatorios: [
        {
          numero_precatorio: "0000000-00.2024.8.00.0000",
          numero_processo: "0000000-00.2024.8.00.0000 (Obrigatório se não tiver precatório)",
          credor_nome: "Nome do Credor (Obrigatório)",
          credor_cpf_cnpj: "000.000.000-00",
          valor_principal: 10000.00,
          valor_atualizado: 12000.00,
          tribunal: "TJSP",
          esfera_devedor: "Estadual",
          devedor: "Fazenda Pública",
          observacoes: "Observações opcionais"
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
            Importar Precatórios via JSON (Local)
          </DialogTitle>
          <DialogDescription>
            Importação direta pelo navegador. Certifique-se de que os dados estão corretos.
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
                      Analisando...
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
      "valor_principal": 50000,
      ...
    }
  ]
}`}
                </pre>
              </div>
            </div>
          )}

          {/* Preview */}
          {preview && !result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Validar Dados</p>
                  <p className="text-sm text-muted-foreground">
                    {preview.total} encontrados • {selectedIndices.size} selecionados para importação
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                  >
                    {selectedIndices.size === preview.preview.filter((p: any) => p.valido).length
                      ? 'Desmarcar Todos'
                      : 'Selecionar Todos'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setPreview(null)
                    setSelectedIndices(new Set())
                  }}>
                    Cancelar
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[400px] border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIndices.size > 0 && selectedIndices.size === preview.preview.filter((p: any) => p.valido).length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Nome / Credor</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.preview.map((item: any) => (
                      <TableRow key={item.index}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIndices.has(item.index)}
                            onCheckedChange={() => toggleSelection(item.index)}
                            disabled={!item.valido}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{item.dados.credor_nome || 'Sem Nome'}</span>
                            <span className="text-xs text-muted-foreground">{item.dados.numero_processo || item.dados.numero_precatorio || 'Sem Nº'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.dados.valor_principal ?
                            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.dados.valor_principal)
                            : '-'}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{item.dados.credor_cpf_cnpj || '-'}</TableCell>
                        <TableCell>
                          {item.valido ? (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">OK</Badge>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <Badge variant="destructive">Inválido</Badge>
                              {item.avisos.map((avi: string, idx: number) => (
                                <span key={idx} className="text-[10px] text-red-500 leading-tight">{avi}</span>
                              ))}
                            </div>
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
                    {result.criados} criados com sucesso • {result.erros} erros
                  </p>
                </div>
              </div>

              <ScrollArea className="h-[400px] border rounded bg-muted/20">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mensagem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.detalhes.map((item: any) => (
                      <TableRow key={item.index}>
                        <TableCell>{item.credor_nome}</TableCell>
                        <TableCell>
                          {item.sucesso ? (
                            <Badge variant="default" className="bg-green-600">Criado</Badge>
                          ) : (
                            <Badge variant="destructive">Erro</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.sucesso ? 'Importado com sucesso' : item.erro}
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
            <Button
              onClick={handleCreate}
              disabled={creating || selectedIndices.size === 0}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando {selectedIndices.size} itens...
                </>
              ) : (
                `Confirmar Importação`
              )}
            </Button>
          )}
          {result && (
            <Button onClick={handleClose}>
              Concluir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
