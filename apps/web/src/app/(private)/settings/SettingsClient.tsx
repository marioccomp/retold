"use client";

import { useState, useEffect, useRef, useTransition } from "react";
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
  const [requiresDeleteGithubReauth, setRequiresDeleteGithubReauth] = useState(false);
  const contentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [contentMinHeight, setContentMinHeight] = useState<number | null>(null);

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
    const pendingGithubConnectToast =
      window.sessionStorage.getItem("settings:github-connect-required") === "1";
    const cleanupTimers: number[] = [];
    const schedule = (callback: () => void, delay: number) => {
      const timer = window.setTimeout(callback, delay);
      cleanupTimers.push(timer);
    };

    if (!github && !reauth && !pendingGithubConnectToast) return;

    if (github === "linked") {
      schedule(() => {
        toast.success("GitHub conectado com sucesso.");
      }, 80);
    }
    if (reauth === "account-delete") {
      schedule(() => {
        toast.success(dict.settings.dangerZone.reauth.oauth_success);
      }, 80);
      setActiveTab("danger");
      setRequiresDeleteGithubReauth(false);
    }

    if (github && reauth !== "account-delete") {
      setActiveTab("integrations");
    }

    if (github === "already_linked") setLinkError("already_linked");
    if (github === "oauth_error") {
      schedule(() => {
        toast.error("Falha ao conectar o GitHub. Tente novamente.");
      }, 80);
    }
    if (github === "connect_required" || pendingGithubConnectToast) {
      setActiveTab("integrations");
      schedule(() => {
        toast.error(dict.settings.connectedAccounts.connect_required);
        window.sessionStorage.removeItem("settings:github-connect-required");
      }, 120);
    } else {
      window.sessionStorage.removeItem("settings:github-connect-required");
    }

    schedule(() => {
      window.history.replaceState(null, "", "/settings");
    }, 160);

    return () => {
      for (const timer of cleanupTimers) {
        window.clearTimeout(timer);
      }
    };
  }, [
    dict.settings.connectedAccounts.connect_required,
    dict.settings.dangerZone.reauth.oauth_success,
  ]);

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
    setRequiresDeleteGithubReauth(false);
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
        if (result.requiresOAuthReauth) {
          setRequiresDeleteGithubReauth(true);
        }
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

  const shouldShowDeleteGithubReauth =
    !initialHasPassword &&
    (requiresDeleteGithubReauth ||
      deleteError === dict.settings.dangerZone.reauth.oauth_required);

  useEffect(() => {
    const measureContentHeight = () => {
      const heights = Object.values(contentRefs.current)
        .map((node) => node?.scrollHeight ?? 0)
        .filter(Boolean);

      if (heights.length > 0) {
        setContentMinHeight(Math.max(...heights));
      }
    };

    const frame = window.requestAnimationFrame(measureContentHeight);
    window.addEventListener("resize", measureContentHeight);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", measureContentHeight);
    };
  }, [activeTab, loadingProviders, linkError, shouldShowDeleteGithubReauth, initialHasPassword]);

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
        <TabsList className="grid grid-cols-2 md:flex md:flex-col h-auto w-full md:w-64 bg-transparent p-0 gap-2 shrink-0 self-start md:sticky md:top-24">
          {navItems.map((item) => (
            <TabsTrigger
              key={item.id}
              value={item.id}
              data-testid={`settings-tab-${item.id}`}
              className={`group cursor-pointer justify-start gap-3 px-4 py-3 md:h-14 w-full text-left rounded-2xl border transition-all duration-200
                                bg-background border-border/75 shadow-[0_8px_22px_-18px_rgba(0,0,0,0.18)] hover:border-border hover:bg-muted/[0.26]
                                data-[state=active]:shadow-[0_14px_36px_-26px_rgba(0,0,0,0.18)] flex flex-col md:flex-row items-center md:items-center
                                ${item.id === "danger" ? "text-destructive/80 data-[state=active]:text-destructive data-[state=active]:bg-destructive/[0.06] data-[state=active]:border-destructive/35 hover:border-destructive/25" : "text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-primary/[0.07] data-[state=active]:border-primary/35"}
                            `}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors
                            ${item.id === "danger" ? "border-destructive/20 bg-destructive/[0.05] text-destructive" : "border-primary/18 bg-primary/[0.07] text-primary"}
                            group-data-[state=inactive]:border-border/70 group-data-[state=inactive]:bg-background group-data-[state=inactive]:text-current`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
              </div>
              <div className="flex min-w-0 flex-col items-center md:items-start">
                <span className="font-semibold text-xs md:text-[0.98rem] text-center md:text-left truncate w-full md:w-auto">
                  {item.label}
                </span>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Content Area */}
        <div
          className="relative flex-1 min-w-0"
          style={contentMinHeight ? { minHeight: `${contentMinHeight}px` } : undefined}
        >
          {/* General Section (Language) */}
          <TabsContent
            value="general"
            forceMount
            ref={(node) => {
              contentRefs.current.general = node;
            }}
            className="mt-0 w-full space-y-6 data-[state=inactive]:pointer-events-none data-[state=inactive]:absolute data-[state=inactive]:inset-0 data-[state=inactive]:opacity-0 data-[state=active]:relative"
          >
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
          <TabsContent
            value="security"
            forceMount
            ref={(node) => {
              contentRefs.current.security = node;
            }}
            className="mt-0 w-full space-y-6 data-[state=inactive]:pointer-events-none data-[state=inactive]:absolute data-[state=inactive]:inset-0 data-[state=inactive]:opacity-0 data-[state=active]:relative"
          >
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
                      className="cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
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
          <TabsContent
            value="integrations"
            forceMount
            ref={(node) => {
              contentRefs.current.integrations = node;
            }}
            className="mt-0 w-full space-y-6 data-[state=inactive]:pointer-events-none data-[state=inactive]:absolute data-[state=inactive]:inset-0 data-[state=inactive]:opacity-0 data-[state=active]:relative"
          >
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
                        className="cursor-pointer w-full sm:w-auto dark:hover:bg-primary/10 dark:hover:border-primary/40 dark:hover:text-primary"
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
          <TabsContent
            value="danger"
            forceMount
            ref={(node) => {
              contentRefs.current.danger = node;
            }}
            className="mt-0 w-full space-y-6 data-[state=inactive]:pointer-events-none data-[state=inactive]:absolute data-[state=inactive]:inset-0 data-[state=inactive]:opacity-0 data-[state=active]:relative"
          >
            <div className="rounded-[1.5rem] border border-destructive/18 bg-[linear-gradient(180deg,rgba(255,248,248,0.96)_0%,rgba(255,252,252,0.98)_100%)] px-6 py-8 text-center shadow-[0_20px_50px_-38px_rgba(255,77,77,0.28)] dark:border-destructive/22 dark:bg-[linear-gradient(180deg,rgba(34,20,20,0.88)_0%,rgba(24,17,17,0.94)_100%)] dark:shadow-[0_24px_70px_-46px_rgba(255,77,77,0.34)] md:px-10 md:py-10">
              <div className="mx-auto flex max-w-xl flex-col items-center gap-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-destructive/18 bg-background/92 text-destructive shadow-[0_12px_26px_-18px_rgba(255,77,77,0.28)] dark:border-destructive/24 dark:bg-black/10">
                  <FiAlertTriangle size={26} />
                </div>
                <div className="space-y-3">
                  <h3 className="text-destructive font-black text-[1.75rem] tracking-tight">
                    {dict.settings.dangerZone.title}
                  </h3>
                  <p className="mx-auto max-w-lg text-sm leading-7 text-foreground/78 dark:text-foreground/82 md:text-base">
                    {dict.settings.dangerZone.description}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={pendingDelete}
                  data-testid="settings-open-delete-modal-button"
                  className="cursor-pointer h-11 rounded-xl px-8 font-bold shadow-[0_16px_32px_-18px_rgba(255,77,77,0.42)] transition-all duration-300 hover:shadow-[0_20px_36px_-18px_rgba(255,77,77,0.46)] active:scale-95 md:px-10"
                >
                  {pendingDelete
                    ? dict.settings.dangerZone.buttonDeleting
                    : dict.settings.dangerZone.button}
                </Button>
              </div>
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
                    {shouldShowDeleteGithubReauth ? (
                      <p className="text-sm text-muted-foreground">
                        {dict.settings.dangerZone.reauth.oauth_help}
                      </p>
                    ) : null}
                    {shouldShowDeleteGithubReauth ? (
                      isGithubLinked ? (
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
                      )
                    ) : null}
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
                      (initialHasPassword
                        ? deleteCredential.trim().length === 0
                        : shouldShowDeleteGithubReauth)
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
