import { requireSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientRecord } from "./actions";

async function onCreate(formData: FormData) {
  "use server";
  await createClientRecord(String(formData.get("name") ?? ""));
}

export default async function ClientsPage() {
  const session = await requireSession();
  const isAdmin = session.isAdmin;

  const db = createAdminClient();
  const { data: clients } = isAdmin
    ? await db.from("clients").select("id, name, is_live").order("name")
    : await db.from("clients").select("id, name, is_live").in("id", session.clientIds).order("name");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        <div>
          <h2>{isAdmin ? "Clients" : "Your Clients"}</h2>
          <p style={{ color: "var(--ash)", marginTop: 8, maxWidth: 680 }}>
            {isAdmin
              ? "Company, campaign, pixel, and live status for each client."
              : "Open a client to see company details and connection status."}
          </p>
        </div>
        {isAdmin ? (
          <details>
            <summary
              className="btn btn-ghost"
              style={{ listStyle: "none", display: "inline-flex", alignItems: "center" }}
            >
              Add client
            </summary>
            <form action={onCreate} style={{ display: "flex", gap: 8, marginTop: 16, minWidth: 280 }}>
              <input className="input" name="name" placeholder="Company name" />
              <button className="btn" type="submit">
                Save
              </button>
            </form>
          </details>
        ) : null}
      </div>

      <div className="card" style={{ marginTop: 40, padding: "8px 0" }}>
        {(clients ?? []).length === 0 ? (
          <div style={{ padding: "24px 32px", color: "var(--ash)" }}>No clients yet.</div>
        ) : (
          (clients ?? []).map((c, i) => (
            <a
              key={c.id}
              href={`/console/clients/${c.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                padding: "16px 24px",
                borderTop: i === 0 ? "none" : "1px solid var(--smoke)",
                color: "var(--ink)",
                fontWeight: 400,
              }}
            >
              <span>{c.name}</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: c.is_live ? "var(--sage)" : "var(--ash)",
                  border: `1px solid ${c.is_live ? "var(--sage)" : "var(--smoke)"}`,
                  borderRadius: 6,
                  padding: "2px 8px",
                }}
              >
                {c.is_live ? "Live" : "Paused"}
              </span>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
