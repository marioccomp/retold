"use client";

import retoldImg from "@/assets/retold-login.png";
import retoldLogo from "@/assets/retold-footer.png";
import { FiGithub } from "react-icons/fi";
import { HiMiniSparkles } from "react-icons/hi2";
import { FaEyeSlash, FaEye } from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { login } from "../_actions/login";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/src/i18n/client";

export default function LoginForm() {
  const { dict } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update } = useSession();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const handledParamsRef = useRef<string | null>(null);

  useEffect(() => {
    const error = searchParams.get("error");
    const reauth = searchParams.get("reauth");
    const currentStateKey = `${error ?? ""}:${reauth ?? ""}`;

    if (handledParamsRef.current === currentStateKey) {
      return;
    }

    handledParamsRef.current = currentStateKey;

    if (error === "OAuthAccountNotLinked") {
      toast.error(dict.auth.login.oauth_account_not_linked);
      router.replace("/login");
      return;
    }

    if (reauth === "password-updated") {
      toast.success(dict.auth.login.reauth_password_updated);
      router.replace("/login");
      return;
    }

    if (reauth === "password-reset") {
      toast.success(dict.auth.login.reauth_password_reset);
      router.replace("/login");
    }
  }, [
    dict.auth.login.oauth_account_not_linked,
    dict.auth.login.reauth_password_reset,
    dict.auth.login.reauth_password_updated,
    router,
    searchParams,
  ]);

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

      toast.success(dict.auth.login.success);
      await update();
      router.push("/");
    },

    onError: () => {
      toast.error(dict.validation.generic_error);
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    loginMutation.mutate(formData);
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
            {dict.auth.login.welcome_title}
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
            {dict.auth.login.welcome_subtitle}
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
          <div className="mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2 text-center">
              {dict.auth.login.title}
            </h2>
            <p className="text-muted-foreground text-center">{dict.auth.login.subtitle}</p>
          </div>

          <div className="mb-6">
            <div className="mb-4 flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-foreground shadow-md shadow-primary/20 ring-1 ring-primary/10">
                <HiMiniSparkles className="text-sm" />
                {dict.auth.login.github_recommended_badge}
              </span>
            </div>
            <button
              className="flex items-center justify-center w-full h-12 rounded-lg border border-border text-muted-foreground transition-all hover:border-primary hover:text-primary hover:bg-primary/5 hover:-translate-y-0.5 cursor-pointer gap-2 font-medium"
              onClick={() => signIn("github", { callbackUrl: "/" })}
              type="button"
              data-testid="login-github-button"
            >
              <FiGithub className="text-xl" />
              <span>{dict.auth.login.github_cta}</span>
            </button>
          </div>

          <div className="flex items-center mb-8 text-muted-foreground text-sm">
            <div className="flex-1 h-px bg-border" />
            <span className="px-4">{dict.auth.login.email_divider}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-foreground font-medium">
                {dict.auth.login.identifier_label}
              </Label>
              <Input
                id="identifier"
                type="text"
                name="identifier"
                required
                data-testid="login-identifier-input"
                placeholder={dict.auth.login.email_placeholder}
                className="h-11 shadow-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">
                {dict.auth.login.password_label}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={isPasswordVisible ? "text" : "password"}
                  name="password"
                  required
                  data-testid="login-password-input"
                  placeholder="••••••••"
                  className="h-11 pr-11 shadow-none"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisible}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label={
                    isPasswordVisible
                      ? dict.profile.edit_modal.saving
                      : dict.profile.edit_modal.save
                  }
                >
                  {isPasswordVisible ? (
                    <FaEye className="text-lg" />
                  ) : (
                    <FaEyeSlash className="text-lg" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center pt-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary cursor-pointer"
                />
                <Label htmlFor="remember" className="text-muted-foreground text-sm cursor-pointer">
                  {dict.auth.login.remember_me}
                </Label>
              </div>
              <Link
                href="/forgot-password"
                className="text-primary text-sm font-semibold hover:underline hover:opacity-80 transition-opacity"
              >
                {dict.auth.login.forgot_password}
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              data-testid="login-submit-button"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base transition-all active:scale-[0.98] mt-6 cursor-pointer"
            >
              {loginMutation.isPending ? (
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
                  {dict.auth.login.submitting}
                </span>
              ) : (
                dict.auth.login.submit
              )}
            </Button>
          </form>

          {/* Create account */}
          <p className="text-center text-muted-foreground text-sm mt-8">
            {dict.auth.login.no_account}{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              {dict.auth.login.create_one}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
