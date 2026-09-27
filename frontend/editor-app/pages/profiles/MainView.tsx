import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

import { useProfileDrafts } from "../../context/ProfileDraftsContext";
import { describeLastEdited, groupDraftsByCharacter } from "../../models/ProfileDrafts";
import type { ProfileDraft } from "../../models/ProfileDrafts";
import { toast } from "../../utilities/Toast";
import { ConfirmDialog } from "../../views/components/ConfirmDialog";
import { DraftDetailsDialog } from "../../views/components/DraftDetailsDialog";

export default function ProfilesMainView() {
    const {
        status, persistent, drafts, activeDraft,
        openDraft, updateDraftDetails, duplicateDraft, deleteDraft,
    } = useProfileDrafts();
    const [, navigate] = useLocation();
    const [editing, setEditing] = useState<ProfileDraft | null>(null);
    const [deleting, setDeleting] = useState<ProfileDraft | null>(null);
    const [now, setNow] = useState(() => Date.now());
    const groups = useMemo(() => groupDraftsByCharacter(drafts), [drafts]);

    // Keeps "Edited 5 minutes ago" current while the page stays open.
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 60_000);
        return () => window.clearInterval(timer);
    }, []);

    const open = (draft: ProfileDraft) => {
        openDraft(draft.id);
        navigate("/");
    };

    const duplicate = async (draft: ProfileDraft) => {
        try {
            await duplicateDraft(draft.id);
            toast(`Duplicated “${draft.name}”`);
        } catch (error) {
            console.error("Draft could not be duplicated:", error);
            toast("The draft could not be duplicated.", "error");
        }
    };

    if (status !== "ready") {
        return (
            <p className="profile-drafts-status">
                {status === "error"
                    ? "Your drafts could not be loaded. Try reloading the page."
                    : "Loading your drafts…"}
            </p>
        );
    }

    return (
        <div className="profiles-view">
            <div>
                <h1>Profiles</h1>
                <p className="profiles-intro">
                    Your drafts are saved in this browser only, never on our server. Use
                    {" "}<strong>Back up drafts</strong> to keep a copy or move them to another browser.
                </p>
            </div>

            {!persistent && (
                <p className="profiles-warning" role="alert">
                    This browser isn&apos;t letting the editor store drafts, so they&apos;ll be gone
                    when you close this tab. Back up your drafts before you leave.
                </p>
            )}

            {groups.map(group => (
                <section
                    key={group.key || "no-character"}
                    className="profile-group"
                    aria-label={group.character?.name ?? "No character"}
                >
                    <header className="profile-group-header">
                        {group.character && (
                            <img
                                className="profile-group-avatar"
                                src={group.character.avatarUrl}
                                alt=""
                                width={40}
                                height={40}
                                loading="lazy"
                                onError={event => { event.currentTarget.style.visibility = "hidden"; }}
                            />
                        )}
                        <h2>
                            {group.character ? (
                                <a href={group.character.profileUrl} target="_blank" rel="noreferrer">
                                    {group.character.name}
                                </a>
                            ) : "No character"}
                        </h2>
                        <span className="profile-group-count">
                            {group.drafts.length} draft{group.drafts.length === 1 ? "" : "s"}
                        </span>
                    </header>

                    <ul className="profile-draft-list">
                        {group.drafts.map(draft => {
                            const isActive = draft.id === activeDraft?.id;
                            return (
                                <li key={draft.id} className={`profile-draft${isActive ? " is-active" : ""}`}>
                                    <button
                                        type="button"
                                        className="profile-draft-open"
                                        onClick={() => open(draft)}
                                        title={`Open “${draft.name}” in the editor`}
                                    >
                                        <span className="profile-draft-name">{draft.name}</span>
                                        <span className="profile-draft-meta">
                                            {describeLastEdited(draft.updatedAt, now)}
                                            {isActive && " · Open in the editor"}
                                        </span>
                                    </button>
                                    <div className="profile-draft-actions">
                                        <button type="button" onClick={() => setEditing(draft)}>Edit</button>
                                        <button type="button" onClick={() => void duplicate(draft)}>Duplicate</button>
                                        <button type="button" className="is-danger" onClick={() => setDeleting(draft)}>
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            ))}

            {editing && (
                <DraftDetailsDialog
                    title="Edit draft"
                    submitLabel="Save"
                    initialName={editing.name}
                    initialCharacterName={editing.character?.name}
                    onCancel={() => setEditing(null)}
                    onSubmit={async details => {
                        await updateDraftDetails(editing.id, details);
                        setEditing(null);
                        toast("Draft updated");
                    }}
                />
            )}

            {deleting && (
                <ConfirmDialog
                    title="Delete this draft?"
                    message={`“${deleting.name}” will be permanently deleted from this browser. Back up your drafts first if you might want it later.`}
                    confirmLabel="Delete draft"
                    onCancel={() => setDeleting(null)}
                    onConfirm={() => {
                        const draft = deleting;
                        setDeleting(null);
                        deleteDraft(draft.id).then(
                            () => toast(`Deleted “${draft.name}”`),
                            error => {
                                console.error("Draft could not be deleted:", error);
                                toast("The draft could not be deleted.", "error");
                            },
                        );
                    }}
                />
            )}
        </div>
    );
}
