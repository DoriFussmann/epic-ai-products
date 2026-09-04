import { notFound, redirect } from "next/navigation";
import { canAccessClient, homePath, requireSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveClientDetails } from "../actions";
import { BackLink } from "../../back-link";
import { LiveToggle } from "../../live-toggle";
import { DangerZone } from "../danger-zone";
import { Cols, Field, ReadValue, Section, StatusBadge, hrefFor, instantlyStatus } from "../client-fields";
import { getCampaignInfo } from "@/lib/instantly";

function SaveButton() {
  return (
    <button className="btn" type="submit" style={{ height: 36, padding: "0 16px" }}>
      Save
    </button>
  );
}

export default async function ClientZone({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  if (!canAccessClient(session, id)) redirect(homePath(session));
  const isAdmin = session.isAdmin;

  const db = createAdminClient();
  const { data: client } = await db
    .from("clients")
    .select("id, name, is_live, created_at, website, site_pixel, instantly_campaign_id")
    .eq("id", id)
    .single();
  if (!client) notFound();

  const campaignId = client.instantly_campaign_id ?? "";
  const campaignInfo = campaignId ? await getCampaignInfo(campaignId) : null;
  const campaignStatus = instantlyStatus(campaignId, campaignInfo, Boolean(process.env.INSTANTLY_API_KEY));
  const createdLabel = new Date(client.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  async function onSaveDetails(formData: FormData) {
    "use server";
    await saveClientDetails(id, {
      name: String(formData.get("name") ?? ""),
      website: String(formData.get("website") ?? ""),
      sitePixel: String(formData.get("site_pixel") ?? ""),
      instantlyCampaignId: String(formData.get("instantly_campaign_id") ?? ""),
    });
  }

  return (
    <div>
      {isAdmin || session.clientIds.length > 1 ? (
        <BackLink href="/console/clients" label={isAdmin ? "Back to clients" : "Your clients"} />
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginTop: isAdmin || session.clientIds.length > 1 ? 16 : 0,
        }}
      >
        <h2 style={{ margin: 0 }}>{client.name}</h2>
        {isAdmin ? (
          <LiveToggle clientId={client.id} isLive={client.is_live} />
        ) : (
          <StatusBadge label={client.is_live ? "Live" : "Paused"} tone={client.is_live ? "ok" : "off"} />
        )}
      </div>

      <form action={isAdmin ? onSaveDetails : undefined}>
        <Section
          title="General"
          meta={<span style={{ color: "var(--ash)", fontSize: 13 }}>Created {createdLabel}</span>}
          action={isAdmin ? <SaveButton /> : undefined}
        >
          <Cols>
            <Field label="Company name">
              {isAdmin ? (
                <input className="input" name="name" defaultValue={client.name} required />
              ) : (
                <ReadValue>{client.name}</ReadValue>
              )}
            </Field>
            <Field label="Website">
              {isAdmin ? (
                <input className="input" name="website" defaultValue={client.website ?? ""} placeholder="https://" />
              ) : client.website ? (
                <ReadValue>
                  <a href={hrefFor(client.website)} target="_blank" rel="noreferrer">
                    {client.website}
                  </a>
                </ReadValue>
              ) : (
                <ReadValue empty>—</ReadValue>
              )}
            </Field>
            <Field label="Instantly campaign ID">
              {isAdmin ? (
                <input
                  className="input mono"
                  name="instantly_campaign_id"
                  defaultValue={campaignId}
                />
              ) : (
                <ReadValue empty={!campaignId}>{campaignId || "—"}</ReadValue>
              )}
            </Field>
            <Field label="Campaign name">
              <ReadValue empty={!campaignId || !campaignInfo}>
                {!campaignId ? "—" : campaignInfo?.name ?? "Not found in Instantly"}
              </ReadValue>
            </Field>
            <Field label="Campaign status">
              <StatusBadge label={campaignStatus.label} tone={campaignStatus.tone} />
            </Field>
            {isAdmin ? (
              <Field label="Site pixel">
                <input className="input mono" name="site_pixel" defaultValue={client.site_pixel ?? ""} />
              </Field>
            ) : null}
          </Cols>
        </Section>
      </form>

      {isAdmin ? <DangerZone clientId={client.id} clientName={client.name} /> : null}
    </div>
  );
}
