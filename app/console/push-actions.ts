"use server";
import { assertAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addLeadToCampaign } from "@/lib/instantly";

export async function pushToInstantly() {
  await assertAdmin();
  const db = createAdminClient();

  const { data: clientRows } = await db.from("clients").select("id, instantly_campaign_id");
  const campaignByClient = new Map<string, string>();
  for (const row of clientRows ?? []) {
    const id = row.instantly_campaign_id?.trim();
    if (id) campaignByClient.set(row.id, id);
  }

  const { data: leads } = await db
    .from("leads")
    .select("id, owning_client_id, email, first_name, last_name, company_name")
    .is("pushed_at", null)
    .not("email", "is", null);

  let pushed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const lead of leads ?? []) {
    const campaignId = campaignByClient.get(lead.owning_client_id);
    if (!campaignId) {
      skipped++;
      continue;
    }
    try {
      await addLeadToCampaign(campaignId, {
        email: lead.email,
        first_name: lead.first_name ?? undefined,
        last_name: lead.last_name ?? undefined,
        company_name: lead.company_name ?? undefined,
      });
      pushed++;
      await db.from("leads").update({ pushed_at: new Date().toISOString() }).eq("id", lead.id);
    } catch (e: unknown) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  return { ok: true as const, pushed, skipped, errorCount: errors.length, sampleErrors: errors.slice(0, 3) };
}
