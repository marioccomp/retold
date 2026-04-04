"use client";

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import retoldImg from "@/assets/retold-login.png";
import retoldLogo from "@/assets/retold-footer.png";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { FiGithub } from "react-icons/fi";
import { register } from "../_actions/register";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { checkEmail } from "../_actions/check-email";
import { checkUsername } from "../_actions/check-username";
import { signIn } from "next-auth/react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/src/i18n/client";

export default function RegisterForm() {
  const { dict } = useTranslation();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
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
        toast.error(dict.auth.register.login_failed);
        return;
      }

      toast.success(`${dict.auth.register.success}, @${res.data!.username}`);

      router.push(`/${res.data!.username}`);
    },

    onError: () => {
      toast.error(dict.validation.generic_error);
    },
  });

  const checkEmailMutation = useMutation({
    mutationFn: async (email: string) => await checkEmail(email),

    onSuccess: (data) => {
      if (!data.success) {
        setEmailError(data.fieldErrors?.email?.[0] ?? data.message);
      } else {
        setEmailError(null);
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
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      {/* Branding Column - Desktop Only */}
      <div className="hidden lg:flex flex-col items-center justify-center relative bg-gradient-to-br from-primary via-primary/30 to-background dark:bg-background dark:border-r dark:border-border/40 p-12 overflow-hidden">
        {/* Dark Mode Ambient Glows */}
        <div className="hidden dark:block absolute top-0 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -translate-x-1/4 -translate-y-1/4 pointer-events-none" />
        <div className="hidden dark:block absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] translate-x-1/4 translate-y-1/4 pointer-events-none" />

        {/* Abstract pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-10 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="currentColor"
                  className="text-primary-foreground/20"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Gradient orbs for visual interest */}
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-background/40 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 text-center">
          <Image
            src={retoldLogo}
            alt="Retold Logo"
            priority
            className="w-32 h-auto mx-auto mb-12"
          />

          <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">
            {dict.auth.register.welcome_title}
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
            {dict.auth.register.welcome_subtitle}
          </p>

          {/* Feature highlights */}
          <div className="mt-12 space-y-4 text-left max-w-sm mx-auto">
            <div className="flex items-center gap-3 text-foreground">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>{dict.auth.login.feature_journey}</span>
            </div>
            <div className="flex items-center gap-3 text-foreground">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>{dict.auth.login.feature_leaders}</span>
            </div>
            <div className="flex items-center gap-3 text-foreground">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>{dict.auth.login.feature_opportunities}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Column */}
      <div className="flex items-center justify-center min-h-screen lg:min-h-0 p-6 lg:p-12 bg-background">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Image src={retoldImg} alt="Retold Logo" priority className="w-50 h-auto" />
          </div>

          {/* Form header */}
          <div className="mb-4">
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2 text-center">
              {dict.auth.register.title}
            </h2>
            <p className="text-muted-foreground text-center">{dict.auth.register.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Input */}
            <div className="space-y-1">
              <Label htmlFor="name" className="text-foreground font-medium">
                {dict.auth.register.name_label}
              </Label>
              <Input
                id="name"
                name="name"
                placeholder={dict.profile.edit_modal.name_placeholder}
                required
                className="h-11 shadow-none"
                onChange={(e) => {
                  const value = e.target.value;

                  if (value.length >= 3 && value.length <= 40) {
                    setNameHelpVisible(false);
                  } else {
                    setNameHelpVisible(true);
                  }
                }}
              />
              {nameHelpVisible && (
                <p className="text-xs text-gray-400 mt-1">{dict.validation.name_help}</p>
              )}
              {fieldErrors?.name && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.name[0]}</p>
              )}
            </div>

            {/* Username Input */}
            <div className="space-y-1">
              <Label htmlFor="username" className="text-foreground font-medium">
                {dict.auth.register.username_label}
              </Label>
              <Input
                id="username"
                name="username"
                placeholder={dict.auth.register.username_placeholder}
                required
                className="h-11 shadow-none"
                onChange={(e) => {
                  const value = e.target.value;

                  if (usernameError) setUsernameError(null);
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
                <p className="text-xs text-gray-400 mt-1">{dict.validation.username_help}</p>
              )}
              {checkUsernameMutation.isPending && (
                <p className="text-xs text-gray-400 mt-1">{dict.validation.username_checking}</p>
              )}
              {(usernameError || fieldErrors?.username) && (
                <p className="text-red-500 text-xs mt-1">
                  {usernameError ?? fieldErrors?.username?.[0]}
                </p>
              )}
            </div>

            {/* Email Input */}
            <div className="space-y-1">
              <Label htmlFor="email" className="text-foreground font-medium">
                {dict.auth.register.email_label}
              </Label>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder={dict.auth.register.email_placeholder}
                required
                className="h-11 shadow-none"
                onChange={() => {
                  if (emailError) setEmailError(null);
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
                <p className="text-xs text-gray-400 mt-1">{dict.validation.email_checking}</p>
              )}
              {(emailError || fieldErrors?.email) && (
                <p className="text-red-500 text-xs mt-1">{emailError ?? fieldErrors?.email?.[0]}</p>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <Label htmlFor="password" className="text-foreground font-medium">
                {dict.auth.register.password_label}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  required
                  className="h-11 pr-11 shadow-none"
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
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                  aria-label={
                    showPassword ? dict.profile.edit_modal.saving : dict.profile.edit_modal.save
                  }
                >
                  {showPassword ? (
                    <FaEye className="text-lg" />
                  ) : (
                    <FaEyeSlash className="text-lg" />
                  )}
                </button>
              </div>
              {passwordHelpVisible && (
                <p className="text-xs text-gray-400 mt-1">{dict.validation.password_help}</p>
              )}
              {fieldErrors?.password && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.password[0]}</p>
              )}
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-1">
              <Label htmlFor="confirmPassword" className="text-foreground font-medium">
                {dict.auth.register.confirm_password_label}
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="••••••••"
                  required
                  className="h-11 pr-11 shadow-none"
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
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                  aria-label={
                    showConfirmPassword
                      ? dict.profile.edit_modal.saving
                      : dict.profile.edit_modal.save
                  }
                >
                  {showConfirmPassword ? (
                    <FaEye className="text-lg" />
                  ) : (
                    <FaEyeSlash className="text-lg" />
                  )}
                </button>
              </div>
              {confirmPasswordHelpVisible && (
                <p className="text-xs text-gray-400 mt-1">{dict.validation.passwords_dont_match}</p>
              )}
              {fieldErrors?.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.confirmPassword[0]}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={
                registerMutation.isPending ||
                !!emailError ||
                !!usernameError ||
                nameHelpVisible ||
                passwordHelpVisible ||
                confirmPasswordHelpVisible
              }
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base transition-all active:scale-[0.98] mt-6 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {registerMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {dict.auth.register.submitting}
                </span>
              ) : (
                dict.auth.register.submit
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center mt-8 mb-5 text-muted-foreground text-sm">
            <div className="flex-1 h-px bg-border" />
            <span className="px-4">{dict.auth.login.social_divider}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Social accounts */}
          <div className="flex justify-center gap-4">
            <button
              className="flex items-center justify-center w-full h-12 rounded-lg border border-border text-muted-foreground transition-all hover:border-primary hover:text-primary hover:bg-primary/5 hover:-translate-y-0.5 cursor-pointer gap-2 font-medium"
              onClick={() => signIn("github", { callbackUrl: "/" })}
              type="button"
            >
              <FiGithub className="text-xl" />
              <span>GitHub</span>
            </button>
          </div>

          {/* Login link */}
          <p className="text-center text-muted-foreground text-sm mt-4">
            {dict.auth.register.has_account}{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              {dict.auth.register.sign_in}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
