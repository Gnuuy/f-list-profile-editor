import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import {
    activePatterns,
    BREAK_SPEED,
    clampBarCount,
    clampEase,
    clampImpacts,
    clampPercent,
    clampRandomness,
    clampRepeats,
    clampSpeed,
    clampVariations,
    createBarMotion,
    MAX_BAR_COUNT,
    MAX_RANDOMNESS,
    MAX_VARIATIONS,
    MIN_BAR_COUNT,
    MIN_SPEED,
    withVariations,
} from "../../models/NalasBars";
import type { Bar, Pattern } from "../../models/NalasBars";
import { MAX_LABEL_LENGTH, setupFromQuery, shareQuery } from "../../models/NalasBarsLink";
import type { BarsSetup } from "../../models/NalasBarsLink";
import { BARS_HEIGHT, BARS_LAYOUT, BARS_SCALE, barsWidth, drawBars } from "../../services/NalasBarsDrawing";
import { copyToClipboard } from "../../utilities/Clipboard";
import { toast } from "../../utilities/Toast";
import { NumberField, SliderField } from "./SliderField";

type PatternSlider = {
    key: keyof Pattern;
    caption: string;
    min: number;
    /** The slider's end. The box beside it can go further where the setting allows. */
    max: number;
    clamp: (value: number) => number;
};

// Each pattern's sliders, in reading order.
const PATTERN_SLIDERS: readonly PatternSlider[] = [
    { key: "repeats", caption: "Repeats", min: 1, max: 20, clamp: clampRepeats },
    { key: "rise", caption: "Rise speed", min: MIN_SPEED, max: 300, clamp: clampSpeed },
    { key: "fall", caption: "Fall speed", min: MIN_SPEED, max: 300, clamp: clampSpeed },
    { key: "max", caption: "Max", min: 0, max: 100, clamp: clampPercent },
    { key: "min", caption: "Min", min: 0, max: 100, clamp: clampPercent },
];

const EASING_SLIDERS: readonly PatternSlider[] = [
    { key: "riseStart", caption: "Rise start", min: -100, max: 100, clamp: clampEase },
    { key: "riseEnd", caption: "Rise end", min: -100, max: 100, clamp: clampEase },
    { key: "fallStart", caption: "Fall start", min: -100, max: 100, clamp: clampEase },
    { key: "fallEnd", caption: "Fall end", min: -100, max: 100, clamp: clampEase },
];

