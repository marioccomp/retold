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
import { toast } from "sonner";

export default function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);

  const registerMutation = useMutation({
    mutationFn: async (formData: FormData) => await register(formData),
    onSuccess: (res) => {
      if (res.success === false) {
        toast.error(res.message);

        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors);
        }

        return;
      }

      toast.success("Account created successfully");
      setFieldErrors(null);
      router.push("/login");
    },

    onError: () => {
      toast.error("Something went wrong. Please try again.");
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors(null);

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
          {fieldErrors?.name && <p className="text-red-500 text-sm">{fieldErrors.name[0]}</p>}

          <input name="username" placeholder="Username" className={styles.input} required />
          {fieldErrors?.username && (
            <p className="text-red-500 text-sm">{fieldErrors.username[0]}</p>
          )}

          <input type="email" name="email" placeholder="Email" className={styles.input} required />
          {fieldErrors?.email && <p className="text-red-500 text-sm">{fieldErrors.email[0]}</p>}

          <div className={styles.passwordInput}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
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
          {fieldErrors?.password && (
            <p className="text-red-500 text-sm">{fieldErrors.password[0]}</p>
          )}

          <div className={styles.passwordInput}>
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
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
          {fieldErrors?.confirmPassword && (
            <p className="text-red-500 text-sm">{fieldErrors.confirmPassword[0]}</p>
          )}

          <button type="submit" className={styles.button} disabled={registerMutation.isPending}>
            {registerMutation.isPending ? "Loading..." : "Create account"}
          </button>
        </form>

        <p className={styles.footerText}>
          Already have an account?{" "}
          <Link href="/login" className={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
