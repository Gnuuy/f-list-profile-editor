import { useRef, useState } from "react";
import { useLocation } from "wouter";

import { useProfileDrafts } from "../../context/ProfileDraftsContext";
import { describeDraftRestore } from "../../models/ProfileDrafts";
import { downloadTextFile } from "../../utilities/Download";
import { toast } from "../../utilities/Toast";
import { DraftDetailsDialog } from "../../views/components/DraftDetailsDialog";
import SidebarButton from "../../views/components/SidebarButton";

export default function ProfilesSidebarView() {
    const { status, createDraft, backupDrafts, restoreDrafts } = useProfileDrafts();
    const [, navigate] = useLocation();
    const [creating, setCreating] = useState(false);
    const restoreInputRef = useRef<HTMLInputElement>(null);

    if (status !== "ready") return null;

    const handleBackup = async () => {
        try {
            const date = new Date().toISOString().slice(0, 10);
            downloadTextFile(await backupDrafts(), `f-list-profile-drafts-${date}.json`);
            toast("Backup downloaded");
        } catch (error) {
            console.error("Backup failed:", error);
            toast("The backup could not be created.", "error");
        }
    };

    const handleRestore = async (file: File) => {
        try {
            toast(describeDraftRestore(await restoreDrafts(await file.text())));
        } catch (error) {
            console.error("Restore failed:", error);
            toast(error instanceof Error ? error.message : "The backup could not be restored.", "error");
        }
    };

    return (
        <div className="editor-sidebar-actions">
            <SidebarButton title="New draft" onClick={() => setCreating(true)} />
            <SidebarButton title="Back up drafts" onClick={handleBackup} />
            <SidebarButton title="Restore backup" onClick={() => restoreInputRef.current?.click()} />
            <input
                ref={restoreInputRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={event => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void handleRestore(file);
                }}
            />
            <p className="profiles-sidebar-note">
                Restoring adds the backup&apos;s drafts. Drafts you&apos;ve edited here since the backup are kept.
            </p>
            {creating && (
                <DraftDetailsDialog
                    title="New draft"
                    submitLabel="Create draft"
                    onCancel={() => setCreating(false)}
                    onSubmit={async details => {
                        await createDraft(details);
                        setCreating(false);
                        navigate("/");
                    }}
                />
            )}
        </div>
    );
}
