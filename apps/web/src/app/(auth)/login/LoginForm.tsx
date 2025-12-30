"use client";

import retoldImg from "@/assets/retold-login.png";
import retoldLogo from "@/assets/retold-footer.png";
import { FiGithub, FiLinkedin } from "react-icons/fi";
import { FaGoogle } from "react-icons/fa";
import { FaEyeSlash, FaEye } from "react-icons/fa";
import { useState } from "react";
import Link from "next/link";
import { login } from "../_actions/login";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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

      toast.success("Signed in successfully");
      await update();
      router.push("/dashboard");
    },

    onError: () => {
      toast.error("Unexpected error. Please try again.");
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
            Welcome to Retold
          </h1>
          <p className="text-gray-600 text-lg max-w-md mx-auto leading-relaxed">
            Connecting talent with opportunity. Build your professional story and unlock new possibilities.
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
          <div className="mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2 text-center">
              Sign in
            </h2>
            <p className="text-gray-500 text-center">
              Enter your credentials to access your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-gray-700 font-medium">
                Email or Username
              </Label>
              <Input
                id="identifier"
                type="text"
                name="identifier"
                required
                placeholder="john@example.com"
                className="h-11 focus:ring-2 focus:ring-[#05dc7f]/20 focus:border-[#05dc7f] transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={isPasswordVisible ? "text" : "password"}
                  name="password"
                  required
                  placeholder="••••••••"
                  className="h-11 pr-11 focus:ring-2 focus:ring-[#05dc7f]/20 focus:border-[#05dc7f] transition-all"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisible}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  aria-label={isPasswordVisible ? "Hide password" : "Show password"}
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
                  className="data-[state=checked]:bg-[#05dc7f] data-[state=checked]:border-[#05dc7f] cursor-pointer"
                />
                <Label htmlFor="remember" className="text-gray-500 text-sm cursor-pointer">
                  Remember me
                </Label>
              </div>
              <Link
                href="/forgot-password"
                className="text-[#05dc7f] text-sm font-semibold hover:underline hover:opacity-80 transition-opacity"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full h-11 bg-[#05dc7f] hover:bg-[#04c370] text-gray-900 font-semibold text-base transition-all active:scale-[0.98] mt-6 cursor-pointer"
            >
              {loginMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-8 text-gray-400 text-sm">
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

          {/* Create account */}
          <p className="text-center text-gray-500 text-sm mt-8">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-[#05dc7f] font-semibold hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
