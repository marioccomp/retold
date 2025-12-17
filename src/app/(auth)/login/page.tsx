import retoldImg from "@/assets/retold-login.png";
import styles from "./page.module.css";
import { FiGithub, FiLinkedin } from "react-icons/fi";
import { FaGoogle } from "react-icons/fa";

export default function Login() {
  return (
    <div className={styles.login}>
      <div className={styles.logo}>
        <img src={retoldImg.src} alt="Retold Logo" />
      </div>

      <form action="" className={styles.form}>
        <input type="email" required placeholder="Email" />
        <input type="password" required placeholder="Senha" />
        <div className={styles.options}>
          <label htmlFor="">
            <input type="checkbox" />
            Lembre de mim
          </label>
          <p>Esqueci a senha</p>
        </div>
        <button type="submit">Entrar</button>
      </form>

      <div className={styles.otherOptions}>
        <p>Ou entre com</p>
        <div className={styles.accounts}>
          <FiGithub />
          <FiLinkedin />
          <FaGoogle />
        </div>
        <p className={styles.createAccount}>
          Não tem uma conta? <span>Cadastre-se</span>
        </p>
      </div>
    </div>
  );
}
