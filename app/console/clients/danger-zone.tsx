"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteClient } from "./actions";

function DeleteButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-danger" disabled={!enabled || pending}>
      {pending ? "Deleting…" : "Delete client"}
    </button>
  );
}

export function DangerZone({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [value, setValue] = useState("");
  const matches = value.trim() === clientName.trim();

  return (
    <section
      className="card"
      style={{ padding: "36px 32px", marginTop: 24, borderColor: "var(--cinnabar)" }}
    >
      <h3 style={{ marginBottom: 8, color: "var(--cinnabar)" }}>Danger Zone</h3>
      <p style={{ color: "var(--ash)", marginTop: 0, marginBottom: 24, maxWidth: 680 }}>
        Permanently delete this client and everything attached to it: members, assigned leads,
        metrics, and alerts. Assigned people can be given to another client later. This cannot
        be undone.
      </p>
      <form action={deleteClient.bind(null, clientId)}>
        <div className="label" style={{ marginBottom: 8 }}>
          Type “{clientName}” to confirm
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            className="input"
            name="confirm"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={clientName}
            autoComplete="off"
            style={{ maxWidth: 320 }}
          />
          <DeleteButton enabled={matches} />
        </div>
      </form>
    </section>
  );
}
