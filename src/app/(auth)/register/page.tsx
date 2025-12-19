"use client";
import { Questrial } from "next/font/google";
import styles from "./page.module.css";
import Link from "next/link";
import { useActionState, useState } from "react";
import logo from "@/assets/retold-login.png";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { register } from "../_actions/register";

const questrial = Questrial({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-questrial",
});

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [state, formAction, isPending] = useActionState(register, null);

  return (
    <main className={`${styles.container} ${questrial.variable}`}>
      <div className={styles.contentWrapper}>
        <div className={styles.logoSection}>
          <img src={logo.src} alt="Logo Retold" className={styles.logoImage} />
        </div>
        <form action={formAction} className={styles.form}>
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
            {showPassword ? (
              <FaEyeSlash className={styles.icon} onClick={() => setShowPassword(false)} />
            ) : (
              <FaEye className={styles.icon} onClick={() => setShowPassword(true)} />
            )}
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
            {showConfirmPassword ? (
              <FaEyeSlash className={styles.icon} onClick={() => setShowConfirmPassword(false)} />
            ) : (
              <FaEye className={styles.icon} onClick={() => setShowConfirmPassword(true)} />
            )}
          </div>
          {state?.errors?.confirmPassword && (
            <p className="text-red-500 text-sm">{state.errors.confirmPassword}</p>
          )}

          {state?.error && (
            <div className="bg-red-100 p-2 text-red-700 rounded border border-red-200">
              {state.error}
            </div>
          )}

          <button type="submit" className={styles.button} disabled={isPending}>
            {isPending ? "Carregando..." : "Criar conta"}
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
