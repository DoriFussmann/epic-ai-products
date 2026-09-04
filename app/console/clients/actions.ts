"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createClientRecord(name: string) {
  await assertAdmin();
  const trimmed = name.trim();
  if (!trimmed) return;
  const db = createAdminClient();
  await db.from("clients").insert({ name: trimmed });
  revalidatePath("/console/clients");
}

export async function setLive(clientId: string, isLive: boolean) {
  await assertAdmin();
  const db = createAdminClient();
  await db.from("clients").update({ is_live: isLive }).eq("id", clientId);
  revalidatePath("/console/clients");
  revalidatePath(`/console/clients/${clientId}`);
}

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function saveClientDetails(
  clientId: string,
  fields: {
    name: string;
    website: string;
    sitePixel: string;
    instantlyCampaignId: string;
  },
) {
  await assertAdmin();
  const name = fields.name.trim();
  if (!name) return;
  const db = createAdminClient();
  const { error } = await db
    .from("clients")
    .update({
      name,
      website: emptyToNull(fields.website),
      site_pixel: emptyToNull(fields.sitePixel),
      instantly_campaign_id: emptyToNull(fields.instantlyCampaignId),
    })
    .eq("id", clientId);
  if (error) throw new Error(error.message);
  revalidatePath("/console/clients");
  revalidatePath(`/console/clients/${clientId}`);
}

export async function deleteClient(clientId: string, formData: FormData) {
  await assertAdmin();
  const confirm = String(formData.get("confirm") ?? "").trim();
  if (!confirm) return;
  const db = createAdminClient();
  const { data } = await db.from("clients").select("id, name").eq("id", clientId).single();
  if (!data || data.name.trim() !== confirm) return;
  const { error } = await db.from("clients").delete().eq("id", clientId);
  if (error) throw new Error(error.message);
  revalidatePath("/console/clients");
  redirect("/console/clients");
}
