"use client";

import retoldImg from "@/assets/retold-login.png";
import styles from "./page.module.css";
import { FiGithub, FiLinkedin } from "react-icons/fi";
import { FaGoogle } from "react-icons/fa";
import { FaEyeSlash, FaEye } from "react-icons/fa";
import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { login } from "../_actions/login";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function Login() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const [state, formAction, isPending] = useActionState(login, null);

  const [showError, setShowError] = useState(false);

  const togglePasswordVisible = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  useEffect(() => {
    if (state?.error) {
      setShowError(true);

      const timer = setTimeout(() => {
        setShowError(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <div className={styles.login}>
      <div className={styles.logo}>
        <img src={retoldImg.src} alt="Retold Logo" />
      </div>

      <div className={styles.formDiv}>
        <form action={formAction} className={styles.form}>
          {showError && (
            <Alert variant="destructive" className={styles.alert}>
              <AlertTitle className={styles.title}>Something went wrong</AlertTitle>
              <AlertDescription className={styles.description}>
                Please verify your credentials and try again.
              </AlertDescription>
            </Alert>
          )}

          <input
            type="text"
            name="identifier"
            required
            placeholder="Email or Username"
            className={styles.input}
          />

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
