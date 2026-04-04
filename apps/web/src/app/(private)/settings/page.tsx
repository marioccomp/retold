import { redirect } from "next/navigation";
import { auth } from "@/src/domains/auth/auth";
import { SettingsClient } from "./SettingsClient";
import { getAnalysisLanguageCookie } from "@/src/actions/language";
import { prisma } from "@repo/database";

export default async function SettingsPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    const analysisLocale = await getAnalysisLanguageCookie();
    const user = await prisma.user.findUnique({
        where: { id: Number(session.user.id) },
        select: { password: true },
    });

    if (!user) {
        redirect("/login");
    }

    return (
        <SettingsClient
            initialAnalysisLocale={analysisLocale}
            initialHasPassword={Boolean(user.password)}
        />
    );
}
