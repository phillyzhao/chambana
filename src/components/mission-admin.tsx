"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  LockKeyhole,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  approveMission,
  archiveMission,
  importMissionDrafts,
  loginMissionAdmin,
  logoutMissionAdmin,
  saveMission,
} from "@/app/mission-admin/actions";
import {
  chicagoDateTimeInput,
  MISSION_CATEGORIES,
  missionStatus,
  type MissionLibraryRecord,
} from "@/lib/mission-library";
import styles from "./mission-admin.module.css";
import { MissionTitleList, type RenamedMission } from "./mission-title-list";

type Feedback = { error?: string; success?: string; id?: string };
type MissionStatus =
  "Draft" | "Approved" | "Scheduled" | "Expired" | "Archived";

function statusOf(mission: MissionLibraryRecord, now: string): MissionStatus {
  return missionStatus(mission, Date.parse(now));
}

function ActionFeedback({ state }: { state: Feedback }) {
  return (
    <div className={styles.feedback} aria-live="polite" aria-atomic="true">
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className={styles.success}>
          <Check size={15} aria-hidden="true" />
          {state.success}
        </p>
      )}
    </div>
  );
}

function Brand() {
  return (
    <a className={styles.brand} href="/" aria-label="Chambana home">
      chambana.
    </a>
  );
}

export function MissionAdminLogin({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(loginMissionAdmin, {});
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Brand />
        <span className={styles.privateLabel}>
          <LockKeyhole size={12} aria-hidden="true" /> Owner access
        </span>
      </header>
      <main className={styles.login}>
        <p className={styles.eyebrow}>Urbana · Champaign</p>
        <h1>
          A little adventure
          <br />
          starts here.
        </h1>
        <p className={styles.lede}>
          Create, review, and schedule missions for your community.
        </p>
        {configured ? (
          <form action={action} className={styles.loginForm}>
            <label htmlFor="mission-admin-secret">Owner access key</label>
            <input
              id="mission-admin-secret"
              name="secret"
              type="password"
              autoComplete="current-password"
              minLength={32}
              required
              aria-describedby="owner-key-help"
            />
            <p id="owner-key-help" className={styles.hint}>
              Use your private admin key. The preview code does not grant
              editing access.
            </p>
            <button className={styles.primaryButton} disabled={pending}>
              {pending ? "Opening library…" : "Open mission library"}
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
            <ActionFeedback state={state} />
          </form>
        ) : (
          <div className={styles.setupNotice} role="status">
            <strong>Owner access needs to be configured.</strong>
            <p>
              Set the private MISSION_ADMIN_SECRET on this server before opening
              the library.
            </p>
          </div>
        )}
        <a className={styles.backLink} href="/design-preview?view=desktop">
          <ArrowLeft size={14} aria-hidden="true" /> Back to Chambana
        </a>
      </main>
    </div>
  );
}

