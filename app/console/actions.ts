"use server";
import { assertAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { parse } from "csv-parse/sync";
import { assignLeads, computeHI, type Person } from "@/lib/pipeline";

function toPeople(csv: string): Person[] {
  const rows = parse(csv, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true, trim: true }) as any[];
  return rows.map((r) => ({
    alUuid: r.UUID, firstName: r.FIRST_NAME, lastName: r.LAST_NAME,
    personalCity: r.PERSONAL_CITY, personalState: r.PERSONAL_STATE,
    companyName: r.COMPANY_NAME, jobTitle: r.JOB_TITLE, linkedinUrl: r.LINKEDIN_URL,
    personalVerifiedEmails: r.PERSONAL_VERIFIED_EMAILS, personalEmails: r.PERSONAL_EMAILS, businessEmail: r.BUSINESS_EMAIL,
  })).filter((p) => p.alUuid);
}

export async function runAssignment(formData: FormData) {
  await assertAdmin();
  const fsFile = formData.get("fs") as File | null;
  const ccFile = formData.get("cc") as File | null;
  if (!fsFile || !ccFile) return { ok: false as const, error: "Upload both files." };

  const fs = toPeople(await fsFile.text());
  const cc = toPeople(await ccFile.text());
  const db = createAdminClient();

  const { data: owned } = await db.from("leads").select("al_uuid");
  const alreadyOwned = new Set((owned ?? []).map((l) => l.al_uuid));

  const result = assignLeads({ fs, cc, territories: [], alreadyOwned });

  if (result.assignments.length) {
    const rows = result.assignments.map((a) => ({
      al_uuid: a.alUuid, owning_client_id: a.clientId,
      first_name: a.firstName, last_name: a.lastName, email: a.email,
      company_name: a.companyName, job_title: a.jobTitle,
      personal_city: a.personalCity, personal_state: a.personalState,
      linkedin_url: a.linkedinUrl, source_lists: a.sourceLists,
    }));
    await db.from("leads").upsert(rows, { onConflict: "al_uuid", ignoreDuplicates: true });
  }

  const perClientId: Record<string, number> = {};
  for (const a of result.assignments) perClientId[a.clientId] = (perClientId[a.clientId] ?? 0) + 1;
  const { data: clients } = await db.from("clients").select("id, name");
  const nameById = Object.fromEntries((clients ?? []).map((c) => [c.id, c.name]));
  const perClient = Object.entries(perClientId).map(([id, n]) => ({ name: nameById[id] ?? id, count: n }));

  const hi = computeHI(fs, cc).size;
  await db.from("pipeline_runs").upsert({
    run_date: new Date().toISOString().slice(0, 10), status: "completed",
    fs_count: fs.length, cc_count: cc.length, hi_count: hi,
    assigned_count: result.assignments.length, unassigned_count: result.unassigned.length,
    finished_at: new Date().toISOString(),
  }, { onConflict: "run_date" });

  return { ok: true as const, fsCount: fs.length, ccCount: cc.length, hi, assigned: result.assignments.length, holding: result.unassigned.length, perClient };
}
