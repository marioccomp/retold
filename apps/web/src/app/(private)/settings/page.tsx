import { redirect } from "next/navigation";
import { auth } from "@/src/domains/auth/auth";
import { SettingsClient } from "./SettingsClient";
import { getAnalysisLanguageCookie } from "@/src/actions/language";

export default async function SettingsPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    const analysisLocale = await getAnalysisLanguageCookie();

    return (
        <SettingsClient initialAnalysisLocale={analysisLocale} />
    );
}
