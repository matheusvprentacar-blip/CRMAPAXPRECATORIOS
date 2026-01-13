import { toast as sonnerToast } from "sonner"

export type ToastInput = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
  duration?: number
}

export function toast(input: ToastInput | string) {
  if (typeof input === "string") {
    sonnerToast(input)
    return
  }

  const title = input.title ?? ""
  const description = input.description
  const duration = input.duration

  if (input.variant === "destructive") {
    sonnerToast.error(title, { description, duration })
  } else {
    sonnerToast(title, { description, duration })
  }
}

export function useToast() {
  return { toast }
}
