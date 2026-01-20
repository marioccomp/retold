"use client";

import { useState, useEffect, useTransition } from "react";
import { useSession, signIn } from "next-auth/react";
import { toast } from "sonner";
import { FiGithub, FiShield, FiAlertTriangle, FiCheckCircle, FiSettings, FiGlobe } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updatePasswordAction, deleteAccountAction, getConnectedProvidersAction } from "@/src/actions/settings";
import { setLanguageAction } from "@/src/actions/language";
import { useTranslation } from "@/src/i18n/client";

export function SettingsClient() {
    const { data: session } = useSession();
    const { dict, lang } = useTranslation();
    const [providers, setProviders] = useState<string[]>([]);
    const [loadingProviders, setLoadingProviders] = useState(true);
    const [isGithubLinked, setIsGithubLinked] = useState(false);

    const [pendingPassword, startPasswordTransition] = useTransition();
    const [pendingDelete, startDeleteTransition] = useTransition();

    useEffect(() => {
        async function loadProviders() {
            try {
                const connected = await getConnectedProvidersAction();
                setProviders(connected);
                setIsGithubLinked(connected.includes("github"));
            } catch (error) {
                console.error("Failed to load providers", error);
            } finally {
                setLoadingProviders(false);
            }
        }
        loadProviders();
    }, []);

    async function handleUpdatePassword(formData: FormData) {
        startPasswordTransition(async () => {
            const result = await updatePasswordAction(null, formData);
            if (result?.error) {
                if (typeof result.error === "string") {
                    toast.error(result.error);
                } else {
                    const firstError = Object.values(result.error)[0]?.[0];
                    toast.error(firstError || dict.settings.dangerZone.toast.update_error);
                }
            } else if (result?.success) {
                toast.success(result.success);
                const form = document.getElementById("password-form") as HTMLFormElement;
                form?.reset();
            }
        });
    }

    async function handleLinkGithub() {
        await signIn("github", { callbackUrl: "/settings" });
    }

    async function handleDeleteAccount() {
        if (window.confirm(dict.settings.dangerZone.toast.delete_confirm)) {
            startDeleteTransition(async () => {
                try {
                    await deleteAccountAction();
                } catch (error) {
                    toast.error(dict.settings.dangerZone.toast.delete_error);
                }
            });
        }
    }

    async function handleLanguageChange(value: string) {
        const formData = new FormData();
        formData.append('locale', value);
        await setLanguageAction(formData);
        window.location.reload();
    }

    const navItems = [
        { id: "general", label: dict.settings.language.title, icon: FiGlobe },
        { id: "security", label: dict.settings.security, icon: FiShield },
        { id: "integrations", label: dict.settings.integrations, icon: FiGithub },
        { id: "danger", label: dict.settings.danger, icon: FiAlertTriangle },
    ];

    return (
        <div className="max-w-6xl mx-auto py-10 px-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">{dict.settings.title}</h1>
                <p className="text-gray-500 mt-2">{dict.settings.description}</p>
            </div>

            <Separator className="mb-8" />

            <Tabs defaultValue="general" className="flex flex-col md:flex-row md:items-start gap-8">
                {/* Sidebar Navigation */}
                <TabsList className="flex flex-row md:flex-col h-auto w-full md:w-56 bg-transparent p-0 gap-1 shrink-0 self-start sticky top-24">
                    {navItems.map((item) => (
                        <TabsTrigger
                            key={item.id}
                            value={item.id}
                            className={`cursor-pointer !flex-none justify-start gap-3 px-4 h-12 text-left rounded-lg border transition-all
                                border-transparent data-[state=active]:bg-gray-100 data-[state=active]:border-gray-200 data-[state=active]:shadow-sm
                                hover:bg-gray-50 w-full
                                ${item.id === "danger" ? "text-red-600 data-[state=active]:text-red-700" : "text-gray-700"}
                            `}
                        >
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            <span className="font-medium">{item.label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* Content Area */}
                <div className="flex-1 min-w-0">
                    {/* General Section (Language) */}
                    <TabsContent value="general" className="mt-0 space-y-6">
                        <Card className="border-gray-200 shadow-sm">
                            <CardHeader>
                                <CardTitle>{dict.settings.language.title}</CardTitle>
                                <CardDescription>{dict.settings.language.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Label>{dict.settings.language.label}</Label>
                                    <Select defaultValue={lang} onValueChange={handleLanguageChange}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Select language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en">English</SelectItem>
                                            <SelectItem value="pt">Português</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Security Section */}
                    <TabsContent value="security" className="mt-0 space-y-6">
                        <Card className="border-gray-200 shadow-sm">
                            <CardHeader>
                                <CardTitle>{dict.settings.password.title}</CardTitle>
                                <CardDescription>{dict.settings.password.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form id="password-form" action={handleUpdatePassword} className="space-y-4" noValidate>
                                    <div className="grid gap-2">
                                        <Label htmlFor="currentPassword">{dict.settings.password.current}</Label>
                                        <Input id="currentPassword" name="currentPassword" type="password" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="newPassword">{dict.settings.password.new}</Label>
                                            <Input id="newPassword" name="newPassword" type="password" />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="confirmPassword">{dict.settings.password.confirm}</Label>
                                            <Input id="confirmPassword" name="confirmPassword" type="password" />
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <Button type="submit" disabled={pendingPassword} className="cursor-pointer bg-[#05dc7f] hover:bg-[#04c370] text-gray-900 font-medium">
                                            {pendingPassword ? dict.settings.password.buttonUpdating : dict.settings.password.button}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Integrations Section */}
                    <TabsContent value="integrations" className="mt-0 space-y-6">
                        <Card className="border-gray-200 shadow-sm">
                            <CardHeader>
                                <CardTitle>{dict.settings.connectedAccounts.title}</CardTitle>
                                <CardDescription>{dict.settings.connectedAccounts.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50/50">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white p-2 rounded-full border shadow-sm">
                                            <FiGithub className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="font-medium">GitHub</p>
                                            <p className="text-sm text-gray-500">{dict.settings.connectedAccounts.github}</p>
                                        </div>
                                    </div>
                                    <div>
                                        {loadingProviders ? (
                                            <Button variant="ghost" disabled size="sm">{dict.settings.connectedAccounts.loading}</Button>
                                        ) : isGithubLinked ? (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 px-3 py-1">
                                                <FiCheckCircle className="h-3 w-3" /> {dict.settings.connectedAccounts.connected}
                                            </Badge>
                                        ) : (
                                            <Button variant="outline" className="cursor-pointer" size="sm" onClick={handleLinkGithub}>
                                                {dict.settings.connectedAccounts.connect}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Danger Zone */}
                    <TabsContent value="danger" className="mt-0 space-y-6">
                        <div className="bg-red-50/40 border border-red-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
                            <div className="flex items-start gap-4">
                                <div className="bg-red-100/50 p-3 rounded-xl border border-red-200 text-red-600 shrink-0">
                                    <FiAlertTriangle size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-red-900 font-bold text-lg">{dict.settings.dangerZone.title}</h3>
                                    <p className="text-sm text-red-800/70 leading-relaxed max-w-md">
                                        {dict.settings.dangerZone.description}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteAccount}
                                disabled={pendingDelete}
                                className="cursor-pointer bg-red-600 text-white font-bold h-11 px-8 rounded-lg shadow-md opacity-60 hover:opacity-100 transition-all duration-300 active:scale-[0.98] shrink-0"
                            >
                                {pendingDelete ? dict.settings.dangerZone.buttonDeleting : dict.settings.dangerZone.button}
                            </Button>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
