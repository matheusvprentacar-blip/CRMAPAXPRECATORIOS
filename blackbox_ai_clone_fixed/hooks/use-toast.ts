import { toast as sonnerToast } from "sonner";

export type ToastInput = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function toast(input: ToastInput | string) {
  if (typeof input === "string") {
    sonnerToast(input);
    return;
  }

  const title = input.title ?? "";
  const description = input.description;

  if (input.variant === "destructive") {
    sonnerToast.error(title, { description });
  } else {
    sonnerToast(title, { description });
  }
}

export function useToast() {
  return { toast };
}