export default function NalasBarsMainView() {
    // A shared link brings its setup with it.
    const [setup, setSetup] = useState<BarsSetup>(() => setupFromQuery(window.location.search));
    const [selectedBar, setSelectedBar] = useState(0);
    const [selectedPattern, setSelectedPattern] = useState(0);
    const [running, setRunning] = useState(true);
    // How far the animation has played, in seconds.
    const timeRef = useRef(0);
    // When each bar's Broken was switched on: slams only count from then. A
    // shared link with Broken already on counts from the start.
    const [countSlamsFrom, setCountSlamsFrom] = useState<number[]>(() => setup.bars.map(() => 0));
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const { count, bars: allBars, randomness, background } = setup;
    const bars = useMemo(() => allBars.slice(0, count), [allBars, count]);
    const motions = useMemo(
        () => bars.map((bar, index) => createBarMotion(bar, { index, randomness, countSlamsFrom: countSlamsFrom[index] })),
        [bars, randomness, countSlamsFrom],
    );

    const barIndex = Math.min(selectedBar, count - 1);
    const bar = allBars[barIndex];
    const patternIndex = Math.min(selectedPattern, bar.variations);
    const pattern = bar.patterns[patternIndex];

    // The animation loop reads the latest settings without restarting.
    const scene = useRef({ bars, motions, background, running });
    scene.current = { bars, motions, background, running };

    useEffect(() => {
        const context = canvasRef.current?.getContext("2d");
        if (!context) return;

        let previous = performance.now();
        let frame = requestAnimationFrame(function animate(now) {
            const current = scene.current;
            if (current.running) timeRef.current += Math.min(0.05, (now - previous) / 1000);
            previous = now;
            drawBars(context, current.bars, current.motions.map(motion => motion(timeRef.current)), current.background);
            frame = requestAnimationFrame(animate);
        });
        return () => cancelAnimationFrame(frame);
    }, []);

    // Keeps the setup in the address, so the address is always a link to it.
    // Waits for a pause in sliding, as browsers limit how often it can change.
    const query = shareQuery(setup);
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

    const change = (changes: Partial<BarsSetup>) => setSetup(current => ({ ...current, ...changes }));
    const changeBar = (index: number, update: (old: Bar) => Bar) => {
        setSetup(current => ({ ...current, bars: current.bars.map((old, i) => (i === index ? update(old) : old)) }));
    };
    const changePattern = (key: keyof Pattern, value: number) => {
        changeBar(barIndex, old => ({
            ...old,
            patterns: old.patterns.map((p, i) => (i === patternIndex ? { ...p, [key]: value } : p)),
        }));
    };
    const selectBar = (index: number) => {
        if (index !== barIndex) setSelectedPattern(0);
        setSelectedBar(index);
    };

    const layout = {
        "--nalas-bars-width": `${barsWidth(MAX_BAR_COUNT)}px`,
        "--nalas-bars-stage-width": `${barsWidth(count)}px`,
        "--nalas-bars-count": String(count),
        "--nalas-bars-padding": `${BARS_LAYOUT.padding}px`,
        "--nalas-bars-gap": `${BARS_LAYOUT.columnGap}px`,
    } as CSSProperties;

    const patternSlider = ({ key, caption, min, max, clamp }: PatternSlider) => (
        <SliderField
            key={key}
            caption={caption}
            value={pattern[key]}
            min={min}
            max={max}
            clamp={clamp}
            onChange={value => changePattern(key, value)}
        />
    );

    return (
        <div className="nalas-bars-view" style={layout}>
            <div>
                <h1>Nala&apos;s Bars</h1>
                <p className="nalas-bars-intro">
                    Pick a bar below to change it. Each bar plays its patterns in turn and starts over: the white rises
                    from Min to Max and falls back, as many times as the pattern repeats. Speeds are in BPM, so rising
                    and falling at 60 is once a second.
                </p>
            </div>

            <div className="nalas-bars-stage">
                <canvas
                    ref={canvasRef}
                    className="nalas-bars-canvas"
                    width={barsWidth(count) * BARS_SCALE}
                    height={BARS_HEIGHT * BARS_SCALE}
                    role="img"
                    aria-label={`Bouncing bars: ${bars.map(b => b.label).join(", ")}`}
                />
                <div className="nalas-bars-controls" role="tablist" aria-label="Bars">
                    {bars.map((b, index) => (
                        <div
                            key={index}
                            className={`nalas-bars-column${index === barIndex ? " is-selected" : ""}`}
                            onClick={() => selectBar(index)}
                        >
                            <input
                                type="text"
                                value={b.label}
                                maxLength={MAX_LABEL_LENGTH}
                                aria-label={`Bar ${index + 1} label`}
                                onFocus={() => selectBar(index)}
                                onChange={event => changeBar(index, old => ({ ...old, label: event.target.value }))}
                            />
                            <button
                                type="button"
                                role="tab"
                                aria-selected={index === barIndex}
                                className="nalas-bars-pick"
                                onClick={() => selectBar(index)}
                            >
                                {index === barIndex ? "Editing" : "Edit"}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <section className="nalas-bars-editor" aria-label={`Bar ${barIndex + 1} settings`}>
                <h2>Bar {barIndex + 1}{bar.label ? `: ${bar.label}` : ""}</h2>
                <div className="nalas-bars-sliders">
                    <SliderField
                        caption="Jolt"
                        value={bar.jolt}
                        min={0}
                        max={100}
                        clamp={clampPercent}
                        onChange={value => changeBar(barIndex, old => ({ ...old, jolt: value }))}
                    />
                    <SliderField
                        caption="Wobble"
                        value={bar.wobble}
                        min={0}
                        max={100}
                        clamp={clampPercent}
                        onChange={value => changeBar(barIndex, old => ({ ...old, wobble: value }))}
                    />
                    <SliderField
                        caption="Variations"
                        value={bar.variations}
                        min={0}
                        max={MAX_VARIATIONS}
                        clamp={clampVariations}
                        onChange={value => changeBar(barIndex, old => withVariations(old, value))}
                    />
                </div>
                <div className="nalas-bars-sliders">
                    <label className="nalas-toggle">
                        <input
                            type="checkbox"
                            checked={bar.crack}
                            onChange={event => changeBar(barIndex, old => ({ ...old, crack: event.target.checked }))}
                        />
                        Crack on impact
                    </label>
                    <label className="nalas-toggle">
                        <input
                            type="checkbox"
                            checked={bar.broken}
                            onChange={event => {
                                const broken = event.target.checked;
                                // Switching it on starts counting slams afresh; switching it off mends the bar.
                                if (broken) setCountSlamsFrom(current => current.map((from, i) => (i === barIndex ? timeRef.current : from)));
                                changeBar(barIndex, old => ({ ...old, broken }));
                            }}
                        />
                        Broken
                    </label>
                    {bar.broken && (
                        <NumberField
                            caption="Break after impact"
                            value={bar.impacts}
                            min={1}
                            clamp={clampImpacts}
                            onChange={value => changeBar(barIndex, old => ({ ...old, impacts: value }))}
                        />
                    )}
                </div>
                <p className="nalas-bars-hint">
                    Jolt is the hop and squash as the white hits the top; Wobble is the sway and tilt. Crack on impact
                    cracks the top of the bar each time the white hits it, which needs a Max of 90 or more. Broken
                    makes the top break off and fly away once the white has slammed into it as many times as Break after
                    impact says, with a Rise speed above {BREAK_SPEED}. Variations add more patterns for this bar to loop through.
                </p>

                {bar.variations > 0 && (
                    <div className="nalas-bars-patterns" role="tablist" aria-label="Patterns">
                        {activePatterns(bar).map((p, index) => (
                            <button
                                key={index}
                                type="button"
                                role="tab"
                                aria-selected={index === patternIndex}
                                className={index === patternIndex ? "is-selected" : undefined}
                                onClick={() => setSelectedPattern(index)}
                            >
                                Pattern {index + 1} <span>×{p.repeats}</span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="nalas-bars-pattern">
                    {bar.variations > 0 && <h3>Pattern {patternIndex + 1}</h3>}
                    <div className="nalas-bars-sliders">{PATTERN_SLIDERS.map(patternSlider)}</div>
                    <div className="nalas-bars-sliders is-pairs">{EASING_SLIDERS.map(patternSlider)}</div>
                    <p className="nalas-bars-hint">
                        Easing: left accelerates, right dampens (100 eases in from a standstill), the middle is a steady
                        speed. Set Min and Max the same to pause.
                    </p>
                </div>
            </section>

            <div className="nalas-bars-actions">
                <button type="button" onClick={() => setRunning(current => !current)}>
                    {running ? "Pause" : "Play"}
                </button>
                <label className="nalas-bars-option">
                    Bars
                    <select value={count} onChange={event => change({ count: clampBarCount(Number(event.target.value)) })}>
                        {Array.from({ length: MAX_BAR_COUNT - MIN_BAR_COUNT + 1 }, (_, i) => MIN_BAR_COUNT + i).map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </label>
                <SliderField
                    caption="Randomness %"
                    value={randomness}
                    min={0}
                    max={MAX_RANDOMNESS}
                    clamp={clampRandomness}
                    onChange={value => change({ randomness: value })}
                />
                <label className="nalas-bars-option">
                    Background
                    <input type="color" value={background} onChange={event => change({ background: event.target.value })} />
                </label>
                <button type="button" onClick={() => void copyLink()}>
                    Copy link
                </button>
            </div>
        </div>
    );
}
