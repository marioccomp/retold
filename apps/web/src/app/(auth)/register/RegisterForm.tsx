"use client";

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import retoldImg from "@/assets/retold-login.png";
import retoldLogo from "@/assets/retold-footer.png";
import { FaEye, FaEyeSlash, FaGoogle } from "react-icons/fa";
import { FiGithub, FiLinkedin } from "react-icons/fi";
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
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      {/* Branding Column - Desktop Only */}
      <div className="hidden lg:flex flex-col items-center justify-center relative bg-gradient-to-br from-[#05dc7f] via-[#a7f3d0] to-white p-12 overflow-hidden">
        {/* Abstract pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#047857" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Gradient orbs for visual interest */}
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-[#05dc7f]/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-white/40 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 text-center">
          <Image
            src={retoldLogo}
            alt="Retold Logo"
            priority
            className="w-32 h-auto mx-auto mb-12"
          />

          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
            Join Retold
          </h1>
          <p className="text-gray-600 text-lg max-w-md mx-auto leading-relaxed">
            Start your professional journey today. Create your portfolio and get discovered.
          </p>

          {/* Feature highlights */}
          <div className="mt-12 space-y-4 text-left max-w-sm mx-auto">
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-2 h-2 rounded-full bg-[#05dc7f]" />
              <span>Showcase your professional journey</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-2 h-2 rounded-full bg-[#05dc7f]" />
              <span>Connect with industry leaders</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-2 h-2 rounded-full bg-[#05dc7f]" />
              <span>Discover new opportunities</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Column */}
      <div className="flex items-center justify-center min-h-screen lg:min-h-0 p-6 lg:p-12 bg-white">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Image
              src={retoldImg}
              alt="Retold Logo"
              priority
              className="w-50 h-auto"
            />
          </div>

          {/* Form header */}
          <div className="mb-4">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2 text-center">
              Create account
            </h2>
            <p className="text-gray-500 text-center">
              Fill in your details to get started
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Input */}
            <div className="space-y-1">
              <Label htmlFor="name" className="text-gray-700 font-medium">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Your full name"
                required
                className="h-11 focus:ring-2 focus:ring-[#05dc7f]/20 focus:border-[#05dc7f] transition-all"
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
                <p className="text-xs text-gray-400 mt-1">3–40 characters</p>
              )}
              {fieldErrors?.name && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.name[0]}</p>
              )}
            </div>

            {/* Username Input */}
            <div className="space-y-1">
              <Label htmlFor="username" className="text-gray-700 font-medium">
                Username
              </Label>
              <Input
                id="username"
                name="username"
                placeholder="yourhandle"
                required
                className="h-11 focus:ring-2 focus:ring-[#05dc7f]/20 focus:border-[#05dc7f] transition-all"
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
                <p className="text-xs text-gray-400 mt-1">3–20 characters, no spaces</p>
              )}
              {checkUsernameMutation.isPending && (
                <p className="text-xs text-gray-400 mt-1">Checking username...</p>
              )}
              {usernameAvailable && (
                <p className="text-xs text-green-500 mt-1">Username available</p>
              )}
              {(usernameError || fieldErrors?.username) && (
                <p className="text-red-500 text-xs mt-1">
                  {usernameError ?? fieldErrors?.username?.[0]}
                </p>
              )}
            </div>

            {/* Email Input */}
            <div className="space-y-1">
              <Label htmlFor="email" className="text-gray-700 font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="john@example.com"
                required
                className="h-11 focus:ring-2 focus:ring-[#05dc7f]/20 focus:border-[#05dc7f] transition-all"
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
                <p className="text-xs text-gray-400 mt-1">Checking email...</p>
              )}
              {emailAvailable && (
                <p className="text-xs text-green-500 mt-1">Email available</p>
              )}
              {(emailError || fieldErrors?.email) && (
                <p className="text-red-500 text-xs mt-1">
                  {emailError ?? fieldErrors?.email?.[0]}
                </p>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <Label htmlFor="password" className="text-gray-700 font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  required
                  className="h-11 pr-11 focus:ring-2 focus:ring-[#05dc7f]/20 focus:border-[#05dc7f] transition-all"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <FaEye className="text-lg" />
                  ) : (
                    <FaEyeSlash className="text-lg" />
                  )}
                </button>
              </div>
              {passwordHelpVisible && (
                <p className="text-xs text-gray-400 mt-1">6–17 characters</p>
              )}
              {fieldErrors?.password && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.password[0]}</p>
              )}
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-1">
              <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="••••••••"
                  required
                  className="h-11 pr-11 focus:ring-2 focus:ring-[#05dc7f]/20 focus:border-[#05dc7f] transition-all"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 cursor-pointer"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <FaEye className="text-lg" />
                  ) : (
                    <FaEyeSlash className="text-lg" />
                  )}
                </button>
              </div>
              {confirmPasswordHelpVisible && (
                <p className="text-xs text-gray-400 mt-1">Passwords must match</p>
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
                !emailAvailable ||
                !usernameAvailable ||
                nameHelpVisible ||
                passwordHelpVisible ||
                confirmPasswordHelpVisible
              }
              className="w-full h-11 bg-[#05dc7f] hover:bg-[#04c370] text-gray-900 font-semibold text-base transition-all active:scale-[0.98] mt-6 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {registerMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center mt-8 mb-5 text-gray-400 text-sm">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="px-4">Or continue with</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Social accounts */}
          <div className="flex justify-center gap-4">
            <button className="flex items-center justify-center w-12 h-12 rounded-lg border border-gray-200 text-gray-600 transition-all hover:border-[#05dc7f] hover:text-[#05dc7f] hover:bg-emerald-50 hover:-translate-y-0.5 cursor-pointer">
              <FiGithub className="text-xl" />
            </button>
            <button className="flex items-center justify-center w-12 h-12 rounded-lg border border-gray-200 text-gray-600 transition-all hover:border-[#05dc7f] hover:text-[#05dc7f] hover:bg-emerald-50 hover:-translate-y-0.5 cursor-pointer">
              <FiLinkedin className="text-xl" />
            </button>
            <button className="flex items-center justify-center w-12 h-12 rounded-lg border border-gray-200 text-gray-600 transition-all hover:border-[#05dc7f] hover:text-[#05dc7f] hover:bg-emerald-50 hover:-translate-y-0.5 cursor-pointer">
              <FaGoogle className="text-xl" />
            </button>
          </div>

          {/* Login link */}
          <p className="text-center text-gray-500 text-sm mt-4">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[#05dc7f] font-semibold hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
