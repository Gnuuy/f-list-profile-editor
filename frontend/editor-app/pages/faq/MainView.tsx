import { characterIcon } from "../../models/FListProfile";

const CONTACT = characterIcon("FKLR-R03");

// Each entry lists one or more key combinations for the same action.
const SHORTCUTS: Array<[string[], string]> = [
    [["Ctrl+B"], "Bold"],
    [["Ctrl+I"], "Italic"],
    [["Ctrl+U"], "Underline"],
    [["Ctrl+S", "Ctrl+Shift+X"], "Strikethrough"],
    [["Ctrl+↑", "Ctrl+."], "Superscript"],
    [["Ctrl+↓", "Ctrl+,"], "Subscript"],
    [["Ctrl+L"], "Add or edit a link"],
    [["Ctrl+D"], "Text colour"],
    [["Ctrl+Shift+C"], "Remove text colour"],
    [["Ctrl+E"], "Eicons"],
    [["Ctrl+R"], "Character icon"],
    [["Ctrl+Shift+L"], "Align left"],
    [["Ctrl+Shift+E"], "Align center"],
    [["Ctrl+Shift+R"], "Align right"],
    [["Ctrl+Shift+J"], "Justify"],
    [["Alt+Q"], "Quote (quotes the selected text)"],
    [["Alt+C"], "Add a dropdown, or open/close the one you're in"],
    [["Ctrl+Shift+-"], "Horizontal rule"],
    [["Alt+→", "Alt+←"], "Indent or unindent the quote or dropdown you're in"],
    [["Ctrl+Enter"], "Leave the quote or dropdown you're in"],
    [["↑"], "On the top line of a quote or dropdown with nothing above it: add a line above it"],
    [["↓"], "On the bottom line of a quote or dropdown with nothing below it: add a line below it"],
    [["Ctrl+Z"], "Undo"],
    [["Ctrl+Y", "Ctrl+Shift+Z"], "Redo"],
    [["Ctrl", "Alt"], "Hold while dropping a dragged block to copy it instead of moving it"],
    [["Esc"], "Cancel a drag"],
];

// Newest first. A short summary of what changed for people using the editor.
const CHANGELOG: Array<{ version: string; changes: string[] }> = [
    {
        version: "0.4.2",
        changes: [
            "Reset is now New draft: it starts a new draft and leaves the one you're editing alone.",
            "Drag and drop can be turned on and off with the grip button at the top right of the toolbar.",
            "Press ↑ on the top line of a dropdown or quote, or ↓ on its bottom line, to add a line above or below it. The ⋯ menu on its header can do the same.",
            "The cursor can no longer end up inside a closed dropdown.",
            "Colouring, aligning, indenting or opening a dropdown only changes that dropdown. Nested dropdowns keep their own settings, or take the nearest dropdown's if they have none.",
            "Import and export keep empty lines and line breaks exactly as F-list shows them, and eicon names keep their capital letters.",
            "Spacing around inline images, horizontal rules, quotes, dropdowns and indents now matches F-list, and quote headers are the same height as on F-list.",
            "A [color] around several dropdowns now colours all of them, and a [color] around a quote stays around the quote when you export.",
            "Dark mode uses F-list's dark theme text colours for normal text, quotes and dropdown titles, including the shadow on coloured text.",
        ],
    },
    {
        version: "0.4.1",
        changes: [
            "Selecting text shows a small formatting menu next to it.",
            "Blocks can be dragged to move them, by the grip on the left or by a dropdown's or quote's header. They can be dropped into open dropdowns and quotes, nested ones too.",
            "Keyboard shortcuts are listed in this FAQ, along with how to report bugs and ask for features.",
            "Dark mode shows [color=black] text in grey with a dark shadow, like F-list's dark theme.",
        ],
    },
    {
        version: "0.4.0",
        changes: [
            "Profiles: drafts are saved in your own browser, grouped by character, with backup and restore.",
            "Import from a character name, as well as from a profile link or pasted BBCode.",
            "Alignment works like on F-list: every aligned part sits on its own line.",
            "Exported links never have other tags inside them, as F-list requires.",
            "The Feedback button works. Only the text you write is saved.",
            "New dark theme colours for the editor, toolbar, menus, dropdowns, quotes and horizontal rules.",
            "The FAQ looks like the editor, and explains why this exists.",
        ],
    },
];

function KeyCombo({ combo }: { combo: string }) {
    return (
        <>
            {combo.split("+").map((key, index) => (
                <span key={index}>
                    {index > 0 && "+"}
                    <kbd>{key}</kbd>
                </span>
            ))}
        </>
    );
}

// Shown in the same framed profile panel as the editor, so it matches every theme.
export default function FaqMainView() {
    return (
        <section className="f-list-profile-workspace" aria-label="Frequently asked questions">
            <div className="editor f-list-profile-canvas">
                <div className="faq-content">
                    <h1>Frequently Asked Questions:</h1>

                    <h2>What kind of data do you track?</h2>
                    <p>None. Profile content is not uploaded by the editor. Your drafts are saved in your own browser, never on our server, so use Back up drafts on the Profiles page if you want a copy. If you send feedback, only the text you write is saved.</p>
                    <p>
                        If you&apos;re interested in seeing the source code for this website,{" "}
                        <a href="https://github.com/Gnuuy/f-list-profile-editor" target="_blank" rel="noreferrer">go here</a>.
                    </p>

                    <h2>Why make this?</h2>
                    <p>I have a background as a fullstack software engineer, but I mainly work with backend systems, so I made this to practise frontend development.</p>
                    <p>The other reason is that my own profile&apos;s BBCode is too dense and unwieldy to make changes to. Small changes would lead to cascading errors. Had enough, made an editor and decided to share it.</p>

                    <h2>Keyboard shortcuts</h2>
                    <p>On a Mac, use Cmd instead of Ctrl and Option instead of Alt.</p>
                    <ul className="faq-shortcuts">
                        {SHORTCUTS.map(([combos, action]) => (
                            <li key={action}>
                                {combos.map((combo, index) => (
                                    <span key={combo}>
                                        {index > 0 && " or "}
                                        <KeyCombo combo={combo} />
                                    </span>
                                ))}
                                {" "}: {action}
                            </li>
                        ))}
                    </ul>

                    <h2>Found a bug or want a feature?</h2>
                    <p>Use the Feedback button in the top bar. Only your message is saved, nothing else: not who you are and not where it came from. That also means I can&apos;t reply to you, so put everything in the message.</p>
                    <p>When reporting a bug, please be precise. Describe exactly what you did, step by step, what you expected to happen, and what happened instead. If it involves BBCode, paste the part that causes it.</p>
                    <p>If you&apos;d like a reply, you can also contact FKLR-R03 on F-list:</p>
                    {CONTACT && (
                        <div className="faq-contacts">
                            <a className="faq-contact" href={CONTACT.profileUrl} target="_blank" rel="noreferrer">
                                <img src={CONTACT.avatarUrl} alt="" width={50} height={50} />
                                <span>{CONTACT.character}</span>
                            </a>
                        </div>
                    )}

                    <h2>Will you make a mobile version?</h2>
                    <p>Absolutely not.</p>

                    <h2>Changelog</h2>
                    <div className="faq-changelog">
                        {CHANGELOG.map(({ version, changes }) => (
                            <details key={version} className="faq-changelog-entry">
                                <summary>Version {version}</summary>
                                <ul>
                                    {changes.map(change => <li key={change}>{change}</li>)}
                                </ul>
                            </details>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
