import { useEffect, useRef, useState } from "react";

import { useEditorUI } from "../../context/EditorUIContext";
import { useProfileDrafts } from "../../context/ProfileDraftsContext";
import { shouldFloatEditorToolbar } from "../../models/FloatingToolbarModel";
import BlockDragHandle from "../../views/components/BlockDragHandle";
import EditorBubbleMenu from "../../views/components/EditorBubbleMenu";
import EditorToolbar from "../../views/components/EditorToolbar";
import EditorToolbarMenus from "../../views/components/EditorToolbarMenus";
import { EditorInstance } from "../../views/components/EditorInstance";

export default function EditorView()
{
    const workspaceRef = useRef<HTMLElement | null>(null);
    const toolbarAnchorRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const [toolbarFloating, setToolbarFloating] = useState(false);
    const { status, activeDraft } = useProfileDrafts();
    const { blockDragEnabled } = useEditorUI();

    useEffect(() => {
        let animationFrame: number | null = null;

        const updateToolbarPosition = () => {
            animationFrame = null;
            const workspace = workspaceRef.current;
            const anchor = toolbarAnchorRef.current;
            if (!workspace || !anchor) return;

            setToolbarFloating(shouldFloatEditorToolbar(
                anchor.getBoundingClientRect().bottom,
                workspace.getBoundingClientRect().bottom,
            ));
        };

        const scheduleUpdate = () => {
            if (animationFrame !== null) return;
            animationFrame = window.requestAnimationFrame(updateToolbarPosition);
        };

        scheduleUpdate();
        window.addEventListener("scroll", scheduleUpdate, { passive: true });
        window.addEventListener("resize", scheduleUpdate);

        const resizeObserver = typeof ResizeObserver === "undefined"
            ? null
            : new ResizeObserver(scheduleUpdate);
        if (workspaceRef.current) resizeObserver?.observe(workspaceRef.current);

        return () => {
            window.removeEventListener("scroll", scheduleUpdate);
            window.removeEventListener("resize", scheduleUpdate);
            resizeObserver?.disconnect();
            if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
        };
    }, []);

    return (
        <section ref={workspaceRef} className="f-list-profile-workspace" aria-label="F-list profile canvas">
            <div ref={toolbarAnchorRef} className="editor-toolbar-anchor">
                <EditorToolbar isFloating={toolbarFloating} />
            </div>
            <EditorToolbarMenus />
            <EditorBubbleMenu />
            <div
                ref={canvasRef}
                className="editor f-list-profile-canvas"
                data-block-drag={blockDragEnabled ? "on" : "off"}
            >
                <BlockDragHandle containerRef={canvasRef} />
                {activeDraft ? (
                    <EditorInstance key={activeDraft.id} draft={activeDraft} />
                ) : (
                    <p className="profile-drafts-status">
                        {status === "error"
                            ? "Your drafts could not be loaded. Try reloading the page."
                            : "Loading your draft…"}
                    </p>
                )}
            </div>
        </section>
    )
}
