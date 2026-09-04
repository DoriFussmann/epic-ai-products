import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCampaignInfo } from "@/lib/instantly";
import { Cols, Field, ReadValue, Section, StatusBadge, hrefFor, instantlyStatus } from "@/app/console/clients/client-fields";

export default async function PortalAccount() {
  const session = await requireSession();
  const id = session.clientIds[0];
  if (!id) redirect("/login");

  const db = createAdminClient();
  const { data: client } = await db
    .from("clients")
    .select("id, name, is_live, created_at, website, site_pixel, instantly_campaign_id")
    .eq("id", id)
    .single();
  if (!client) redirect("/login");

  const campaignId = client.instantly_campaign_id ?? "";
  const campaignInfo = campaignId ? await getCampaignInfo(campaignId) : null;
  const campaignStatus = instantlyStatus(campaignId, campaignInfo, Boolean(process.env.INSTANTLY_API_KEY));
  const createdLabel = new Date(client.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Section
      title="General"
      meta={<span style={{ color: "var(--ash)", fontSize: 13 }}>Created {createdLabel}</span>}
    >
      <Cols>
        <Field label="Company name">
          <ReadValue>{client.name}</ReadValue>
        </Field>
        <Field label="Website">
          {client.website ? (
            <ReadValue>
              <a href={hrefFor(client.website)} target="_blank" rel="noreferrer">
                {client.website}
              </a>
            </ReadValue>
          ) : (
            <ReadValue empty>—</ReadValue>
          )}
        </Field>
        <Field label="Status">
          <StatusBadge label={client.is_live ? "Live" : "Paused"} tone={client.is_live ? "ok" : "off"} />
        </Field>
        <Field label="Instantly campaign">
          <ReadValue empty={!campaignId || !campaignInfo}>
            {!campaignId ? "—" : campaignInfo?.name ?? campaignId}
          </ReadValue>
        </Field>
        <Field label="Campaign status">
          <StatusBadge label={campaignStatus.label} tone={campaignStatus.tone} />
        </Field>
      </Cols>
    </Section>
  );
}
