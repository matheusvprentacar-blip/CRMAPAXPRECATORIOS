"use client"

import { useState, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Camera, Upload, X } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface UploadFotoProps {
  fotoAtual: string | null
  nome: string
  onFotoChange: (fotoBase64: string) => void
}

export function UploadFoto({ fotoAtual, nome, onFotoChange }: UploadFotoProps) {
  const [preview, setPreview] = useState<string | null>(fotoAtual)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma imagem válida",
        variant: "destructive",
      })
      return
    }

    // Validar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 2MB",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Converter para base64
      const reader = new FileReader()
      
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        setPreview(base64)
        onFotoChange(base64)
        setLoading(false)
        
        toast({
          title: "Foto carregada",
          description: "Clique em 'Salvar Alterações' para confirmar",
        })
      }

      reader.onerror = () => {
        toast({
          title: "Erro",
          description: "Erro ao carregar a imagem",
          variant: "destructive",
        })
        setLoading(false)
      }

      reader.readAsDataURL(file)
    } catch (error) {
      console.error("[Upload Foto] Erro:", error)
      toast({
        title: "Erro",
        description: "Erro ao processar a imagem",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  const handleRemoverFoto = () => {
    setPreview(null)
    onFotoChange("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    
    toast({
      title: "Foto removida",
      description: "Clique em 'Salvar Alterações' para confirmar",
    })
  }

  const handleClickUpload = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
          <AvatarImage src={preview || undefined} />
          <AvatarFallback className="text-3xl bg-primary/10">
            {nome ? getInitials(nome) : "U"}
          </AvatarFallback>
        </Avatar>
        
        {preview && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-8 w-8 rounded-full shadow-lg"
            onClick={handleRemoverFoto}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClickUpload}
          disabled={loading}
        >
          {loading ? (
            <>
              <Upload className="w-4 h-4 mr-2 animate-pulse" />
              Carregando...
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 mr-2" />
              {preview ? "Trocar Foto" : "Adicionar Foto"}
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center max-w-xs">
        Formatos aceitos: JPG, PNG, GIF<br />
        Tamanho máximo: 2MB
      </p>
    </div>
  )
}
