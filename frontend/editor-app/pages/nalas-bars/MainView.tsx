import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { describeFileSize } from "../../models/ImageConversion";
import { clampBpm, clampPercent, clampWobble, DEFAULT_BARS, planLoop, posesAt } from "../../models/NalasBars";
import type { Bar } from "../../models/NalasBars";
import { BARS_HEIGHT, BARS_LAYOUT, BARS_SCALE, BARS_WIDTH, DEFAULT_BACKGROUND, drawBars } from "../../services/NalasBarsDrawing";
import { exportBarsGif } from "../../services/NalasBarsGif";
import { downloadBlob } from "../../utilities/Download";

type ExportState =
    | { status: "idle" }
    | { status: "exporting"; done: number; total: number }
    | { status: "done"; bytes: number }
    | { status: "error" };

export default function NalasBarsMainView() {
    const [labels, setLabels] = useState(() => DEFAULT_BARS.map(bar => bar.label));
    // Kept as typed, so a number can be cleared and retyped.
    const [bpmTexts, setBpmTexts] = useState(() => DEFAULT_BARS.map(bar => String(bar.bpm)));
    const [depthTexts, setDepthTexts] = useState(() => DEFAULT_BARS.map(bar => String(bar.depth)));
    const [wobbleTexts, setWobbleTexts] = useState(() => DEFAULT_BARS.map(bar => String(bar.wobble)));
    const [background, setBackground] = useState(DEFAULT_BACKGROUND);
    const [running, setRunning] = useState(true);
    const [exportState, setExportState] = useState<ExportState>({ status: "idle" });
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const bpmKey = bpmTexts.map(text => clampBpm(Number(text))).join(",");
    const depthKey = depthTexts.map(text => clampPercent(Number(text))).join(",");
    const wobbleKey = wobbleTexts.map(text => clampWobble(Number(text))).join(",");
    const bars = useMemo<Bar[]>(() => {
        const bpms = bpmKey.split(",").map(Number);
        const depths = depthKey.split(",").map(Number);
        const wobbles = wobbleKey.split(",").map(Number);
        return labels.map((label, index) => ({ label, bpm: bpms[index], depth: depths[index], wobble: wobbles[index] }));
    }, [labels, bpmKey, depthKey, wobbleKey]);
    const plan = useMemo(() => planLoop(bpmKey.split(",").map(bpm => ({ bpm: Number(bpm) }))), [bpmKey]);

    // The animation loop reads the latest settings without restarting.
    const scene = useRef({ bars, plan, background, running });
    scene.current = { bars, plan, background, running };

    useEffect(() => {
        const context = canvasRef.current?.getContext("2d");
        if (!context) return;
        let time = 0;
        let previous = performance.now();
        let frame = requestAnimationFrame(function animate(now) {
            const current = scene.current;
            if (current.running) time += Math.min(0.05, (now - previous) / 1000);
            previous = now;
            time %= current.plan.seconds;
            drawBars(context, current.bars, posesAt(current.bars, current.plan, time), current.background);
            frame = requestAnimationFrame(animate);
        });
        return () => cancelAnimationFrame(frame);
    }, []);

    const setLabel = (index: number, label: string) => {
        setLabels(current => current.map((old, i) => (i === index ? label : old)));
    };
    const setBpmText = (index: number, text: string) => {
        setBpmTexts(current => current.map((old, i) => (i === index ? text : old)));
    };
    const setDepthText = (index: number, text: string) => {
        setDepthTexts(current => current.map((old, i) => (i === index ? text : old)));
    };
    const setWobbleText = (index: number, text: string) => {
        setWobbleTexts(current => current.map((old, i) => (i === index ? text : old)));
    };

    const exportGif = async () => {
        setExportState({ status: "exporting", done: 0, total: plan.frames });
        try {
            const gif = await exportBarsGif(bars, background, (done, total) => {
                setExportState({ status: "exporting", done, total });
            });
            downloadBlob(gif, "nalas-bars.gif");
            setExportState({ status: "done", bytes: gif.size });
        } catch (error) {
            console.error("The GIF could not be made:", error);
            setExportState({ status: "error" });
        }
    };

    const columns = {
        "--nalas-bars-width": `${BARS_WIDTH}px`,
        "--nalas-bars-padding": `${BARS_LAYOUT.padding}px`,
        "--nalas-bars-gap": `${BARS_LAYOUT.columnGap}px`,
    } as CSSProperties;

    return (
        <div className="nalas-bars-view" style={columns}>
            <div>
                <h1>Nala&apos;s Bars</h1>
                <p className="nalas-bars-intro">
                    Edit the labels and set each bar&apos;s speed in beats per minute: the white rises and falls once per
                    beat, and 0 stands still. Fill sets how far up the white goes, from 0 to 100. It moves just as fast with
                    less fill, then rests until the next beat. Wobble sets how much the bar bounces as the white turns at the
                    top, from 1 to 100.
                    Export GIF saves the labels and bars exactly as shown, as a GIF that loops perfectly.
                </p>
            </div>

            <div className="nalas-bars-stage">
                <canvas
                    ref={canvasRef}
                    className="nalas-bars-canvas"
                    width={BARS_WIDTH * BARS_SCALE}
                    height={BARS_HEIGHT * BARS_SCALE}
                    role="img"
                    aria-label={`Bouncing bars: ${labels.join(", ")}`}
                />
                <div className="nalas-bars-controls">
                    {labels.map((label, index) => (
                        <div key={index} className="nalas-bars-column">
                            <input
                                type="text"
                                value={label}
                                maxLength={20}
                                aria-label={`Bar ${index + 1} label`}
                                onChange={event => setLabel(index, event.target.value)}
                            />
                            <label className="nalas-bars-field">
                                <span>BPM</span>
                                <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={bpmTexts[index]}
                                    aria-label={`Bar ${index + 1} beats per minute`}
                                    onChange={event => setBpmText(index, event.target.value)}
                                    onBlur={() => setBpmText(index, String(clampBpm(Number(bpmTexts[index]))))}
                                />
                            </label>
                            <label className="nalas-bars-field">
                                <span>Fill</span>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={depthTexts[index]}
                                    aria-label={`Bar ${index + 1} fill, how far up the white goes`}
                                    onChange={event => setDepthText(index, event.target.value)}
                                    onBlur={() => setDepthText(index, String(clampPercent(Number(depthTexts[index]))))}
                                />
                            </label>
                            <label className="nalas-bars-field">
                                <span>Wobble</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    step={1}
                                    value={wobbleTexts[index]}
                                    aria-label={`Bar ${index + 1} wobble`}
                                    onChange={event => setWobbleText(index, event.target.value)}
                                    onBlur={() => setWobbleText(index, String(clampWobble(Number(wobbleTexts[index]))))}
                                />
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="nalas-bars-actions">
                <button type="button" onClick={() => setRunning(current => !current)}>
                    {running ? "Pause" : "Play"}
                </button>
                <label className="nalas-bars-background">
                    Background
                    <input type="color" value={background} onChange={event => setBackground(event.target.value)} />
                </label>
                <button type="button" onClick={() => void exportGif()} disabled={exportState.status === "exporting"}>
                    Export GIF
                </button>
            </div>

            <p className="nalas-bars-status" role="status">
                {exportState.status === "exporting" && `Making the GIF… frame ${exportState.done} of ${exportState.total}`}
                {exportState.status === "done" && `Saved nalas-bars.gif (${describeFileSize(exportState.bytes)}).`}
                {exportState.status === "error" && "The GIF couldn't be made in this browser."}
                {exportState.status === "idle" && (
                    <>
                        Loops every {plan.seconds.toFixed(2)} seconds.
                        {plan.largestChange >= 0.05
                            && ` To make every bar end where it started, BPMs are nudged by up to ${plan.largestChange.toFixed(1)}.`}
                    </>
                )}
            </p>
        </div>
    );
}
