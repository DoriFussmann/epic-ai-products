import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { signOut } from "@/app/login/actions";
import { PortalSidebar } from "./portal-nav";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  if (session.isAdmin) redirect("/console");

  const clientId = session.clientIds[0];
  if (!clientId) redirect("/login");

  const db = createAdminClient();
  const { data: client } = await db
    .from("clients")
    .select("id, name")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) redirect("/login");
  const displayName = client.name;

  return (
    <div>
      <header style={{ height: 64, borderBottom: "1px solid var(--smoke)" }}>
        <div
          style={{
            maxWidth: 1160,
            height: "100%",
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 300, color: "var(--ink)", letterSpacing: "-0.02em" }}>
            Epic AI Products
          </div>
          <form action={signOut}>
            <button type="submit" className="btn btn-ghost">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div
        style={{
          maxWidth: 1160,
          margin: "0 auto",
          padding: "64px 24px",
          display: "flex",
          alignItems: "flex-start",
          gap: 40,
        }}
      >
        <PortalSidebar displayName={displayName} />
        <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
      </div>
    </div>
  );
}
