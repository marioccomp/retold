"use client";

import { useState, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import { signIn, signOut } from "next-auth/react";
import { toast } from "sonner";
import {
  FiGithub,
  FiShield,
  FiAlertTriangle,
  FiCheckCircle,
  FiGlobe,
  FiAlertCircle,
} from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  updatePasswordAction,
  deleteAccountAction,
  getConnectedProvidersAction,
} from "@/src/actions/settings";
import { setLanguageAction, setAnalysisLanguageAction } from "@/src/actions/language";
import { useTranslation } from "@/src/i18n/client";
import { createLogger } from "@repo/observability";

const logger = createLogger("web.ui.settings-client");

export function SettingsClient({
  initialAnalysisLocale = "auto",
  initialHasPassword,
}: {
  initialAnalysisLocale?: string;
  initialHasPassword: boolean;
}) {
  const { dict, lang } = useTranslation();
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [isGithubLinked, setIsGithubLinked] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [deleteCredential, setDeleteCredential] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [pendingPassword, startPasswordTransition] = useTransition();
  const [pendingDelete, startDeleteTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadProviders() {
      try {
        const connected = await getConnectedProvidersAction();
        setIsGithubLinked(connected.includes("github"));
      } catch (error) {
        logger.error("settings.providers_load_failed", error);
      } finally {
        setLoadingProviders(false);
      }
    }
    loadProviders();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const github = params.get("github");
    const reauth = params.get("reauth");

    if (!github && !reauth) return;

    if (github === "linked") toast.success("GitHub conectado com sucesso.");
    if (reauth === "account-delete") {
      toast.success(dict.settings.dangerZone.reauth.oauth_success);
      setActiveTab("danger");
    }

    if (github && reauth !== "account-delete") {
      setActiveTab("integrations");
    }

    if (github === "already_linked") setLinkError("already_linked");
    if (github === "oauth_error") toast.error("Falha ao conectar o GitHub. Tente novamente.");

    window.history.replaceState(null, "", "/settings");
  }, [dict.settings.dangerZone.reauth.oauth_success]);

  async function handleUpdatePassword(formData: FormData) {
    const form = document.getElementById("password-form") as HTMLFormElement;

    startPasswordTransition(async () => {
      const result = await updatePasswordAction(null, formData);
      if (result && "error" in result) {
        if (typeof result.error === "string") {
          toast.error(result.error);
        } else {
          const errors = result.error as Record<string, string[]>;
          const firstError = Object.values(errors)[0]?.[0];
          toast.error(firstError || dict.settings.dangerZone.toast.update_error);

          // Limpeza Seletiva:
          // 1. Se erro for na senha atual, limpa ela
          if (errors.currentPassword) {
            const currentInput = form?.querySelector(
              'input[name="currentPassword"]'
            ) as HTMLInputElement;
            if (currentInput) currentInput.value = "";
          }

          // 2. Se erro for no email (fluxo de criação), limpa ele
          if (errors.email) {
            const emailInput = form?.querySelector('input[name="email"]') as HTMLInputElement;
            if (emailInput) emailInput.value = "";
          }

          // 3. Se erro for na nova senha ou confirmação, limpa AMBAS
          if (errors.newPassword || errors.confirmPassword) {
            const newPwdInput = form?.querySelector(
              'input[name="newPassword"]'
            ) as HTMLInputElement;
            const confirmInput = form?.querySelector(
              'input[name="confirmPassword"]'
            ) as HTMLInputElement;
            if (newPwdInput) newPwdInput.value = "";
            if (confirmInput) confirmInput.value = "";
          }
        }
      } else if (result && "success" in result) {
        form?.reset();

        if ("requiresReauth" in result && result.requiresReauth) {
          await signOut({ callbackUrl: "/login?reauth=password-updated" });
          return;
        }

        toast.success(result.success);
      }
    });
  }

  async function handleLinkGithub() {
    window.location.href = "/api/github/link";
  }

  function handleDeleteAccount() {
    setDeleteCredential("");
    setDeleteError(null);
    setShowDeleteModal(true);
  }

  async function handleDeleteGithubReauth() {
    setDeleteError(null);
    await signIn("github", { callbackUrl: "/settings?reauth=account-delete" });
  }

  function confirmDeleteAccount() {
    startDeleteTransition(async () => {
      setDeleteError(null);

      const result = await deleteAccountAction(deleteCredential);

      if (!result.success) {
        setDeleteError(result.message);
        toast.error(result.message);
        return;
      }

      setShowDeleteModal(false);
      await signOut({ callbackUrl: "/" });
    });
  }

  async function handleLanguageChange(value: string) {
    const formData = new FormData();
    formData.append("locale", value);
    await setLanguageAction(formData);
    window.location.reload();
  }

  async function handleAnalysisLanguageChange(value: string) {
    const formData = new FormData();
    formData.append("analysisLocale", value);
    await setAnalysisLanguageAction(formData);
  }

  const navItems = [
    { id: "general", label: dict.settings.language.title, icon: FiGlobe },
    { id: "security", label: dict.settings.security, icon: FiShield },
    { id: "integrations", label: dict.settings.integrations, icon: FiGithub },
    { id: "danger", label: dict.settings.danger, icon: FiAlertTriangle },
  ];

  return (
    <div className="max-w-6xl mx-auto py-6 md:py-10 px-4 md:px-6">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          {dict.settings.title}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          {dict.settings.description}
        </p>
      </div>

      <Separator className="mb-8" />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col md:flex-row md:items-start gap-6 md:gap-8"
      >
        {/* Sidebar Navigation */}
        <TabsList className="grid grid-cols-2 md:flex md:flex-col h-auto w-full md:w-64 bg-transparent p-0 gap-2 shrink-0 self-start sticky md:top-24">
          {navItems.map((item) => (
            <TabsTrigger
              key={item.id}
              value={item.id}
              data-testid={`settings-tab-${item.id}`}
              className={`cursor-pointer justify-start gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:h-12 w-full text-left rounded-xl border transition-all
                                border-primary/20 data-[state=active]:bg-primary/10 data-[state=active]:border-primary data-[state=active]:shadow-sm
                                hover:bg-muted/50 flex flex-col md:flex-row items-center md:items-center
                                ${item.id === "danger" ? "border-destructive/20 text-destructive data-[state=active]:text-destructive data-[state=active]:bg-destructive/10 data-[state=active]:border-destructive" : "text-muted-foreground data-[state=active]:text-foreground"}
                            `}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="font-medium text-xs md:text-base text-center md:text-left truncate w-full md:w-auto">
                {item.label}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {/* General Section (Language) */}
          <TabsContent value="general" className="mt-0 space-y-6">
            <Card className="border-primary/30 shadow-sm">
              <CardHeader>
                <CardTitle>{dict.settings.language.title}</CardTitle>
                <CardDescription>{dict.settings.language.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>{dict.settings.language.label}</Label>
                  <Select defaultValue={lang} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="w-full sm:w-[180px] cursor-pointer">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en" className="cursor-pointer">
                        English
                      </SelectItem>
                      <SelectItem value="pt" className="cursor-pointer">
                        Português
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>{dict.settings.language.analysis_language_label}</Label>
                  <p className="text-sm text-muted-foreground">
                    {dict.settings.language.analysis_language_description}
                  </p>
                  <Select
                    defaultValue={initialAnalysisLocale}
                    onValueChange={handleAnalysisLanguageChange}
                  >
                    <SelectTrigger className="w-full sm:w-[220px] cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto" className="cursor-pointer">
                        {dict.settings.language.analysis_language_same}
                      </SelectItem>
                      <SelectItem value="en" className="cursor-pointer">
                        English
                      </SelectItem>
                      <SelectItem value="pt" className="cursor-pointer">
                        Português
                      </SelectItem>
                      <SelectItem value="es" className="cursor-pointer">
                        Español
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Section */}
          <TabsContent value="security" className="mt-0 space-y-6">
            <Card className="border-primary/30 shadow-sm">
              <CardHeader>
                <CardTitle>
                  {initialHasPassword
                    ? dict.settings.password.title
                    : dict.settings.password.create_title}
                </CardTitle>
                <CardDescription>
                  {initialHasPassword
                    ? dict.settings.password.description
                    : dict.settings.password.create_description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  id="password-form"
                  data-testid="settings-password-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUpdatePassword(new FormData(e.currentTarget));
                  }}
                  className="space-y-4"
                  noValidate
                >
                  {initialHasPassword ? (
                    <div className="grid gap-2">
                      <Label htmlFor="currentPassword">{dict.settings.password.current}</Label>
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type="password"
                        data-testid="settings-current-password-input"
                      />
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <Label htmlFor="email">{dict.settings.password.confirm_email_label}</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="name@example.com"
                        data-testid="settings-email-input"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="newPassword">{dict.settings.password.new}</Label>
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        data-testid="settings-new-password-input"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirmPassword">{dict.settings.password.confirm}</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        data-testid="settings-confirm-password-input"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={pendingPassword}
                      data-testid="settings-password-submit-button"
                      className="cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                    >
                      {pendingPassword
                        ? dict.settings.password.buttonUpdating
                        : initialHasPassword
                          ? dict.settings.password.button
                          : dict.settings.password.button_create}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Section */}
          <TabsContent value="integrations" className="mt-0 space-y-6">
            <Card className="border-primary/30 shadow-sm">
              <CardHeader>
                <CardTitle>{dict.settings.connectedAccounts.title}</CardTitle>
                <CardDescription>{dict.settings.connectedAccounts.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {linkError === "already_linked" && (
                  <Alert variant="destructive">
                    <FiAlertCircle className="h-4 w-4" />
                    <AlertTitle>{dict.settings.connectedAccounts.error_title}</AlertTitle>
                    <AlertDescription>
                      {dict.settings.connectedAccounts.already_linked_error}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-muted/30 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-card p-2 rounded-full border shadow-sm shrink-0">
                      <FiGithub className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">GitHub</p>
                      <p className="text-sm text-muted-foreground break-words whitespace-normal leading-tight">
                        {dict.settings.connectedAccounts.github}
                      </p>
                    </div>
                  </div>
                  <div className="w-full sm:w-auto">
                    {loadingProviders ? (
                      <Button variant="ghost" disabled size="sm" className="w-full sm:w-auto">
                        {dict.settings.connectedAccounts.loading}
                      </Button>
                    ) : isGithubLinked ? (
                      <Badge
                        variant="outline"
                        className="bg-primary/10 text-primary border-primary/20 gap-1 px-3 py-1 w-full sm:w-auto justify-center"
                      >
                        <FiCheckCircle className="h-3 w-3" />{" "}
                        {dict.settings.connectedAccounts.connected}
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        className="cursor-pointer w-full sm:w-auto"
                        size="sm"
                        onClick={handleLinkGithub}
                      >
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
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 md:p-10 flex flex-col items-center text-center gap-6 shadow-sm">
              <div className="flex flex-col items-center gap-4">
                <div className="bg-card p-3 md:p-4 rounded-2xl border border-destructive/20 text-destructive shadow-sm">
                  <FiAlertTriangle size={24} className="md:w-8 md:h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-destructive font-black text-xl md:text-2xl tracking-tight">
                    {dict.settings.dangerZone.title}
                  </h3>
                  <p className="text-sm md:text-base text-destructive/80 leading-relaxed max-w-md mx-auto">
                    {dict.settings.dangerZone.description}
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={pendingDelete}
                data-testid="settings-open-delete-modal-button"
                className="cursor-pointer font-bold h-11 md:h-12 px-8 md:px-10 rounded-xl shadow-lg shadow-destructive/20 transition-all duration-300 active:scale-95 shrink-0 w-full sm:w-auto"
              >
                {pendingDelete
                  ? dict.settings.dangerZone.buttonDeleting
                  : dict.settings.dangerZone.button}
              </Button>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal &&
        mounted &&
        createPortal(
          <div
            data-testid="settings-delete-modal"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                setShowDeleteModal(false);
              }
            }}
          >
            <div
              className="bg-background rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-center">
                <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                  <FiAlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {dict.settings.dangerZone.modal_title}
                </h3>
                <p className="text-muted-foreground text-sm mb-6">
                  {dict.settings.dangerZone.modal_description}
                </p>
                {initialHasPassword ? (
                  <div className="text-left mb-4 space-y-2">
                    <Label htmlFor="delete-account-password">
                      {dict.settings.dangerZone.reauth.password_label}
                    </Label>
                    <Input
                      id="delete-account-password"
                      type="password"
                      data-testid="settings-delete-password-input"
                      value={deleteCredential}
                      onChange={(e) => {
                        setDeleteCredential(e.target.value);
                        if (deleteError) setDeleteError(null);
                      }}
                      placeholder={dict.settings.dangerZone.reauth.password_placeholder}
                      disabled={pendingDelete}
                    />
                    <p className="text-xs text-muted-foreground">
                      {dict.settings.dangerZone.reauth.password_help}
                    </p>
                  </div>
                ) : (
                  <div className="text-left mb-4 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {dict.settings.dangerZone.reauth.oauth_help}
                    </p>
                    {isGithubLinked ? (
                      <Button
                        variant="outline"
                        data-testid="settings-link-github-button"
                        className="w-full font-medium cursor-pointer"
                        onClick={handleDeleteGithubReauth}
                        disabled={pendingDelete}
                      >
                        {dict.settings.dangerZone.reauth.oauth_button}
                      </Button>
                    ) : (
                      <Alert variant="destructive">
                        <FiAlertCircle className="h-4 w-4" />
                        <AlertTitle>{dict.settings.connectedAccounts.error_title}</AlertTitle>
                        <AlertDescription>
                          {dict.settings.dangerZone.reauth.oauth_missing_provider}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
                {deleteError && (
                  <p className="text-destructive text-sm mb-4 text-left">{deleteError}</p>
                )}
                <div className="flex flex-col gap-2">
                  <Button
                    variant="destructive"
                    className="w-full font-medium cursor-pointer"
                    onClick={confirmDeleteAccount}
                    data-testid="settings-confirm-delete-button"
                    disabled={
                      pendingDelete ||
                      (initialHasPassword ? deleteCredential.trim().length === 0 : !isGithubLinked)
                    }
                  >
                    {pendingDelete
                      ? dict.settings.dangerZone.buttonDeleting
                      : dict.settings.dangerZone.modal_confirm}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground hover:bg-muted font-medium cursor-pointer"
                    onClick={() => setShowDeleteModal(false)}
                    data-testid="settings-cancel-delete-button"
                    disabled={pendingDelete}
                  >
                    {dict.settings.dangerZone.modal_cancel}
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
