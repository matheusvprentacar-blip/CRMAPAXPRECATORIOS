"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CurrencyInput } from "@/components/ui/currency-input"
import { ArrowLeft, Save } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"
import { savePrecatorio } from "@/lib/storage/local-storage"
import type { Precatorio } from "@/lib/types/database"

export default function NovoPrecatorioPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Precatorio>>({
    status: "novo",
    prioridade: "media",
  })

  useEffect(() => {
    async function loadUserRole() {
      const supabase = getSupabase()
      if (supabase) {
        const { data: userData } = await supabase.auth.getUser()
        if (userData.user) {
          const { data: perfil } = await supabase.from("usuarios").select("role").eq("id", userData.user.id).single()
          setUserRole(perfil?.role || null)
        }
      }
    }
    loadUserRole()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const supabase = getSupabase()

      if (supabase) {
        const { data: userData } = await supabase.auth.getUser()
        const precatorioData: any = {
          titulo: formData.titulo,
          numero_precatorio: formData.numero_precatorio,
          numero_processo: formData.numero_processo,
          numero_oficio: formData.numero_oficio,
          devedor: formData.devedor,
          credor_nome: formData.credor_nome,
          credor_cpf_cnpj: formData.credor_cpf_cnpj,
          valor_principal: formData.valor_principal,
          data_base: formData.data_base,
          data_expedicao: formData.data_expedicao,
          contatos: formData.contatos,
          criado_por: userData.user?.id,
          responsavel: userData.user?.id, // Satisfy 'Comercial insere seus' RLS check
          status: "novo",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        if (userRole === "admin" && formData.tribunal) {
          precatorioData.tribunal = formData.tribunal
        }

        const { error } = await supabase.from("precatorios").insert([precatorioData])

        if (error) throw error
      } else {
        savePrecatorio(formData as Precatorio)
      }

      router.push("/precatorios")
    } catch (error) {
      console.error("[Novo Precatorio] Erro ao salvar:", error)
      alert("Erro ao salvar precatório")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo Precatório</h1>
          <p className="text-muted-foreground">Cadastre um novo precatório no sistema</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>Dados principais do precatório</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título *</Label>
                  <Input
                    id="titulo"
                    required
                    value={formData.titulo || ""}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero_precatorio">Número do Precatório *</Label>
                  <Input
                    id="numero_precatorio"
                    required
                    value={formData.numero_precatorio || ""}
                    onChange={(e) => setFormData({ ...formData, numero_precatorio: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero_processo">Número do Processo</Label>
                  <Input
                    id="numero_processo"
                    value={formData.numero_processo || ""}
                    onChange={(e) => setFormData({ ...formData, numero_processo: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero_oficio">Número do Ofício</Label>
                  <Input
                    id="numero_oficio"
                    value={formData.numero_oficio || ""}
                    onChange={(e) => setFormData({ ...formData, numero_oficio: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {userRole === "admin" && (
                  <div className="space-y-2">
                    <Label htmlFor="tribunal">Tribunal</Label>
                    <Input
                      id="tribunal"
                      placeholder="Ex: TJ-SP, TRF-1, TRF-2, etc"
                      value={formData.tribunal || ""}
                      onChange={(e) => setFormData({ ...formData, tribunal: e.target.value })}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="devedor">Devedor *</Label>
                  <Input
                    id="devedor"
                    required
                    value={formData.devedor || ""}
                    onChange={(e) => setFormData({ ...formData, devedor: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações do Credor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="credor_nome">Nome do Credor *</Label>
                  <Input
                    id="credor_nome"
                    required
                    value={formData.credor_nome || ""}
                    onChange={(e) => setFormData({ ...formData, credor_nome: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="credor_cpf_cnpj">CPF/CNPJ do Credor *</Label>
                  <Input
                    id="credor_cpf_cnpj"
                    required
                    value={formData.credor_cpf_cnpj || ""}
                    onChange={(e) => setFormData({ ...formData, credor_cpf_cnpj: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Valores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valor_principal">Valor Principal *</Label>
                  <CurrencyInput
                    id="valor_principal"
                    required
                    value={formData.valor_principal || 0}
                    onChange={(value) => setFormData({ ...formData, valor_principal: value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_base">Data Base</Label>
                  <Input
                    id="data_base"
                    type="date"
                    value={formData.data_base || ""}
                    onChange={(e) => setFormData({ ...formData, data_base: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_expedicao">Data de Expedição</Label>
                  <Input
                    id="data_expedicao"
                    type="date"
                    value={formData.data_expedicao || ""}
                    onChange={(e) => setFormData({ ...formData, data_expedicao: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Adicione observações sobre este precatório..."
                value={(formData.contatos || []).map((c: any) => String(c)).join("\n")}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contatos: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }


                rows={4}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Salvar Precatório"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
