import { requireAdmin } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { ConsoleNav } from "./console-nav";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

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
          <a
            href="/console"
            style={{ fontSize: 20, fontWeight: 300, color: "var(--ink)", letterSpacing: "-0.02em" }}
          >
            Epic AI Products
          </a>
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
        <aside style={{ width: 220, flexShrink: 0 }}>
          <ConsoleNav />
        </aside>
        <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
      </div>
    </div>
  );
}
