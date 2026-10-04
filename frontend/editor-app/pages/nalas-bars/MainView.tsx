import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import {
    clampBarCount,
    clampBpm,
    clampPercent,
    clampWobble,
    MAX_BAR_COUNT,
    MIN_BAR_COUNT,
    posesAt,
} from "../../models/NalasBars";
import type { Bar } from "../../models/NalasBars";
import { MAX_LABEL_LENGTH, setupFromQuery, shareQuery } from "../../models/NalasBarsLink";
import { BARS_HEIGHT, BARS_LAYOUT, BARS_SCALE, barsWidth, drawBars } from "../../services/NalasBarsDrawing";
import { copyToClipboard } from "../../utilities/Clipboard";
import { toast } from "../../utilities/Toast";

type NumberSetting = "bpm" | "max" | "min" | "wobble";
// Numbers are kept as typed, so a box can be cleared and retyped.
type BarFields = { label: string } & Record<NumberSetting, string>;

// The number boxes under each bar, top to bottom.
const NUMBER_SETTINGS: ReadonlyArray<{
    key: NumberSetting;
    caption: string;
    description: string;
    min: number;
    max?: number;
    clamp: (value: number) => number;
}> = [
    { key: "bpm", caption: "BPM", description: "beats per minute", min: 0, clamp: clampBpm },
    { key: "max", caption: "Max", description: "max, how far up the white goes", min: 0, max: 100, clamp: clampPercent },
    { key: "min", caption: "Min", description: "min, how far down the white goes", min: 0, max: 100, clamp: clampPercent },
    { key: "wobble", caption: "Wobble", description: "wobble", min: 1, max: 100, clamp: clampWobble },
];

const toFields = (bar: Bar): BarFields => ({
    label: bar.label,
    bpm: String(bar.bpm),
    max: String(bar.max),
    min: String(bar.min),
    wobble: String(bar.wobble),
});

const toBar = (fields: BarFields): Bar => ({
    label: fields.label,
    bpm: clampBpm(Number(fields.bpm)),
    max: clampPercent(Number(fields.max)),
    min: clampPercent(Number(fields.min)),
    wobble: clampWobble(Number(fields.wobble)),
});

export default function NalasBarsMainView() {
    // A shared link brings its setup with it.
    const [initial] = useState(() => setupFromQuery(window.location.search));
    // All four bars' settings are kept, so bars switched off come back as they were.
    const [fields, setFields] = useState(() => initial.bars.map(toFields));
    const [count, setCount] = useState(initial.count);
    const [background, setBackground] = useState(initial.background);
    const [running, setRunning] = useState(true);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const allBars = useMemo(() => fields.map(toBar), [fields]);
    const bars = useMemo(() => allBars.slice(0, count), [allBars, count]);

    // The animation loop reads the latest settings without restarting.
    const scene = useRef({ bars, background, running });
    scene.current = { bars, background, running };

    useEffect(() => {
        const context = canvasRef.current?.getContext("2d");
        if (!context) return;
        let time = 0;
        let previous = performance.now();
        let frame = requestAnimationFrame(function animate(now) {
            const current = scene.current;
            if (current.running) time += Math.min(0.05, (now - previous) / 1000);
            previous = now;
            drawBars(context, current.bars, posesAt(current.bars, time), current.background);
            frame = requestAnimationFrame(animate);
        });
        return () => cancelAnimationFrame(frame);
    }, []);

    // Keeps the setup in the address, so the address is always a link to it.
    // Waits for a pause in typing, as browsers limit how often it can change.
    const query = shareQuery({ count, bars: allBars, background });
    useEffect(() => {
        const timer = window.setTimeout(() => {
            const { pathname, search, hash } = window.location;
            const next = query ? `?${query}` : "";
            if (search !== next) window.history.replaceState(window.history.state, "", `${pathname}${next}${hash}`);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [query]);

    const copyLink = async () => {
        const link = `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ""}`;
        if (await copyToClipboard(link)) toast("Link copied. It opens with these exact settings.");
        else toast("The link couldn't be copied.", "error");
    };

    const setField = (index: number, key: keyof BarFields, value: string) => {
        setFields(current => current.map((old, i) => (i === index ? { ...old, [key]: value } : old)));
    };

    const layout = {
        "--nalas-bars-width": `${barsWidth(MAX_BAR_COUNT)}px`,
        "--nalas-bars-stage-width": `${barsWidth(count)}px`,
        "--nalas-bars-count": String(count),
        "--nalas-bars-padding": `${BARS_LAYOUT.padding}px`,
        "--nalas-bars-gap": `${BARS_LAYOUT.columnGap}px`,
    } as CSSProperties;

    return (
        <div className="nalas-bars-view" style={layout}>
            <div>
                <h1>Nala&apos;s Bars</h1>
                <p className="nalas-bars-intro">
                    Edit the labels and set how many times a minute each bar fills, in BPM: every beat the white rises
                    from Min to Max and falls back, and 0 BPM stands still. Max and Min run from 0 to 100. Wobble sets how
                    much the bar bounces as the white turns at the top, from 1 to 100.
                </p>
            </div>

            <div className="nalas-bars-stage">
                <canvas
                    ref={canvasRef}
                    className="nalas-bars-canvas"
                    width={barsWidth(count) * BARS_SCALE}
                    height={BARS_HEIGHT * BARS_SCALE}
                    role="img"
                    aria-label={`Bouncing bars: ${bars.map(bar => bar.label).join(", ")}`}
                />
                <div className="nalas-bars-controls">
                    {fields.slice(0, count).map((bar, index) => (
                        <div key={index} className="nalas-bars-column">
                            <input
                                type="text"
                                value={bar.label}
                                maxLength={MAX_LABEL_LENGTH}
                                aria-label={`Bar ${index + 1} label`}
                                onChange={event => setField(index, "label", event.target.value)}
                            />
                            {NUMBER_SETTINGS.map(setting => (
                                <label key={setting.key} className="nalas-bars-field">
                                    <span>{setting.caption}</span>
                                    <input
                                        type="number"
                                        min={setting.min}
                                        max={setting.max}
                                        step={1}
                                        value={bar[setting.key]}
                                        aria-label={`Bar ${index + 1} ${setting.description}`}
                                        onChange={event => setField(index, setting.key, event.target.value)}
                                        onBlur={() => setField(index, setting.key, String(setting.clamp(Number(bar[setting.key]))))}
                                    />
                                </label>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <div className="nalas-bars-actions">
                <button type="button" onClick={() => setRunning(current => !current)}>
                    {running ? "Pause" : "Play"}
                </button>
                <label className="nalas-bars-option">
                    Bars
                    <select value={count} onChange={event => setCount(clampBarCount(Number(event.target.value)))}>
                        {Array.from({ length: MAX_BAR_COUNT - MIN_BAR_COUNT + 1 }, (_, i) => MIN_BAR_COUNT + i).map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </label>
                <label className="nalas-bars-option">
                    Background
                    <input type="color" value={background} onChange={event => setBackground(event.target.value)} />
                </label>
                <button type="button" onClick={() => void copyLink()}>
                    Copy link
                </button>
            </div>

        </div>
    );
}
