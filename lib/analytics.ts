import { createAdminClient } from "@/lib/supabase/admin";
import { getCampaignDailyAnalytics } from "@/lib/instantly";

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function pullEmailAnalytics(opts?: { days?: number }): Promise<{
  campaignsPulled: number;
  rowsWritten: number;
  errors: string[];
}> {
  const days = opts?.days ?? 90;
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);
  const startDate = utcYmd(start);
  const endDate = utcYmd(end);

  const db = createAdminClient();
  const { data: clients } = await db.from("clients").select("id, instantly_campaign_id");

  const records: {
    client_id: string;
    channel: "email";
    snapshot_date: string;
    sent: number;
    opens: number;
    clicks: number;
    replies: number;
    delivered: number;
    bounces: number;
  }[] = [];
  const errors: string[] = [];
  let campaignsPulled = 0;

  for (const client of clients ?? []) {
    const campaignId = client.instantly_campaign_id?.trim();
    if (!campaignId) continue;
    campaignsPulled += 1;
    const daily = await getCampaignDailyAnalytics(campaignId, startDate, endDate);
    for (const row of daily) {
      records.push({
        client_id: client.id,
        channel: "email",
        snapshot_date: row.date,
        sent: row.sent,
        opens: row.opens,
        clicks: row.clicks,
        replies: row.replies,
        delivered: 0,
        bounces: row.bounces,
      });
    }
  }

  if (records.length > 0) {
    const { error } = await db.from("metric_snapshots").upsert(records, {
      onConflict: "client_id,channel,snapshot_date",
    });
    if (error) errors.push(error.message);
  }

  return { campaignsPulled, rowsWritten: records.length, errors };
}
