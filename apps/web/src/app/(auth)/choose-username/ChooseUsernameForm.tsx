"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import retoldImg from "@/assets/retold-login.png";
import retoldLogo from "@/assets/retold-footer.png";
import { setUsername } from "../_actions/set-username";
import { checkUsername } from "../_actions/check-username";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useTranslation } from "@/src/i18n/client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ChooseUsernameFormProps {
    userName: string;
}

export default function ChooseUsernameForm({ userName }: ChooseUsernameFormProps) {
    const { dict } = useTranslation();
    const router = useRouter();
    const { update, data: session } = useSession();
    const [usernameError, setUsernameError] = useState<string | null>(null);
    const [usernameAvailable, setUsernameAvailable] = useState(false);
    const [usernameHelpVisible, setUsernameHelpVisible] = useState(true);
    const [lastCheckedUsername, setLastCheckedUsername] = useState<string | null>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const setUsernameMutation = useMutation({
        mutationFn: async (formData: FormData) => await setUsername(formData),
        onSuccess: async (res) => {
            if (!res.success) {
                toast.error(res.message);
                if (res.fieldErrors) {
                    setUsernameError(res.fieldErrors.username?.[0] ?? res.message);
                }
                return;
            }

            toast.success(dict.auth.choose_username.toast_welcome.replace("{username}", res.data!.username));


            const teste = await update({
                user: {
                    ...session?.user, // mantém os outros campos
                    username: res.data!.username
                }
            });

            console.log(teste);

            router.push(`/${res.data!.username}`);

            router.refresh();





        },

        onError: () => {
            toast.error(dict.auth.choose_username.error_generic);
        },
    });

    const checkUsernameMutation = useMutation({
        mutationFn: async (username: string) => await checkUsername(username),

        onSuccess: (data) => {
            if (!data.success) {
                setUsernameError(data.fieldErrors?.username?.[0] ?? data.message);
                setUsernameAvailable(false);
            } else {
                setUsernameError(null);
                setUsernameAvailable(true);
            }
        },
    });

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setUsernameError(null);

        const formData = new FormData(e.currentTarget);
        setUsernameMutation.mutate(formData);
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
                        {dict.auth.choose_username.welcome_title}
                    </h1>
                    <p className="text-gray-600 text-lg max-w-md mx-auto leading-relaxed">
                        {dict.auth.choose_username.welcome_subtitle}
                    </p>

                    {/* Feature highlights */}
                    <div className="mt-12 space-y-4 text-left max-w-sm mx-auto">
                        <div className="flex items-center gap-3 text-gray-700">
                            <div className="w-2 h-2 rounded-full bg-[#05dc7f]" />
                            <span>{dict.auth.choose_username.feature_identity}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-700">
                            <div className="w-2 h-2 rounded-full bg-[#05dc7f]" />
                            <span>{dict.auth.choose_username.feature_share}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-700">
                            <div className="w-2 h-2 rounded-full bg-[#05dc7f]" />
                            <span>{dict.auth.choose_username.feature_url}</span>
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
                            {dict.auth.choose_username.title}
                        </h2>
                        <p className="text-gray-500 text-center">
                            {userName ? (
                                <>{dict.auth.choose_username.welcome_prefix}<span className="font-medium text-gray-700">{userName}</span>{dict.auth.choose_username.welcome_suffix}</>
                            ) : (
                                <>{dict.auth.choose_username.subtitle_default}</>
                            )}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Username Input */}
                        <div className="space-y-1">
                            <Label htmlFor="username" className="text-gray-700 font-medium">
                                {dict.auth.choose_username.username_label}
                            </Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 select-none">
                                    @
                                </span>
                                <Input
                                    id="username"
                                    name="username"
                                    placeholder={dict.auth.choose_username.username_placeholder}
                                    required
                                    autoFocus
                                    className="h-11 pl-8 focus:ring-2 focus:ring-[#05dc7f]/20 focus:border-[#05dc7f] transition-all"
                                    onChange={(e) => {
                                        const value = e.target.value;

                                        if (usernameError) setUsernameError(null);
                                        if (usernameAvailable) setUsernameAvailable(false);

                                        if (value.length >= 3 && value.length <= 20) {
                                            setUsernameHelpVisible(false);

                                            // Debounce: clear previous timeout and set new one
                                            if (debounceRef.current) {
                                                clearTimeout(debounceRef.current);
                                            }

                                            debounceRef.current = setTimeout(() => {
                                                if (value !== lastCheckedUsername) {
                                                    setLastCheckedUsername(value);
                                                    checkUsernameMutation.mutate(value);
                                                }
                                            }, 500);
                                        } else {
                                            setUsernameHelpVisible(true);
                                            // Clear timeout if username becomes invalid
                                            if (debounceRef.current) {
                                                clearTimeout(debounceRef.current);
                                            }
                                        }
                                    }}
                                    onBlur={(e) => {
                                        const value = e.target.value;

                                        // Clear debounce and check immediately on blur
                                        if (debounceRef.current) {
                                            clearTimeout(debounceRef.current);
                                        }

                                        if (value.length < 3 || value.length > 20) return;
                                        if (value === lastCheckedUsername) return;

                                        setLastCheckedUsername(value);
                                        checkUsernameMutation.mutate(value);
                                    }}
                                />
                            </div>
                            {usernameHelpVisible && (
                                <p className="text-xs text-gray-400 mt-1">{dict.auth.choose_username.help_text}</p>
                            )}
                            {checkUsernameMutation.isPending && (
                                <p className="text-xs text-gray-400 mt-1">{dict.auth.choose_username.checking}</p>
                            )}
                            {usernameAvailable && (
                                <p className="text-xs text-green-500 mt-1">{dict.auth.choose_username.available}</p>
                            )}
                            {usernameError && (
                                <p className="text-red-500 text-xs mt-1">
                                    {usernameError}
                                </p>
                            )}
                        </div>

                        {/* Preview */}
                        {!usernameHelpVisible && usernameAvailable && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mt-4">
                                <p className="text-sm text-emerald-800">
                                    {dict.auth.choose_username.preview_label}
                                </p>
                                <p className="text-sm font-medium text-emerald-900 mt-1">
                                    retold.com.br/<span className="text-[#05dc7f]">{lastCheckedUsername}</span>
                                </p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={
                                setUsernameMutation.isPending ||
                                !!usernameError ||
                                !usernameAvailable ||
                                usernameHelpVisible
                            }
                            className="w-full h-11 bg-[#05dc7f] hover:bg-[#04c370] text-gray-900 font-semibold text-base transition-all active:scale-[0.98] mt-6 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {setUsernameMutation.isPending ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    {dict.auth.choose_username.setting_up}
                                </span>
                            ) : (
                                dict.auth.choose_username.continue
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
