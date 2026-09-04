import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCampaignInfo, getCampaignOverview } from "@/lib/instantly";
import { Section } from "@/app/console/clients/client-fields";

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseRange(raw: string | string[] | undefined): Range {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "7" || value === "90") return Number(value) as Range;
  return 30;
}

function rate(part: number, whole: number): number | null {
  if (whole === 0) return null;
  return part / whole;
}

function formatRate(value: number | null): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

function pctOfSent(part: number, sent: number): number {
  if (sent === 0) return 0;
  return Math.round((part / sent) * 100);
}

export default async function PortalAnalytics({
  searchParams,
}: {
  searchParams: Promise<{ range?: string | string[] }>;
}) {
  const session = await requireSession();
  const clientId = session.clientIds[0];
  if (!clientId) redirect("/login");

  const range = parseRange((await searchParams).range);
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - range);
  const startDate = utcYmd(start);
  const endDate = utcYmd(end);

  const db = await createClient();
  const [{ data }, { data: clientRow }] = await Promise.all([
    db
      .from("metric_snapshots")
      .select("snapshot_date, sent, opens, replies, bounces")
      .eq("channel", "email")
      .gte("snapshot_date", startDate)
      .lte("snapshot_date", endDate)
      .order("snapshot_date", { ascending: true }),
    db.from("clients").select("instantly_campaign_id").eq("id", clientId).maybeSingle(),
  ]);

  const campaignId = clientRow?.instantly_campaign_id?.trim() ?? "";
  const rows = data ?? [];
  let sent = 0;
  let opens = 0;
  let replies = 0;
  let storedBounces = 0;

  for (const row of rows) {
    sent += row.sent ?? 0;
    opens += row.opens ?? 0;
    replies += row.replies ?? 0;
    storedBounces += row.bounces ?? 0;
  }

  const [info, overview] = campaignId
    ? await Promise.all([
        getCampaignInfo(campaignId),
        getCampaignOverview(campaignId, startDate, endDate),
      ])
    : [null, null];
  const campaigns = campaignId
    ? [
        {
          list: campaignId,
          name: info?.name || "Email campaign",
          info,
          sent,
          opens,
          replies,
          bounces: sent > 0 ? (overview?.bounces ?? storedBounces) : 0,
        },
      ]
    : [];
  const totalBounces = campaigns.reduce((sum, campaign) => sum + (campaign.sent > 0 ? campaign.bounces : 0), 0);
  const empty = sent === 0;
  const openRate = rate(opens, sent);
  const replyRate = rate(replies, sent);
  const bounceRate = rate(totalBounces, sent);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <h2 style={{ margin: 0 }}>Email Analytics</h2>
        <nav className="portal-range" style={{ display: "flex", gap: 4 }} aria-label="Date range">
          {RANGES.map((n) => {
            const active = n === range;
            return (
              <Link
                key={n}
                href={`/portal/analytics?range=${n}`}
                style={{
                  padding: "6px 10px",
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  color: active ? "var(--ink)" : "var(--ash)",
                  borderBottom: active ? "2px solid var(--brass)" : "2px solid transparent",
                }}
              >
                {n} days
              </Link>
            );
          })}
        </nav>
      </div>

      {empty ? (
        <div className="card" style={{ padding: "36px 32px" }}>
          <p style={{ color: "var(--ash)", margin: 0, maxWidth: 680 }}>
            No email analytics yet. Data appears here once your campaigns start sending.
          </p>
        </div>
      ) : (
        <>
          <div className="label" style={{ marginBottom: 8 }}>
            Email performance
          </div>
          <div className="card" style={{ borderRadius: 12, display: "flex", flexWrap: "wrap" }}>
            <StripCell label="Sent" last={false}>
              <span className="mono" style={{ fontSize: 26, fontWeight: 300, color: "var(--ink)", lineHeight: 1.15 }}>
                {formatCount(sent)}
              </span>
            </StripCell>
            <StripCell label="Opens" last={false}>
              <span className="mono" style={{ fontSize: 26, fontWeight: 300, color: "var(--ink)", lineHeight: 1.15 }}>
                {formatCount(opens)}
              </span>
              <span style={{ fontSize: 13, color: "var(--sage)", marginLeft: 8 }}>{formatRate(openRate)}</span>
            </StripCell>
            <StripCell label="Replies" last={false}>
              <span className="mono" style={{ fontSize: 26, fontWeight: 300, color: "var(--ink)", lineHeight: 1.15 }}>
                {formatCount(replies)}
              </span>
              <span style={{ fontSize: 13, color: "var(--ash)", marginLeft: 8 }}>{formatRate(replyRate)}</span>
            </StripCell>
            <StripCell label="Bounces" last={false}>
              <span className="mono" style={{ fontSize: 26, fontWeight: 300, color: "var(--ink)", lineHeight: 1.15 }}>
                {formatCount(totalBounces)}
              </span>
            </StripCell>
            <StripCell label="Bounce rate" last>
              <span
                className="mono"
                style={{
                  fontSize: 26,
                  fontWeight: 300,
                  color: bounceRate === null ? "var(--ink)" : "var(--amber)",
                  lineHeight: 1.15,
                }}
              >
                {formatRate(bounceRate)}
              </span>
            </StripCell>
          </div>

          <div className="card" style={{ padding: "22px 24px", marginTop: 16 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ash)",
                marginBottom: 16,
              }}
            >
              Funnel
            </div>
            <Funnel
              sent={sent}
              opens={opens}
              replies={replies}
              openRate={openRate}
              replyRate={replyRate}
            />
          </div>

          <div className="label" style={{ marginTop: 24, marginBottom: 8 }}>
            By campaign
          </div>
          <div className="card" style={{ overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle("left")}>Campaign</th>
                  <th style={thStyle("right")}>Sent</th>
                  <th style={thStyle("right")}>Opens</th>
                  <th style={thStyle("right")}>Replies</th>
                  <th style={thStyle("right")}>Bounces</th>
                  <th style={thStyle("right")}>Bounce rate</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign, i) => {
                  const openPct = formatRate(rate(campaign.opens, campaign.sent));
                  const replyPct = formatRate(rate(campaign.replies, campaign.sent));
                  const bouncePct = formatRate(rate(campaign.bounces, campaign.sent));
                  const last = i === campaigns.length - 1;
                  return (
                    <tr key={campaign.list}>
                      <td style={tdStyle("left", last)}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              color: "var(--ink)",
                            }}
                          >
                            {campaign.name}
                          </span>
                          <CampaignChip info={campaign.info} />
                        </span>
                      </td>
                      <td style={tdStyle("right", last)}>
                        <Count value={campaign.sent} />
                      </td>
                      <td style={tdStyle("right", last)}>
                        <Count value={campaign.opens} />
                        <span style={{ color: "var(--ash)", fontSize: 13, marginLeft: 6 }}>{openPct}</span>
                      </td>
                      <td style={tdStyle("right", last)}>
                        <Count value={campaign.replies} />
                        <span style={{ color: "var(--ash)", fontSize: 13, marginLeft: 6 }}>{replyPct}</span>
                      </td>
                      <td style={tdStyle("right", last)}>
                        <Count value={campaign.bounces} />
                      </td>
                      <td style={tdStyle("right", last)}>
                        <span
                          className="mono"
                          style={{ color: campaign.sent === 0 ? "var(--ash)" : "var(--ink)" }}
                        >
                          {bouncePct}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ComingSoon title="LinkedIn Activity">
        LinkedIn analytics are coming soon. This will show connection and message activity once LinkedIn outreach is
        connected.
      </ComingSoon>
      <ComingSoon title="Pixel Events">
        Website visitor identification is coming soon. This will show identified visitors and events once the tracking
        pixel is connected.
      </ComingSoon>
    </div>
  );
}

