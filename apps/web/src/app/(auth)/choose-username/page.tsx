import { auth } from "@/src/domains/auth/auth";
import { redirect } from "next/navigation";
import ChooseUsernameForm from "./ChooseUsernameForm";

export default async function Page() {
    const session = await auth();

    // If not logged in, redirect to login
    if (!session) {
        redirect("/login");
    }

    // If user already has username, redirect to dashboard
    if (session.user.username) {
        redirect("/dashboard");
    }

    return <ChooseUsernameForm userName={session.user.name ?? ""} />;
}
