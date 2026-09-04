import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type UserRole = "superadmin" | "admin" | "client";

export type Access = {
  isAdmin: boolean;
  role: UserRole | null;
  clientIds: string[];
};

export type SessionAccess = Access & {
  user: { id: string; email?: string };
};

export function isOperator(role: string | null | undefined, isAdminFlag?: boolean) {
  return role === "admin" || role === "superadmin" || Boolean(isAdminFlag);
}

function asRole(value: unknown): UserRole | null {
  if (value === "superadmin" || value === "admin" || value === "client") return value;
  return null;
}

export function homePath(access: Access) {
  if (access.isAdmin) return "/console";
  if (access.clientIds.length > 0) return "/portal";
  return "/login";
}

export const getSessionAccess = cache(async (): Promise<SessionAccess | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const db = createAdminClient();
  let role: UserRole | null = null;
  let isAdmin = false;

  const withRole = await db.from("profiles").select("role, is_admin").eq("id", user.id).maybeSingle();
  if (withRole.error && /role|PGRST204|schema cache/i.test(withRole.error.message)) {
    const fallback = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    isAdmin = Boolean(fallback.data?.is_admin);
  } else {
    role = asRole(withRole.data?.role);
    isAdmin = isOperator(role, withRole.data?.is_admin);
  }

  const loadIds = async () => {
    const { data } = await db.from("client_members").select("client_id").eq("user_id", user.id);
    return (data ?? []).map((m) => m.client_id as string);
  };

  const clientIds = await loadIds();

  if (!isAdmin && clientIds.length === 0) {
    const counted = await db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .or("is_admin.eq.true,role.in.(admin,superadmin)");
    const adminCount = counted.error
      ? (await db.from("profiles").select("id", { count: "exact", head: true }).eq("is_admin", true)).count
      : counted.count;
    if (!adminCount) {
      const promoted = await db
        .from("profiles")
        .upsert({ id: user.id, role: "superadmin", is_admin: true }, { onConflict: "id" });
      if (promoted.error && /role|PGRST204|schema cache/i.test(promoted.error.message)) {
        await db.from("profiles").upsert({ id: user.id, is_admin: true }, { onConflict: "id" });
      }
      role = "superadmin";
      isAdmin = true;
    }
  }

  return { user: { id: user.id, email: user.email }, isAdmin, role, clientIds };
});

export async function requireSession() {
  const session = await getSessionAccess();
  if (!session) redirect("/login");
  if (!session.isAdmin && session.clientIds.length === 0) redirect("/login");
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (!session.isAdmin) redirect(homePath(session));
  return session;
}

export async function assertAdmin() {
  const session = await getSessionAccess();
  if (!session) throw new Error("Sign in required.");
  if (!session.isAdmin) throw new Error("Operators only.");
  return session;
}

export function canAccessClient(session: Access, clientId: string) {
  return session.isAdmin || session.clientIds.includes(clientId);
}