export function MissionAdmin({
  missions: initialMissions,
  error,
  deliveryEnabled,
  now,
}: {
  missions: MissionLibraryRecord[];
  error?: string;
  deliveryEnabled: boolean;
  now: string;
}) {
  const [renamed, setRenamed] = useState<Record<string, RenamedMission>>({});
  // Use returned revisions immediately, without replacing newer server data.
  const missions = initialMissions.map((mission) => {
    const patch = renamed[mission.id];
    return patch && patch.revision > mission.revision
      ? { ...mission, ...patch }
      : mission;
  });
  const [renaming, setRenaming] = useState<Record<string, boolean>>({});
  const [editorDirty, setEditorDirty] = useState(false);
  const handleRenamed = useCallback((mission: RenamedMission) => {
    setRenamed((current) => ({ ...current, [mission.id]: mission }));
  }, []);
  const handleRenamePending = useCallback((id: string, pending: boolean) => {
    setRenaming((current) => ({ ...current, [id]: pending }));
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [updateNotice, setUpdateNotice] = useState("");
  const lastSelectedRevision = useRef<{ id: string; revision: number } | null>(
    null,
  );
  const handleSaved = useCallback((id: string) => {
    setEditorDirty(false);
    setSelectedId(id);
    setUpdateNotice(
      "Draft saved. This version needs your approval before it can reach the MVP.",
    );
  }, []);
  const clearUpdateNotice = useCallback(() => {
    setUpdateNotice("");
    setEditorDirty(true);
  }, []);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [status, setStatus] = useState("All states");
  const [importState, importAction, importPending] = useActionState(
    importMissionDrafts,
    {},
  );
  const editorRef = useRef<HTMLDialogElement>(null);
  const editorOpener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const dialog = editorRef.current;
    if (!editorOpen) {
      if (dialog?.open) dialog.close();
      return;
    }
    if (!dialog?.open) dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      dialog?.close();
    };
  }, [editorOpen]);
  const selected = missions.find((mission) => mission.id === selectedId);
  // The editor deliberately remounts after a saved revision. Keep confirmation
  // above that boundary so successful edits, approvals, and archives stay visible.
  useEffect(() => {
    const previous = lastSelectedRevision.current;
    if (
      selected &&
      previous?.id === selected.id &&
      previous.revision !== selected.revision
    ) {
      setEditorDirty(false);
      setUpdateNotice(
        selected.archived_at
          ? "Mission archived. It is excluded from both feeds."
          : selected.approved_at
            ? deliveryEnabled
              ? "Mission approved. It follows your saved schedule in both feeds."
              : "Mission approved. MVP delivery remains paused."
            : "Draft saved. This version needs your approval before it can reach the MVP.",
      );
    }
    lastSelectedRevision.current = selected
      ? { id: selected.id, revision: selected.revision }
      : null;
  }, [selected, deliveryEnabled]);
  const drafts = missions.filter(
    (mission) => statusOf(mission, now) === "Draft",
  ).length;
  const approved = missions.filter((mission) =>
    ["Approved", "Scheduled"].includes(statusOf(mission, now)),
  ).length;
  const filtered = missions.filter(
    (mission) =>
      (category === "All categories" || mission.category === category) &&
      (status === "All states" || statusOf(mission, now) === status) &&
      `${mission.title} ${mission.instructions} ${mission.location_name} ${mission.city}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );

  function selectMission(id: string | null) {
    if (id !== selectedId) {
      if (
        editorDirty &&
        !window.confirm("Discard your unsaved detail changes?")
      )
        return;
      setSelectedId(id);
      setEditorDirty(false);
      setUpdateNotice("");
    }
    editorOpener.current = document.activeElement as HTMLElement | null;
    setEditorOpen(true);
  }

  function closeEditor() {
    // Hiding the dialog keeps its form mounted, including unfinished edits.
    setEditorOpen(false);
    window.requestAnimationFrame(() => {
      editorOpener.current?.focus({ preventScroll: true });
    });
  }

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#mission-library-main">
        Skip to mission library
      </a>
      <header className={styles.header}>
        <Brand />
        <div className={styles.headerActions}>
          <span className={styles.privateLabel}>
            <LockKeyhole size={12} aria-hidden="true" /> Owner library
          </span>
          <form action={logoutMissionAdmin}>
            <button className={styles.textButton}>Sign out</button>
          </form>
        </div>
      </header>
      <main
        className={`${styles.main} ${styles.compactMain}`}
        id="mission-library-main"
      >
        <div className={styles.intro}>
          <div>
            <h1>Challenge library</h1>
          </div>
          <button
            className={styles.primaryButton}
            onClick={() => selectMission(null)}
            disabled={Boolean(error)}
          >
            <Plus size={17} aria-hidden="true" /> Add mission
          </button>
        </div>

        <div className={`${styles.deliveryNotice} ${styles.compactNotice}`}>
          <LockKeyhole size={19} aria-hidden="true" />
          <div>
            <strong>
              {deliveryEnabled
                ? "Only your approved missions can reach the MVP."
                : "MVP delivery is paused. All challenges stay private."}
            </strong>
            <p>
              {deliveryEnabled
                ? "Drafts stay private. Approved missions appear only during their scheduled window."
                : "Rename freely. Saving never publishes a challenge."}
            </p>
          </div>
        </div>

        {error && (
          <div className={styles.setupNotice} role="alert">
            <strong>The library could not connect.</strong>
            <p>{error}</p>
            <p>
              No mission changes have been saved. Reconnect the library, then
              reload this page.
            </p>
          </div>
        )}

        <div className={styles.libraryToolbar}>
          <div className={styles.counts}>
            <span>
              <strong>{missions.length}</strong> missions
            </span>
            <span>
              <strong>{drafts}</strong> drafts
            </span>
            <span>
              <strong>{approved}</strong> approved
            </span>
          </div>
          <form action={importAction}>
            <button
              className={styles.secondaryButton}
              disabled={importPending || Boolean(error)}
            >
              {importPending
                ? "Adding starter drafts…"
                : "Import 25 starter drafts"}
            </button>
          </form>
        </div>
        <ActionFeedback state={importState} />

        <div className={styles.workspace}>
          <aside className={styles.catalog} aria-label="Mission catalog">
            <div className={styles.catalogToolbar}>
              <div className={styles.searchField}>
                <Search size={17} aria-hidden="true" />
                <label className={styles.srOnly} htmlFor="mission-search">
                  Search missions or places
                </label>
                <input
                  id="mission-search"
                  type="search"
                  placeholder="Search missions or places"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div className={styles.filters}>
                <SlidersHorizontal size={15} aria-hidden="true" />
                <label className={styles.srOnly} htmlFor="category-filter">
                  Filter by category
                </label>
                <select
                  id="category-filter"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option>All categories</option>
                  {MISSION_CATEGORIES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <label className={styles.srOnly} htmlFor="status-filter">
                  Filter by state
                </label>
                <select
                  id="status-filter"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  {[
                    "All states",
                    "Draft",
                    "Approved",
                    "Scheduled",
                    "Expired",
                    "Archived",
                  ].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.catalogSummary}>
              <p className={styles.resultCount} aria-live="polite">
                {filtered.length}{" "}
                {filtered.length === 1 ? "mission" : "missions"}
              </p>
              <p id="rename-help" className={styles.renameHelp}>
                Enter / Tab: save & next. Click away: save. Esc: cancel.
              </p>
            </div>
            <div className={styles.missionList}>
              <div className={styles.listHeading} aria-hidden="true">
                <span>#</span>
                <span>Challenge name</span>
                <span>Category / place</span>
                <span>Status</span>
                <span />
              </div>
              <MissionTitleList
                missions={filtered}
                selectedId={editorOpen ? selectedId : null}
                protectedMissionId={editorDirty ? selected?.id : undefined}
                disabled={Boolean(error)}
                now={now}
                onSelect={selectMission}
                onRenamed={handleRenamed}
                onPending={handleRenamePending}
              />
              {filtered.length === 0 && (
                <div className={styles.empty}>
                  <h2>
                    {missions.length
                      ? "No matches yet."
                      : "Room for a good idea."}
                  </h2>
                  <p>
                    {missions.length
                      ? "Try a different place, category, or state."
                      : "Import the starter drafts or add your first mission. Nothing publishes automatically."}
                  </p>
                </div>
              )}
            </div>
          </aside>

          <dialog
            ref={editorRef}
            className={styles.detailsDialog}
            aria-labelledby="mission-dialog-title"
            onCancel={(event) => {
              event.preventDefault();
              closeEditor();
            }}
            onClose={(event) => {
              // Ignore close events queued by Strict Mode if already reopened.
              if (!event.currentTarget.open) setEditorOpen(false);
            }}
          >
            <div className={styles.dialogHeader}>
              <h2 id="mission-dialog-title">
                {selected ? "Challenge details" : "New challenge"}
              </h2>
              <button
                className={styles.dialogClose}
                type="button"
                aria-label="Close details"
                onClick={closeEditor}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.dialogBody}>
              <div className={styles.editor}>
                <ActionFeedback state={{ success: updateNotice }} />
                <MissionEditor
                  key={`${selected?.id ?? "new"}:${selected?.revision ?? 0}`}
                  mission={selected}
                  disabled={Boolean(
                    error || (selected && renaming[selected.id]),
                  )}
                  deliveryEnabled={deliveryEnabled}
                  now={now}
                  onSaved={handleSaved}
                  onEdit={clearUpdateNotice}
                />
              </div>
            </div>
          </dialog>
        </div>
        <footer className={styles.footer}>
          <a href="/design-preview?view=desktop">
            <ArrowLeft size={14} aria-hidden="true" /> Desktop preview
          </a>
          <a href="/design-preview">
            iPhone preview <ArrowUpRight size={14} aria-hidden="true" />
          </a>
          <span>All schedules use Urbana–Champaign time.</span>
        </footer>
      </main>
    </div>
  );
}

function MissionEditor({
  mission,
  disabled,
  deliveryEnabled,
  now,
  onSaved,
  onEdit,
}: {
  mission?: MissionLibraryRecord;
  disabled: boolean;
  deliveryEnabled: boolean;
  now: string;
  onSaved: (id: string) => void;
  onEdit: () => void;
}) {
  const [state, action, pending] = useActionState(saveMission, {});
  const [dirty, setDirty] = useState(false);
  // React resets uncontrolled fields after a fulfilled form action, even when
  // that action returns a validation error. Keep every editable value in state
  // so a failed save never discards the owner's work.
  const [draft, setDraft] = useState(() => ({
    title: mission?.title ?? "",
    category: mission?.category ?? MISSION_CATEGORIES[0],
    instructions: mission?.instructions ?? "",
    location_name: mission?.location_name ?? "",
    city: mission?.city ?? "Urbana",
    duration_minutes: String(mission?.duration_minutes ?? 15),
    location_address: mission?.location_address ?? "",
    cost_label: mission?.cost_label ?? "Free",
    nuts: String(mission?.nuts ?? 25),
    min_people: String(mission?.min_people ?? 1),
    max_people: String(mission?.max_people ?? 4),
    proof_prompt: mission?.proof_prompt ?? "",
    source_url: mission?.source_url ?? "",
    source_checked_on:
      mission?.source_checked_on ?? chicagoDateTimeInput(now).slice(0, 10),
    starts_local: chicagoDateTimeInput(mission?.starts_at ?? null),
    ends_local: chicagoDateTimeInput(mission?.ends_at ?? null),
  }));
  function updateDraft(
    event: SyntheticEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = event.currentTarget;
    setDraft((current) => ({ ...current, [name]: value }));
    setDirty(true);
    onEdit();
  }
  const archived = Boolean(mission?.archived_at);

  useEffect(() => {
    if (state.success && state.id) {
      setDirty(false);
      onSaved(state.id);
    }
  }, [state.success, state.id, onSaved]);

  return (
    <>
      <div className={styles.editorHeading}>
        <div>
          <p className={styles.eyebrow}>
            {mission ? "Shape the experience" : "Start something good"}
          </p>
          <h2>{mission ? "Edit mission" : "New mission"}</h2>
        </div>
        <span className={styles.badge}>
          {mission ? statusOf(mission, now) : "Draft"}
        </span>
      </div>
      <form
        action={action}
        // Server Actions request a native form reset even for returned errors.
        // Preserve select and date/time controls as well as text; a successful
        // save remounts this editor with the new canonical revision instead.
        onReset={(event) => event.preventDefault()}
      >
        <input type="hidden" name="id" value={mission?.id ?? ""} />
        <input type="hidden" name="revision" value={mission?.revision ?? ""} />
        <fieldset className={styles.formFields} disabled={disabled || pending}>
          <section
            className={styles.formSection}
            aria-labelledby="mission-idea-heading"
          >
            <h3 id="mission-idea-heading">
              01 <span>The idea</span>
            </h3>
            <label htmlFor="mission-title">
              Mission title
              <input
                id="mission-title"
                name="title"
                value={draft.title}
                onChange={updateDraft}
                required
                maxLength={120}
                placeholder="Give it a name worth tapping"
              />
            </label>
            <label htmlFor="mission-category">
              Category
              <select
                id="mission-category"
                name="category"
                value={draft.category}
                onChange={updateDraft}
              >
                {MISSION_CATEGORIES.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label htmlFor="mission-instructions">
              What should people do?
              <textarea
                id="mission-instructions"
                name="instructions"
                value={draft.instructions}
                onChange={updateDraft}
                rows={4}
                required
                maxLength={4000}
                placeholder="One clear action, a local twist, and a fun way to finish."
              />
            </label>
          </section>
          <section
            className={styles.formSection}
            aria-labelledby="mission-details-heading"
          >
            <h3 id="mission-details-heading">
              02 <span>The practical bits</span>
            </h3>
            <label htmlFor="mission-location">
              Place
              <input
                id="mission-location"
                name="location_name"
                value={draft.location_name}
                onChange={updateDraft}
                required
                maxLength={160}
                placeholder="A real place in Urbana or Champaign"
              />
            </label>
            <div className={styles.twoColumns}>
              <label htmlFor="mission-city">
                City
                <select
                  id="mission-city"
                  name="city"
                  value={draft.city}
                  onChange={updateDraft}
                >
                  <option>Urbana</option>
                  <option>Champaign</option>
                </select>
              </label>
              <label htmlFor="mission-duration">
                Time needed (minutes)
                <input
                  id="mission-duration"
                  name="duration_minutes"
                  type="number"
                  min={1}
                  max={1440}
                  value={draft.duration_minutes}
                  onChange={updateDraft}
                  required
                />
              </label>
            </div>
            <label htmlFor="mission-address">
              Address <span className={styles.optional}>optional</span>
              <input
                id="mission-address"
                name="location_address"
                value={draft.location_address}
                onChange={updateDraft}
                maxLength={240}
                placeholder="Use a verified address when useful"
              />
            </label>
            <div className={styles.twoColumns}>
              <label htmlFor="mission-cost">
                Cost
                <input
                  id="mission-cost"
                  name="cost_label"
                  value={draft.cost_label}
                  onChange={updateDraft}
                  required
                  maxLength={100}
                  placeholder="Free, purchase optional…"
                />
              </label>
              <label htmlFor="mission-nuts">
                Nuts reward
                <input
                  id="mission-nuts"
                  name="nuts"
                  type="number"
                  min={0}
                  max={1000}
                  value={draft.nuts}
                  onChange={updateDraft}
                  required
                />
              </label>
              <label htmlFor="mission-min-people">
                Minimum people
                <input
                  id="mission-min-people"
                  name="min_people"
                  type="number"
                  min={1}
                  max={100}
                  value={draft.min_people}
                  onChange={updateDraft}
                  required
                />
              </label>
              <label htmlFor="mission-max-people">
                Maximum people
                <input
                  id="mission-max-people"
                  name="max_people"
                  type="number"
                  min={1}
                  max={100}
                  value={draft.max_people}
                  onChange={updateDraft}
                  required
                />
              </label>
            </div>
          </section>
          <section
            className={styles.formSection}
            aria-labelledby="mission-check-heading"
          >
            <h3 id="mission-check-heading">
              03 <span>The finish & the facts</span>
            </h3>
            <label htmlFor="mission-proof">
              Completion prompt
              <textarea
                id="mission-proof"
                name="proof_prompt"
                value={draft.proof_prompt}
                onChange={updateDraft}
                rows={2}
                required
                maxLength={500}
                placeholder="What photo or video must participants submit?"
              />
            </label>
            <p className={styles.hint}>
              Every mission requires photo or video proof. Describe what it must
              show; written responses do not replace it.
            </p>
            <label htmlFor="mission-source">
              Local source URL
              <input
                id="mission-source"
                name="source_url"
                type="url"
                value={draft.source_url}
                onChange={updateDraft}
                required
                maxLength={2000}
                placeholder="https://…"
              />
            </label>
            {mission?.source_url && (
              <a
                className={styles.sourceLink}
                href={mission.source_url}
                target="_blank"
                rel="noreferrer"
              >
                Check the saved source{" "}
                <ArrowUpRight size={13} aria-hidden="true" />
              </a>
            )}
            <label htmlFor="mission-source-date">
              Date source was checked
              <input
                id="mission-source-date"
                name="source_checked_on"
                type="date"
                value={draft.source_checked_on}
                onChange={updateDraft}
                onInput={updateDraft}
                required
              />
            </label>
          </section>
          <section
            className={styles.formSection}
            aria-labelledby="mission-schedule-heading"
          >
            <h3 id="mission-schedule-heading">
              04 <span>When it belongs in the feed</span>
            </h3>
            <p className={styles.hint} id="mission-schedule-help">
              Use Central time (America/Chicago), including daylight saving
              time. Leave start blank for availability after approval; leave end
              blank for no expiry. A schedule never approves a draft.
            </p>
            <div className={styles.twoColumns}>
              <label htmlFor="mission-start">
                Starts <span className={styles.optional}>optional</span>
                <input
                  id="mission-start"
                  name="starts_local"
                  type="datetime-local"
                  value={draft.starts_local}
                  onChange={updateDraft}
                  onInput={updateDraft}
                  aria-describedby="mission-schedule-help"
                />
              </label>
              <label htmlFor="mission-end">
                Ends <span className={styles.optional}>optional</span>
                <input
                  id="mission-end"
                  name="ends_local"
                  type="datetime-local"
                  value={draft.ends_local}
                  onChange={updateDraft}
                  onInput={updateDraft}
                  aria-describedby="mission-schedule-help"
                />
              </label>
            </div>
          </section>
          <div className={styles.saveRow}>
            <button className={styles.primaryButton} disabled={pending}>
              {pending
                ? "Saving…"
                : archived
                  ? "Restore as draft"
                  : "Save draft"}
              <Check size={15} aria-hidden="true" />
            </button>
            <p>
              Saving keeps this mission private until you approve this version.
            </p>
          </div>
        </fieldset>
        <ActionFeedback state={state} />
      </form>

      {archived ? (
        <div className={styles.approvalSection}>
          <strong>This mission is archived.</strong>
          <p>
            It is excluded from both feeds. Save your changes to restore it as a
            draft, then review it for fresh approval.
          </p>
        </div>
      ) : mission ? (
        <ApprovalControls
          mission={mission}
          disabled={disabled || pending || dirty}
          dirty={dirty}
          deliveryEnabled={deliveryEnabled}
        />
      ) : (
        <div className={styles.approvalSection}>
          <LockKeyhole size={17} aria-hidden="true" />
          <p>
            Save your draft first. You’ll review and approve it in a separate
            step.
          </p>
        </div>
      )}
    </>
  );
}

function ApprovalControls({
  mission,
  disabled,
  dirty,
  deliveryEnabled,
}: {
  mission: MissionLibraryRecord;
  disabled: boolean;
  dirty: boolean;
  deliveryEnabled: boolean;
}) {
  const [approval, approveAction, approving] = useActionState(
    approveMission,
    {},
  );
  const [archive, archiveAction, archiving] = useActionState(
    archiveMission,
    {},
  );
  const [confirmed, setConfirmed] = useState(false);
  return (
    <div className={styles.approvalSection}>
      <div className={styles.approvalHeading}>
        <LockKeyhole size={18} aria-hidden="true" />
        <h3>Your approval comes first.</h3>
      </div>
      <p>
        {mission.approved_at
          ? "This saved version is approved. Any edit will return it to draft for a fresh review."
          : "Review the place, instructions, and schedule before approving the saved version."}{" "}
        {!deliveryEnabled &&
          "MVP delivery remains paused until it is enabled separately."}
      </p>
      {dirty && (
        <p className={styles.dirtyNotice}>
          You have unsaved edits. Save the draft before approving.
        </p>
      )}
      {!mission.approved_at && (
        <form action={approveAction}>
          <input type="hidden" name="id" value={mission.id} />
          <input type="hidden" name="revision" value={mission.revision} />
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              name="confirmation"
              value="APPROVE"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              required
              disabled={disabled || approving || archiving}
            />
            <span>I approve this mission for the MVP.</span>
          </label>
          <button
            className={styles.primaryButton}
            disabled={disabled || approving || archiving || !confirmed}
          >
            {approving ? "Approving…" : "Approve for MVP"}
            <Check size={15} aria-hidden="true" />
          </button>
          <ActionFeedback state={approval} />
        </form>
      )}
      <form action={archiveAction} className={styles.archiveForm}>
        <input type="hidden" name="id" value={mission.id} />
        <input type="hidden" name="revision" value={mission.revision} />
        <button
          className={styles.textButton}
          disabled={disabled || approving || archiving}
        >
          {archiving ? "Archiving…" : "Archive mission"}
        </button>
        <span>Removes it from both feeds.</span>
        <ActionFeedback state={archive} />
      </form>
    </div>
  );
}
