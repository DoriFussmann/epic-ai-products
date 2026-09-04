const BASE = "https://api.instantly.ai/api/v2";
export type LeadPush = { email: string; first_name?: string; last_name?: string; company_name?: string };

function instantlyKey(): string | undefined {
  return process.env.INSTANTLY_API_KEY;
}

function instantlyHeaders() {
  return { Authorization: `Bearer ${instantlyKey()!}`, "Content-Type": "application/json" };
}

export async function addLeadToCampaign(campaignId: string, lead: LeadPush) {
  const res = await fetch(`${BASE}/leads`, {
    method: "POST",
    headers: instantlyHeaders(),
    body: JSON.stringify({
      campaign: campaignId,
      email: lead.email,
      first_name: lead.first_name,
      last_name: lead.last_name,
      company_name: lead.company_name,
      skip_if_in_workspace: true,
    }),
  });
  if (!res.ok) throw new Error(`Instantly ${res.status}: ${await res.text()}`);
  return res.json();
}

export type CampaignInfo = { name: string; status: string | null };

const INSTANTLY_STATUS: Record<number, string> = {
  [-99]: "suspended",
  [-2]: "unhealthy",
  [-1]: "unhealthy",
  0: "draft",
  1: "active",
  2: "paused",
  3: "completed",
  4: "active",
};

function campaignStatus(raw: unknown): string | null {
  if (typeof raw === "string" && raw.trim()) return raw.trim().toLowerCase();
  if (typeof raw === "number" && INSTANTLY_STATUS[raw]) return INSTANTLY_STATUS[raw];
  return null;
}

export async function getCampaignInfo(campaignId: string): Promise<CampaignInfo | null> {
  const id = campaignId.trim();
  const key = instantlyKey();
  if (!id || !key) return null;
  try {
    const res = await fetch(`${BASE}/campaigns/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const name = typeof data?.name === "string" && data.name.trim() ? data.name.trim() : null;
    if (!name) return null;
    return { name, status: campaignStatus(data?.status) };
  } catch {
    return null;
  }
}

export async function getCampaignName(campaignId: string): Promise<string | null> {
  const info = await getCampaignInfo(campaignId);
  return info?.name ?? null;
}

export type DailyMetric = { date: string; sent: number; opens: number; clicks: number; replies: number; bounces: number };

function asCount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function getCampaignDailyAnalytics(
  campaignId: string,
  startDate: string,
  endDate: string,
): Promise<DailyMetric[]> {
  const id = campaignId.trim();
  const key = instantlyKey();
  if (!id || !key) return [];
  try {
    const params = new URLSearchParams({
      campaign_id: id,
      start_date: startDate,
      end_date: endDate,
    });
    const res = await fetch(`${BASE}/campaigns/analytics/daily?${params}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    const rows = Array.isArray(data) ? data : [];
    return rows
      .map((row: { date?: unknown; sent?: unknown; unique_opened?: unknown; unique_clicks?: unknown; unique_replies?: unknown; bounced?: unknown; bounced_count?: unknown }) => ({
        date: typeof row?.date === "string" ? row.date : "",
        sent: asCount(row?.sent),
        opens: asCount(row?.unique_opened),
        clicks: asCount(row?.unique_clicks),
        replies: asCount(row?.unique_replies),
        bounces: asCount(row.bounced ?? row.bounced_count ?? 0),
      }))
      .filter((row: DailyMetric) => row.date);
  } catch {
    return [];
  }
}

export type CampaignOverview = { sent: number; bounces: number };

export async function getCampaignOverview(
  campaignId: string,
  startDate: string,
  endDate: string,
): Promise<CampaignOverview | null> {
  const id = campaignId.trim();
  const key = instantlyKey();
  if (!id || !key) return null;
  try {
    const params = new URLSearchParams({
      campaign_id: id,
      start_date: startDate,
      end_date: endDate,
    });
    const res = await fetch(`${BASE}/campaigns/analytics/overview?${params}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const obj = (Array.isArray(data) ? data[0] : data) as
      | { bounced_count?: unknown; bounced?: unknown; emails_sent_count?: unknown; sent?: unknown }
      | undefined;
    if (!obj) return null;
    return {
      sent: asCount(obj.emails_sent_count ?? obj.sent ?? 0),
      bounces: asCount(obj.bounced_count ?? obj.bounced ?? 0),
    };
  } catch {
    return null;
  }
}
