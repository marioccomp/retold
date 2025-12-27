"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { forgotPassword } from "../(auth)/_actions/forgot-password";
import Link from "next/link";

export default function ForgotPasswordForm() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);

  const forgotMutation = useMutation({
    mutationFn: async (formData: FormData) => await forgotPassword(formData),
    onSuccess: (res) => {
      if (res.success === false) {
        toast.error(res.message);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors); // Mapeia erros de campo
        return;
      }

      toast.success(res.data || "Verifique seu e-mail para as instruções.");
      setFieldErrors(null);
    },
    onError: () => {
      toast.error("Algo deu errado. Por favor, tente novamente.");
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors(null);

    const formData = new FormData(e.currentTarget);
    forgotMutation.mutate(formData);
  }

  return (
    <main className="max-w-md mx-auto mt-20 p-8 border border-zinc-800 rounded-xl bg-black text-white">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Recuperar Senha</h1>
        <p className="text-gray-400 text-sm mt-2">
          Insira seu e-mail para receber um link de redefinição.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <input
            name="email"
            type="email"
            placeholder="seu@email.com"
            className="p-3 rounded bg-zinc-900 border border-zinc-700 focus:outline-none focus:border-blue-500 text-white"
            required
            disabled={forgotMutation.isPending}
          />
          {/* Exibe erro específico se o e-mail for inválido */}
          {fieldErrors?.email && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.email[0]}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={forgotMutation.isPending}
          className="bg-blue-600 p-3 rounded font-semibold disabled:bg-zinc-700 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          {forgotMutation.isPending ? "Enviando..." : "Enviar Link de Recuperação"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm text-blue-500 hover:underline">
          Voltar para o Login
        </Link>
      </div>
    </main>
  );
}
