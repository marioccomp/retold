"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { FiGithub, FiX } from "react-icons/fi";
import { FaGoogle, FaEyeSlash, FaEye } from "react-icons/fa";

import { useAuthModal } from "@/src/providers/AuthModalContext";
import { useTranslation } from "@/src/i18n/client";
import { login } from "@/src/app/(auth)/_actions/login";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import retoldImg from "@/assets/retold-login.png";

export default function AuthModal() {
    const { isOpen, closeLoginModal } = useAuthModal();
    const { dict } = useTranslation();
    const router = useRouter();
    const { update } = useSession();
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    // Reset state when opening? Not strictly necessary if unmounted, but good practice.
    // Actually, Dialog unmounts content by default usually, but my custom implementation might not.
    // I'll assume conditional rendering in the parent or handled here.

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
            closeLoginModal();
            router.refresh();
            // No redirect needed if we are just logging in to do an action on the same page
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

    const handleOverlayMouseDown = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            closeLoginModal();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto"
            onMouseDown={handleOverlayMouseDown}
        >
            <div className="bg-white w-full max-w-[420px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 m-4 relative">

                {/* Close Button */}
                <button
                    onClick={closeLoginModal}
                    className="cursor-pointer absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors cursor-pointer z-10"
                >
                    <FiX size={20} />
                </button>

                <div className="p-8 pb-10">
                    {/* Logo */}
                    <div className="flex justify-center mb-6">
                        <Image
                            src={retoldImg}
                            alt="Retold Logo"
                            className="w-40 h-auto"
                        />
                    </div>

                    {/* Header */}
                    <div className="mb-8 text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            {dict.auth.login.title}
                        </h2>
                        <p className="text-gray-500 text-sm">
                            {dict.auth.login.subtitle}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="identifier" className="text-gray-700 font-medium">
                                {dict.auth.login.identifier_label}
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
                                {dict.auth.login.password_label}
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
                                    {dict.auth.login.remember_me}
                                </Label>
                            </div>
                            <Link
                                href="/forgot-password"
                                onClick={closeLoginModal}
                                className="text-[#05dc7f] text-sm font-semibold hover:underline hover:opacity-80 transition-opacity"
                            >
                                {dict.auth.login.forgot_password}
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
                                    {dict.auth.login.submitting}
                                </span>
                            ) : (
                                dict.auth.login.submit
                            )}
                        </Button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center my-6 text-gray-400 text-sm">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="px-4">{dict.auth.login.social_divider}</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {/* Social accounts */}
                    <div className="flex justify-center gap-4">
                        <button
                            className="flex items-center justify-center w-full h-12 rounded-lg border border-gray-200 text-gray-600 transition-all hover:border-[#05dc7f] hover:text-[#05dc7f] hover:bg-emerald-50 hover:-translate-y-0.5 cursor-pointer gap-2 font-medium"
                            onClick={() => signIn("github", { callbackUrl: window.location.href })}
                        >
                            <FiGithub className="text-xl" />
                            <span>GitHub</span>
                        </button>
                    </div>

                    {/* Create account */}
                    <p className="text-center text-gray-500 text-sm mt-6">
                        {dict.auth.login.no_account}{" "}
                        <Link
                            href="/register"
                            onClick={closeLoginModal}
                            className="text-[#05dc7f] font-semibold hover:underline"
                        >
                            {dict.auth.login.create_one}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
