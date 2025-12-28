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
import { checkEmail } from "../_actions/check-email";
import { checkUsername } from "../_actions/check-username";
import { signIn } from "next-auth/react";

export default function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState(false);
  const [usernameHelpVisible, setUsernameHelpVisible] = useState(true);
  const [lastCheckedUsername, setLastCheckedUsername] = useState<string | null>(null);
  const [lastCheckedEmail, setLastCheckedEmail] = useState<string | null>(null);
  const [nameHelpVisible, setNameHelpVisible] = useState(true);
  const [passwordHelpVisible, setPasswordHelpVisible] = useState(true);
  const [confirmPasswordHelpVisible, setConfirmPasswordHelpVisible] = useState(true);

  const [passwordValue, setPasswordValue] = useState("");

  const registerMutation = useMutation({
    mutationFn: async (formData: FormData) => await register(formData),
    onSuccess: async (res) => {
      if (!res.success) {
        toast.error(res.message);

        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors);
        }
        return;
      }

      const loginResult = await signIn("credentials", {
        identifier: res.data!.email,
        password: passwordValue,
        redirect: false,
      });

      if (loginResult?.error) {
        toast.error("Account created, but login failed.");
        return;
      }

      toast.success(`Welcome to Retold, @${res.data!.username}`);

      router.push(`/${res.data!.username}`);
    },

    onError: () => {
      toast.error("Something went wrong. Please try again.");
    },
  });

  const checkEmailMutation = useMutation({
    mutationFn: async (email: string) => await checkEmail(email),

    onSuccess: (data) => {
      if (!data.success) {
        setEmailError(data.fieldErrors?.email?.[0] ?? data.message);
      } else {
        setEmailError(null);
        setEmailAvailable(true);
      }
    },
  });

  const checkUsernameMutation = useMutation({
    mutationFn: async (username: string) => await checkUsername(username),

    onSuccess: (data) => {
      if (!data.success) {
        setUsernameError(data.fieldErrors?.username?.[0] ?? data.message);
      } else {
        setUsernameError(null);
        setUsernameAvailable(true);
      }
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors(null);
    setEmailError(null);

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
          <input
            name="name"
            placeholder="Name"
            className={styles.input}
            required
            onChange={(e) => {
              const value = e.target.value;

              if (value.length >= 3 && value.length <= 40) {
                setNameHelpVisible(false);
              } else {
                setNameHelpVisible(true);
              }
            }}
          />
          {nameHelpVisible && <p className="text-sm text-gray-400">3–40 characters</p>}

          {fieldErrors?.name && <p className="text-red-500 text-sm">{fieldErrors.name[0]}</p>}

          <input
            name="username"
            placeholder="Username"
            className={styles.input}
            required
            onChange={(e) => {
              const value = e.target.value;

              if (usernameError) setUsernameError(null);
              if (usernameAvailable) setUsernameAvailable(false);

              if (value.length >= 3 && value.length <= 20) {
                setUsernameHelpVisible(false);
              } else {
                setUsernameHelpVisible(true);
              }
            }}
            onBlur={(e) => {
              const value = e.target.value;

              if (value.length < 3 || value.length > 20) return;

              if (value === lastCheckedUsername) return;

              setLastCheckedUsername(value);
              checkUsernameMutation.mutate(value);
            }}
          />
          {usernameHelpVisible && (
            <p className="text-sm text-gray-400">3–20 characters, no spaces</p>
          )}

          {checkUsernameMutation.isPending && (
            <p className="text-sm text-gray-400">Checking username...</p>
          )}
          {usernameAvailable && <p className="text-sm text-green-500">Username available</p>}
          {(usernameError || fieldErrors?.username) && (
            <p className="text-red-500 text-sm">{usernameError ?? fieldErrors?.username?.[0]}</p>
          )}

          <input
            type="email"
            name="email"
            placeholder="Email"
            className={styles.input}
            required
            onChange={() => {
              if (emailError) setEmailError(null);
              if (emailAvailable) setEmailAvailable(false);
            }}
            onBlur={(e) => {
              const value = e.target.value;

              if (!value) return;

              if (value === lastCheckedEmail) return;

              setLastCheckedEmail(value);
              checkEmailMutation.mutate(value);
            }}
          />
          {checkEmailMutation.isPending && (
            <p className="text-sm text-gray-400">Checking email...</p>
          )}
          {emailAvailable && <p className="text-sm text-green-500">Email available</p>}
          {(emailError || fieldErrors?.email) && (
            <p className="text-red-500 text-sm">{emailError ?? fieldErrors?.email?.[0]}</p>
          )}

          <div className={styles.passwordInput}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              name="password"
              className={styles.input}
              required
              onChange={(e) => {
                const value = e.target.value;
                setPasswordValue(value);

                if (value.length >= 6 && value.length <= 17) {
                  setPasswordHelpVisible(false);
                } else {
                  setPasswordHelpVisible(true);
                }
              }}
            />
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEye /> : <FaEyeSlash />}
            </button>
          </div>

          {passwordHelpVisible && <p className="text-sm text-gray-400">6–17 characters</p>}

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
              onChange={(e) => {
                const value = e.target.value;

                if (value && value === passwordValue) {
                  setConfirmPasswordHelpVisible(false);
                } else {
                  setConfirmPasswordHelpVisible(true);
                }
              }}
            />
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <FaEye /> : <FaEyeSlash />}
            </button>
          </div>

          {confirmPasswordHelpVisible && (
            <p className="text-sm text-gray-400">Passwords must match</p>
          )}

          {fieldErrors?.confirmPassword && (
            <p className="text-red-500 text-sm">{fieldErrors.confirmPassword[0]}</p>
          )}

          <button
            type="submit"
            className={styles.button}
            disabled={
              registerMutation.isPending ||
              !!emailError ||
              !emailAvailable ||
              !usernameAvailable ||
              nameHelpVisible ||
              passwordHelpVisible ||
              confirmPasswordHelpVisible
            }
          >
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