function StripCell({ label, last, children }: { label: string; last: boolean; children: ReactNode }) {
  return (
    <div
      style={{
        flex: "1 1 140px",
        padding: "18px 20px",
        borderRight: last ? undefined : "1px solid var(--smoke)",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ash)",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", marginTop: 6, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function Funnel({
  sent,
  opens,
  replies,
  openRate,
  replyRate,
}: {
  sent: number;
  opens: number;
  replies: number;
  openRate: number | null;
  replyRate: number | null;
}) {
  const openWidth = pctOfSent(opens, sent);
  const replyWidth = pctOfSent(replies, sent);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <FunnelRow
        name="Sent"
        value={`${formatCount(sent)}`}
        width={sent === 0 ? 0 : 100}
        color="var(--ink)"
      />
      <FunnelRow
        name="Opened"
        value={`${formatCount(opens)} · ${formatRate(openRate)}`}
        width={openWidth}
        color="var(--brass)"
      />
      <FunnelRow
        name="Replied"
        value={`${formatCount(replies)} · ${formatRate(replyRate)}`}
        width={replyWidth}
        color="var(--sage)"
        minVisible={replies > 0}
      />
    </div>
  );
}

function FunnelRow({
  name,
  value,
  width,
  color,
  minVisible,
}: {
  name: string;
  value: string;
  width: number;
  color: string;
  minVisible?: boolean;
}) {
  const showBar = width > 0 || minVisible;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "var(--charcoal)" }}>{name}</span>
        <span className="mono" style={{ fontSize: 13, color: "var(--ink)" }}>
          {value}
        </span>
      </div>
      <div style={{ height: 10 }}>
        {showBar ? (
          <div
            style={{
              height: 10,
              width: `${width}%`,
              minWidth: minVisible ? 3 : undefined,
              background: color,
              borderRadius: 2,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function CampaignChip({ info }: { info: { status: string | null } | null }) {
  const status = info?.status ?? null;
  let label = "NO DATA";
  let color = "var(--ash)";
  let border = "var(--smoke)";
  if (info) {
    if (status === "active") {
      label = "ACTIVE";
      color = "var(--sage)";
      border = "var(--sage)";
    } else if (status === "paused") {
      label = "PAUSED";
      color = "var(--amber)";
      border = "var(--amber)";
    } else if (status) {
      label = status.replace(/_/g, " ");
    } else {
      label = "READY";
    }
  }
  return (
    <span
      style={{
        flexShrink: 0,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color,
        border: `1px solid ${border}`,
        borderRadius: 4,
        padding: "1px 7px",
        lineHeight: 1.4,
      }}
    >
      {label}
    </span>
  );
}

function Count({ value }: { value: number }) {
  return (
    <span className="mono" style={{ color: value === 0 ? "var(--ash)" : "var(--ink)" }}>
      {formatCount(value)}
    </span>
  );
}

function thStyle(align: "left" | "right"): CSSProperties {
  return {
    textAlign: align,
    padding: "12px 16px",
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--ash)",
    borderBottom: "1px solid var(--smoke)",
  };
}

function tdStyle(align: "left" | "right", last = false): CSSProperties {
  return {
    textAlign: align,
    padding: "14px 16px",
    borderBottom: last ? undefined : "1px solid var(--smoke)",
    fontSize: 14,
  };
}

function ComingSoon({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Section title={title}>
      <p
        style={{
          color: "var(--ash)",
          textAlign: "center",
          margin: 0,
          padding: "24px 0",
          maxWidth: 520,
          marginLeft: "auto",
          marginRight: "auto",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        {children}
      </p>
    </Section>
  );
}
