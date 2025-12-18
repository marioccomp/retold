"use client";

import retoldImg from "@/assets/retold-login.png";
import styles from "./page.module.css";
import { FiGithub, FiLinkedin } from "react-icons/fi";
import { FaGoogle } from "react-icons/fa";
import { FaEyeSlash, FaEye } from "react-icons/fa";
import { useState } from "react";

export default function Login() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const togglePasswordVisible = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <div className={styles.login}>
      <div className={styles.logo}>
        <img src={retoldImg.src} alt="Retold Logo" />
      </div>

      <div>
        <form action="" className={styles.form}>
          <input type="email" required placeholder="Email" />
          <div className={styles.passwordInput}>
            <input type={isPasswordVisible ? "text" : "password"} required placeholder="Senha" />
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
          <button type="submit">Entrar</button>
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
            Não tem uma conta? <span>Cadastre-se</span>
          </p>
        </div>
      </div>
    </div>
  );
}
