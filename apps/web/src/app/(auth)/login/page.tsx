"use client";

import retoldImg from "@/assets/retold-login.png";
import styles from "./page.module.css";
import { FiGithub, FiLinkedin } from "react-icons/fi";
import { FaGoogle } from "react-icons/fa";
import { FaEyeSlash, FaEye } from "react-icons/fa";
import { useActionState, useState } from "react";
import Link from "next/link";
import { login } from "../_actions/login";

export default function Login() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const [state, formAction, isPending] = useActionState(login, null);

  const togglePasswordVisible = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <div className={styles.login}>
      <div className={styles.logo}>
        <img src={retoldImg.src} alt="Retold Logo" />
      </div>

      <div className={styles.formDiv}>
        <form action={formAction} className={styles.form}>
          {state?.error && (
            <div className="relative w-full rounded-lg border border-red-500/50 bg-red-50 p-3 text-red-700 mb-4 flex gap-3 items-start">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div className="text-sm font-medium">{state.error}</div>
            </div>
          )}

          <input
            type="text"
            name="identifier"
            required
            placeholder="Email or Username"
            className={styles.input}
          />
          {state?.errors?.identifier && (
            <p className="text-red-500 text-xs mt-[-10px] mb-2">{state.errors.identifier}</p>
          )}

          <div className={styles.passwordInput}>
            <input
              type={isPasswordVisible ? "text" : "password"}
              name="password"
              required
              placeholder="Senha"
            />
            {isPasswordVisible ? (
              <FaEye className={styles.icon} onClick={togglePasswordVisible} />
            ) : (
              <FaEyeSlash className={styles.icon} onClick={togglePasswordVisible} />
            )}
          </div>
          {state?.errors?.password && (
            <p className="text-red-500 text-xs mt-1">{state.errors.password}</p>
          )}

          <div className={styles.options}>
            <label className={styles.check}>
              <input type="checkbox" />
              <span>Lembre de mim</span>
            </label>
            <span className={styles.forgotPassword}>Esqueci a senha</span>
          </div>
          <button type="submit" disabled={isPending}>
            {isPending ? "Carregando..." : "Entrar"}
          </button>
        </form>

        <div className={styles.otherOptions}>
          <div className={styles.divider}>
            <span>Ou entre com</span>
          </div>
          <div className={styles.accounts}>
            <FiGithub className={styles.account} />
            <FiLinkedin className={styles.account} />
            <FaGoogle className={styles.account} />
          </div>
          <p className={styles.createAccount}>
            Não tem uma conta?
            <Link href="/register" className={styles.link}>
              Crie uma conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
