"use client";

import { useState, useEffect, useTransition } from "react";
import { useSession, signIn } from "next-auth/react";
import { toast } from "sonner";
import { FiGithub, FiShield, FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updatePasswordAction, deleteAccountAction, getConnectedProvidersAction } from "@/src/actions/settings";

export default function SettingsPage() {
    const { data: session } = useSession();
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
                    toast.error(firstError || "Failed to update password");
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
        if (window.confirm("Are you sure you want to delete your account? This action cannot be undone and will delete all your projects and data.")) {
            startDeleteTransition(async () => {
                try {
                    await deleteAccountAction();
                } catch (error) {
                    toast.error("Failed to delete account");
                }
            });
        }
    }

    const navItems = [
        { id: "security", label: "Security", icon: FiShield },
        { id: "integrations", label: "Integrations", icon: FiGithub },
        { id: "danger", label: "Danger Zone", icon: FiAlertTriangle },
    ];

    return (
        <div className="max-w-6xl mx-auto py-10 px-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Settings</h1>
                <p className="text-gray-500 mt-2">Manage your account settings and preferences.</p>
            </div>

            <Separator className="mb-8" />

            <Tabs defaultValue="security" className="flex flex-col md:flex-row md:items-start gap-8">
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
                    {/* Security Section */}
                    <TabsContent value="security" className="mt-0 space-y-6">
                        <Card className="border-gray-200 shadow-sm">
                            <CardHeader>
                                <CardTitle>Change Password</CardTitle>
                                <CardDescription>Update your password to keep your account secure.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form id="password-form" action={handleUpdatePassword} className="space-y-4" noValidate>
                                    <div className="grid gap-2">
                                        <Label htmlFor="currentPassword">Current Password</Label>
                                        <Input id="currentPassword" name="currentPassword" type="password" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="newPassword">New Password</Label>
                                            <Input id="newPassword" name="newPassword" type="password" />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                                            <Input id="confirmPassword" name="confirmPassword" type="password" />
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <Button type="submit" disabled={pendingPassword} className="cursor-pointer bg-[#05dc7f] hover:bg-[#04c370] text-gray-900 font-medium">
                                            {pendingPassword ? "Updating..." : "Update Password"}
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
                                <CardTitle>Connected Accounts</CardTitle>
                                <CardDescription>Manage your connected accounts for easier login.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50/50">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white p-2 rounded-full border shadow-sm">
                                            <FiGithub className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="font-medium">GitHub</p>
                                            <p className="text-sm text-gray-500">Connect your GitHub account</p>
                                        </div>
                                    </div>
                                    <div>
                                        {loadingProviders ? (
                                            <Button variant="ghost" disabled size="sm">Loading...</Button>
                                        ) : isGithubLinked ? (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 px-3 py-1">
                                                <FiCheckCircle className="h-3 w-3" /> Connected
                                            </Badge>
                                        ) : (
                                            <Button variant="outline" className="cursor-pointer" size="sm" onClick={handleLinkGithub}>
                                                Connect
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
                                    <h3 className="text-red-900 font-bold text-lg">Delete Account</h3>
                                    <p className="text-sm text-red-800/70 leading-relaxed max-w-md">
                                        Permanently delete your account and all of your data. This action cannot be undone. All your project data will be lost.
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteAccount}
                                disabled={pendingDelete}
                                className="cursor-pointer bg-red-600 text-white font-bold h-11 px-8 rounded-lg shadow-md opacity-60 hover:opacity-100 transition-all duration-300 active:scale-[0.98] shrink-0"
                            >
                                {pendingDelete ? "Deleting..." : "Delete Account"}
                            </Button>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
