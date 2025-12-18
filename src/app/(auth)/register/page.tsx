"use client";
import { Questrial } from "next/font/google";
import styles from "./page.module.css";
import Link from "next/link";
import { useState } from "react";
import logo from "@/assets/logo-large.png";

const questrial = Questrial({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-questrial",
});

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("criar conta:", { email, password, confirmPassword });
  };

  return (
    <main className={`${styles.container} ${questrial.variable}`}>
      <div className={styles.contentWrapper}>
        <div className={styles.logoSection}>
          <img src={logo.src} alt="Logo Retold" className={styles.logoImage} />
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="email"
            placeholder="Email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Senha"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Confirmar senha"
            className={styles.input}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <button type="submit" className={styles.button}>
            Criar conta
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
