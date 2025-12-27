"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { resetPassword } from "../_actions/reset-password";

export default function ResetPasswordTestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);

  const resetMutation = useMutation({
    mutationFn: async (formData: FormData) => await resetPassword(formData),
    onSuccess: (res) => {
      if (res.success === false) {
        toast.error(res.message);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        return;
      }

      toast.success("Senha alterada com sucesso!");
      setFieldErrors(null);
      router.push("/login");
    },
    onError: () => {
      toast.error("Erro crítico ao tentar alterar a senha.");
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors(null);

    const formData = new FormData(e.currentTarget);
    resetMutation.mutate(formData);
  }

  if (!token) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-500">Erro: Token não encontrado na URL.</p>
        <p className="text-sm text-gray-400">Certifique-se de acessar via link do e-mail.</p>
      </div>
    );
  }

  return (
    <main className="max-w-md mx-auto mt-20 p-8 border border-zinc-800 rounded-xl bg-black text-white">
      <h1 className="text-xl font-bold mb-6">Teste de Nova Senha (TanStack)</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input type="hidden" name="token" value={token} />

        <div className="flex flex-col gap-1">
          <input
            name="password"
            type="password"
            placeholder="Digite a nova senha"
            className="p-2 rounded bg-zinc-900 border border-zinc-700 focus:outline-none focus:border-blue-500"
            required
          />
          {fieldErrors?.password && (
            <p className="text-red-500 text-xs">{fieldErrors.password[0]}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={resetMutation.isPending}
          className="bg-blue-600 p-2 rounded font-semibold disabled:bg-zinc-700 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          {resetMutation.isPending ? "Processando..." : "Confirmar Alteração"}
        </button>
      </form>

      <div className="mt-6 p-4 bg-zinc-900 rounded text-xs text-gray-400 break-all">
        <p>
          <strong>Debug Token:</strong> {token}
        </p>
      </div>
    </main>
  );
}
