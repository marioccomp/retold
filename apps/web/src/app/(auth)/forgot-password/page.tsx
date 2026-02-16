"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { forgotPassword } from "../_actions/forgot-password";

import retoldImg from "@/assets/retold-login.png";
import retoldLogo from "@/assets/retold-footer.png";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/src/i18n/client";

export default function ForgotPasswordForm() {
  const { dict } = useTranslation();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);

  const forgotMutation = useMutation({
    mutationFn: async (formData: FormData) => await forgotPassword(formData),
    onSuccess: (res) => {
      if (res.success === false) {
        toast.error(res.message);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        return;
      }

      toast.success(res.data || dict.auth.forgot_password.success_message);
      setFieldErrors(null);
    },
    onError: () => {
      toast.error(dict.validation.generic_error);
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors(null);

    const formData = new FormData(e.currentTarget);
    forgotMutation.mutate(formData);
  }

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col items-center justify-center relative bg-gradient-to-br from-primary via-primary/30 to-background p-12 overflow-hidden">
        {/* Abstract pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Gradient orbs */}
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
            {dict.auth.forgot_password.welcome_title}
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
            {dict.auth.forgot_password.welcome_subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center min-h-screen lg:min-h-0 p-6 lg:p-12 bg-background">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Image src={retoldImg} alt="Retold Logo" priority className="w-50 h-auto" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2 text-center">
              {dict.auth.forgot_password.title}
            </h2>
            <p className="text-muted-foreground text-center">
              {dict.auth.forgot_password.subtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">
                {dict.auth.register.email_label}
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={dict.auth.forgot_password.email_placeholder}
                required
                className="h-11 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                disabled={forgotMutation.isPending}
                onChange={() => {
                  if (fieldErrors?.email) setFieldErrors(null);
                }}
              />
              {fieldErrors?.email && (
                <p className="text-destructive text-xs mt-1">{fieldErrors.email[0]}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={forgotMutation.isPending}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base transition-all active:scale-[0.98] mt-6 cursor-pointer"
            >
              {forgotMutation.isPending ? (
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
                  {dict.auth.forgot_password.submitting}
                </span>
              ) : (
                dict.auth.forgot_password.submit
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
