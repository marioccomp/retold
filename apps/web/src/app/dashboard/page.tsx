import { auth } from "@/src/auth";

export default async function DashboardPage() {
  const session = await auth(); // Busca a sessão no servidor

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Página do Dashboard</h1>
      <p>Se você está vendo isso, o middleware permitiu o acesso.</p>

      <h3>Dados da sua Sessão:</h3>
      <pre style={{ background: "#eee", padding: "1rem" }}>{JSON.stringify(session, null, 2)}</pre>
    </div>
  );
}
