"use client";

import styles from "./page.module.css";
import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import logo from "@/assets/retold-login.png";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { register } from "../_actions/register";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export default function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [state, setState] = useState<any>(null);

  const registerMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      await register(formData);
    },
    onSuccess: (data) => {
      setState(data);
      router.push("/login");
    },

    onError: () => {
      setState({ error: "Something went wrong" });
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    registerMutation.mutate(formData);
  }

  return (
    <main className={styles.container}>
      <div className={styles.contentWrapper}>
        <div className={styles.logoSection}>
          <Image src={logo} alt="Logo Retold" className={styles.logoImage} priority />
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input name="name" placeholder="Name" className={styles.input} required />
          {state?.errors?.name && <p className="text-red-500 text-sm">{state.errors.name}</p>}

          <input name="username" placeholder="Username" className={styles.input} required />
          {state?.errors?.username && (
            <p className="text-red-500 text-sm">{state.errors.username}</p>
          )}

          <input type="email" name="email" placeholder="Email" className={styles.input} required />
          {state?.errors?.email && <p className="text-red-500 text-sm">{state.errors.email}</p>}

          <div className={styles.passwordInput}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Senha"
              name="password"
              className={styles.input}
              required
            />
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEye /> : <FaEyeSlash />}
            </button>
          </div>
          {state?.errors?.password && (
            <p className="text-red-500 text-sm">{state.errors.password}</p>
          )}

          <div className={styles.passwordInput}>
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirmar senha"
              className={styles.input}
              name="confirmPassword"
              required
            />
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <FaEye /> : <FaEyeSlash />}
            </button>
          </div>
          {state?.errors?.confirmPassword && (
            <p className="text-red-500 text-sm">{state.errors.confirmPassword}</p>
          )}

          {state?.error && (
            <div className="bg-red-100 p-2 text-red-700 rounded border border-red-200">
              {state.error}
            </div>
          )}

          <button type="submit" className={styles.button} disabled={registerMutation.isPending}>
            {registerMutation.isPending ? "Carregando..." : "Criar conta"}
          </button>
        </form>

        <p className={styles.footerText}>
          Já tem uma conta?{" "}
          <Link href="/login" className={styles.link}>
            Faça Login
          </Link>
        </p>
      </div>
    </main>
  );
}
