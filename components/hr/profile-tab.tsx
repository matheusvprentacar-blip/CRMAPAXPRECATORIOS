"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Usuario } from "@/lib/types/database"
import { Checkbox } from "@/components/ui/checkbox"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { createBrowserClient } from "@/lib/supabase/client"
import { Loader2, Save } from "lucide-react"

const AVAILABLE_ROLES = [
    { value: "admin", label: "Administrador" },
    { value: "operador_comercial", label: "Operador Comercial" },
    { value: "operador_calculo", label: "Operador de Cálculo" },
    { value: "operador", label: "Operador" },
    { value: "analista", label: "Analista" },
    { value: "gestor", label: "Gestor" },
    { value: "gestor_certidoes", label: "Gestor de Certidões" },
    { value: "gestor_oficio", label: "Gestor de Ofícios" },
    { value: "juridico", label: "Jurídico" },
]

interface ProfileTabProps {
    user: Usuario
    onUpdate: () => void
}

export function ProfileTab({ user, onUpdate }: ProfileTabProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        nome: user.nome,
        email: user.email,
        telefone: user.telefone || "",
        role: user.role || [],
        position: user.position || "",
        admission_date: user.admission_date || "",
        // Bank info and address could be added here as JSON, keeping simple for now
    })
    const { toast } = useToast()

    function toggleRole(roleValue: string) {
        setFormData(prev => {
            const currentRoles = prev.role
            if (currentRoles.includes(roleValue)) {
                if (currentRoles.length === 1) {
                    toast({ title: "Aviso", description: "Colaborador deve ter pelo menos uma função.", variant: "secondary" })
                    return prev
                }
                return { ...prev, role: currentRoles.filter(r => r !== roleValue) }
            } else {
                return { ...prev, role: [...currentRoles, roleValue] }
            }
        })
    }

    async function handleSave() {
        setLoading(true)
        try {
            const supabase = createBrowserClient()

            const updates = {
                nome: formData.nome,
                telefone: formData.telefone,
                role: formData.role, // Assuming DB handles text[] updates
                position: formData.position,
                admission_date: formData.admission_date || null,
                updated_at: new Date().toISOString(),
            }

            // We might need to update auth metadata for roles as well via Edge Function if using JWT roles heavily
            // For now updating public.usuarios. The dashboard uses public.usuarios for role checks mostly if RoleGuard reads from context that reads from DB?
            // Actually RoleGuard usually checks auth token. We should ideally update both.
            // Re-using admin action for role update if possible, or just direct DB update if allowed.
            // Given the complexity of syncing, let's try direct update first and if possible call the action for role sync.

            const { error } = await supabase
                .from("usuarios")
                .update(updates)
                .eq("id", user.id)

            if (error) throw error

            // Call server action to sync auth roles if needed (omitted for brevity, assume DB trigger or separate sync)
            // Actually, in `actions.ts`, `updateUserRole` invokes 'admin-actions'. We should probably use that for roles.
            // But we are updating multiple fields.

            if (JSON.stringify(user.role.sort()) !== JSON.stringify(formData.role.sort())) {
                // Sync roles via edge function if they changed
                const { error: roleError } = await supabase.functions.invoke('admin-actions', {
                    body: { action: 'updateUserRole', userId: user.id, newRole: formData.role }
                })
                if (roleError) console.error("Failed to sync auth roles", roleError)
            }

            toast({ title: "Perfil atualizado", description: "As informações foram salvas com sucesso." })
            onUpdate()
        } catch (error: any) {
            toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Dados Pessoais</CardTitle>
                    <CardDescription>Informações básicas do colaborador</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nome Completo</Label>
                            <Input
                                value={formData.nome}
                                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                value={formData.email}
                                disabled
                                className="bg-muted"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Telefone / WhatsApp</Label>
                            <Input
                                value={formData.telefone}
                                onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                                placeholder="(00) 00000-0000"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Data de Admissão</Label>
                            <Input
                                type="date"
                                value={formData.admission_date}
                                onChange={e => setFormData({ ...formData, admission_date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Cargo / Posição</Label>
                            <Input
                                value={formData.position}
                                onChange={e => setFormData({ ...formData, position: e.target.value })}
                                placeholder="Ex: Analista Sênior"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Funções e Permissões</CardTitle>
                    <CardDescription>Defina o acesso do colaborador ao sistema</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {AVAILABLE_ROLES.map((role) => (
                            <div key={role.value} className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50 transition-colors">
                                <Checkbox
                                    id={`role-${role.value}`}
                                    checked={formData.role.includes(role.value)}
                                    onCheckedChange={() => toggleRole(role.value)}
                                />
                                <Label htmlFor={`role-${role.value}`} className="cursor-pointer flex-1">{role.label}</Label>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar Alterações
                </Button>
            </div>
        </div>
    )
}
