"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { FaEyeSlash, FaEye } from "react-icons/fa";

import { resetPassword } from "../_actions/reset-password";
import retoldImg from "@/assets/retold-login.png";
import retoldLogo from "@/assets/retold-footer.png";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/src/i18n/client";

function ResetPasswordForm() {
  const { dict } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const togglePasswordVisible = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const resetMutation = useMutation({
    mutationFn: async (formData: FormData) => await resetPassword(formData),
    onSuccess: (res) => {
      if (res.success === false) {
        toast.error(res.message);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        return;
      }

      toast.success(dict.auth.reset_password.success_message);
      setFieldErrors(null);
      router.push("/login?reauth=password-reset");
    },
    onError: () => {
      toast.error(dict.validation.generic_error);
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors(null);

    const formData = new FormData(e.currentTarget);
    resetMutation.mutate(formData);
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">
            {dict.auth.reset_password.invalid_link_title}
          </h1>
          <p className="text-muted-foreground">{dict.auth.reset_password.invalid_link_desc}</p>
          <Button asChild className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/login">{dict.auth.reset_password.back_to_login}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col items-center justify-center relative bg-gradient-to-br from-primary via-primary/30 to-background dark:bg-background dark:border-r dark:border-border/40 p-12 overflow-hidden">
        {/* Dark Mode Ambient Glows */}
        <div className="hidden dark:block absolute top-0 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -translate-x-1/4 -translate-y-1/4 pointer-events-none" />
        <div className="hidden dark:block absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] translate-x-1/4 translate-y-1/4 pointer-events-none" />

        <div className="absolute inset-0 opacity-[0.03] dark:opacity-10 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-background/40 rounded-full blur-3xl" />

        <div className="relative z-10 text-center">
          <Image
            src={retoldLogo}
            alt="Retold Logo"
            priority
            className="w-32 h-auto mx-auto mb-12"
          />

          <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">
            {dict.auth.reset_password.welcome_title}
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
            {dict.auth.reset_password.welcome_subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center min-h-screen lg:min-h-0 p-6 lg:p-12 bg-background">
        <div className="w-full max-w-[400px]">
          <div className="flex justify-center mb-8 lg:hidden">
            <Image src={retoldImg} alt="Retold Logo" priority className="w-50 h-auto" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2 text-center">
              {dict.auth.reset_password.title}
            </h2>
            <p className="text-muted-foreground text-center">{dict.auth.reset_password.subtitle}</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
            data-testid="reset-password-form"
          >
            <input type="hidden" name="token" value={token} />

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">
                {dict.auth.reset_password.password_label}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={isPasswordVisible ? "text" : "password"}
                  data-testid="reset-password-input"
                  placeholder="••••••••"
                  required
                  className="h-11 pr-11 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  disabled={resetMutation.isPending}
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
              {fieldErrors?.password && (
                <p className="text-destructive text-xs mt-1">{fieldErrors.password[0]}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={resetMutation.isPending}
              data-testid="reset-password-submit-button"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base transition-all active:scale-[0.98] mt-6 cursor-pointer"
            >
              {resetMutation.isPending ? (
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
                  {dict.auth.reset_password.submitting}
                </span>
              ) : (
                dict.auth.reset_password.submit
              )}
            </Button>
          </form>

          <p className="text-center text-muted-foreground text-sm mt-8">
            {dict.auth.forgot_password.remember_password}{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              {dict.auth.forgot_password.sign_in}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const { dict } = useTranslation();
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">{dict.auth.reset_password.loading}</p>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
