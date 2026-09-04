// Epic AI Products — nightly pipeline core logic.
// PURE functions only: no DB, no HTTP. That is deliberate — this is the
// correctness-critical part, so it must be unit-testable with zero infra.
// Wire the I/O (AudienceLab pull, Supabase persist, Instantly push) around it.

export type ListType = "FS" | "CC" | "HI";

/** Minimal person parsed from an AudienceLab CSV row. */
export interface Person {
  alUuid: string;               // UUID column — the identity key
  firstName?: string;
  lastName?: string;
  personalCity?: string;        // may be "" (7% have no state/city)
  personalState?: string;       // 2-letter, or ""
  companyName?: string;
  jobTitle?: string;
  linkedinUrl?: string;
  personalVerifiedEmails?: string; // "a@x.com, b@x.com"
  personalEmails?: string;
  businessEmail?: string;
}

export interface TerritoryRule {
  clientId: string;
  state: string;         // will be normalized
  city?: string | null;  // null/undefined = whole state
}

export interface Assignment {
  alUuid: string;
  clientId: string;
  sourceLists: ListType[];
  email: string | null;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  jobTitle?: string;
  personalCity?: string;
  personalState?: string;
  linkedinUrl?: string;
}

const norm = (s?: string | null): string => (s ?? "").trim().toUpperCase();

/** First usable email: verified personal -> personal -> business. */
export function canonicalEmail(p: Person): string | null {
  const pick = (v?: string): string | null => {
    if (!v) return null;
    const first = v.split(/[,\s]+/).map((e) => e.trim()).find((e) => e.includes("@"));
    return first ?? null;
  };
  return pick(p.personalVerifiedEmails) ?? pick(p.personalEmails) ?? pick(p.businessEmail);
}

/** HI = people whose UUID appears in BOTH the FS and CC exports. */
export function computeHI(fs: Person[], cc: Person[]): Set<string> {
  const fsIds = new Set(fs.map((p) => p.alUuid));
  const hi = new Set<string>();
  for (const p of cc) if (fsIds.has(p.alUuid)) hi.add(p.alUuid);
  return hi;
}

/** Which lists a person belongs to, given the two source sets and the HI set. */
export function tagLists(alUuid: string, inFS: boolean, inCC: boolean, hi: Set<string>): ListType[] {
  const tags: ListType[] = [];
  if (inFS) tags.push("FS");
  if (inCC) tags.push("CC");
  if (hi.has(alUuid)) tags.push("HI");
  return tags;
}

/**
 * Clients whose territory matches this person.
 * A rule matches when state matches AND (rule has no city OR city matches).
 * No state on the person -> matches nobody (goes to the holding bucket).
 */
export function matchingClients(p: Person, rules: TerritoryRule[]): string[] {
  const state = norm(p.personalState);
  if (!state) return [];
  const city = norm(p.personalCity);
  const ids = new Set<string>();
  for (const r of rules) {
    if (norm(r.state) !== state) continue;
    const ruleCity = r.city == null ? null : norm(r.city);
    if (ruleCity === null || ruleCity === city) ids.add(r.clientId);
  }
  return [...ids].sort(); // deterministic order for stable round-robin
}

/** Mutable rotation state so round-robin can (optionally) persist across runs. */
export type RotationState = Record<string, number>;

export interface AssignResult {
  assignments: Assignment[];
  unassigned: string[];       // al_uuids with no matching territory (holding bucket)
  rotation: RotationState;    // updated counters, if you choose to persist them
}

/**
 * Full assignment pass. Pure: give it everything, get everything back.
 * - alreadyOwned: al_uuids already owned by ANY client (from the DB). Owned once, ever.
 * - rotation: prior counters (pass {} for no cross-night memory — PRD allows either).
 */
export function assignLeads(args: {
  fs: Person[];
  cc: Person[];
  territories: TerritoryRule[];
  alreadyOwned: Set<string>;
  rotation?: RotationState;
}): AssignResult {
  const { fs, cc, territories } = args;
  const rotation: RotationState = { ...(args.rotation ?? {}) };
  const hi = computeHI(fs, cc);

  // Merge FS+CC into one person map keyed by uuid, remembering membership.
  const byUuid = new Map<string, { person: Person; inFS: boolean; inCC: boolean }>();
  for (const p of fs) byUuid.set(p.alUuid, { person: p, inFS: true, inCC: false });
  for (const p of cc) {
    const e = byUuid.get(p.alUuid);
    if (e) { e.inCC = true; e.person = e.person ?? p; }
    else byUuid.set(p.alUuid, { person: p, inFS: false, inCC: true });
  }

  const assignments: Assignment[] = [];
  const unassigned: string[] = [];
  const seenThisRun = new Set<string>();

  for (const [alUuid, { person, inFS, inCC }] of byUuid) {
    if (args.alreadyOwned.has(alUuid) || seenThisRun.has(alUuid)) continue; // dedup
    const clients = matchingClients(person, territories);
    if (clients.length === 0) { unassigned.push(alUuid); continue; }

    // round-robin within the exact overlap group
    const groupKey = clients.join("|");
    const idx = rotation[groupKey] ?? 0;
    const clientId = clients[idx % clients.length];
    rotation[groupKey] = idx + 1;

    seenThisRun.add(alUuid);
    assignments.push({
      alUuid,
      clientId,
      sourceLists: tagLists(alUuid, inFS, inCC, hi),
      email: canonicalEmail(person),
      firstName: person.firstName,
      lastName: person.lastName,
      companyName: person.companyName,
      jobTitle: person.jobTitle,
      personalCity: person.personalCity,
      personalState: person.personalState,
      linkedinUrl: person.linkedinUrl,
    });
  }

  return { assignments, unassigned, rotation };
}
