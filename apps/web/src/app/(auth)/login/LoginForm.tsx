"use client";

import retoldImg from "@/assets/retold-login.png";
import styles from "./page.module.css";
import { FiGithub, FiLinkedin } from "react-icons/fi";
import { FaGoogle } from "react-icons/fa";
import { FaEyeSlash, FaEye } from "react-icons/fa";
import { useState } from "react";
import Link from "next/link";
import { login } from "../_actions/login";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export default function LoginForm() {
  const router = useRouter();
  const { update } = useSession();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const togglePasswordVisible = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const loginMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return login(formData);
    },

    onSuccess: async (data) => {
      if (!data?.success) {
        toast.error(data.message);
        return;
      }

      toast.success("Login realizado com sucesso"); // mudar p ingles ou tirar antes de subir o pr
      await update();
      router.push("/dashboard");
    },

    onError: () => {
      toast.error("Erro inesperado. Tente novamente"); // mudar p ingles ou tirar antes de subir o pr
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    loginMutation.mutate(formData);
  }

  return (
    <div className={styles.login}>
      <div className={styles.logo}>
        <Image src={retoldImg} alt="Retold Logo" priority />
      </div>

      <div className={styles.formDiv}>
        <form onSubmit={handleSubmit} className={styles.form}>
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
          <button type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? "Carregando..." : "Entrar"}
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
