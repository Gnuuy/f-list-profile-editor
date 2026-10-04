import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { describeFileSize } from "../../models/ImageConversion";
import { clampSpeed, DEFAULT_BARS, planLoop, posesAt } from "../../models/NalasBars";
import type { Bar } from "../../models/NalasBars";
import { BARS_HEIGHT, BARS_LAYOUT, BARS_WIDTH, DEFAULT_BACKGROUND, drawBars } from "../../services/NalasBarsDrawing";
import { exportBarsGif } from "../../services/NalasBarsGif";
import { downloadBlob } from "../../utilities/Download";

type ExportState =
    | { status: "idle" }
    | { status: "exporting"; done: number; total: number }
    | { status: "done"; bytes: number }
    | { status: "error" };

export default function NalasBarsMainView() {
    const [labels, setLabels] = useState(() => DEFAULT_BARS.map(bar => bar.label));
    // Kept as typed, so a speed can be cleared and retyped.
    const [speedTexts, setSpeedTexts] = useState(() => DEFAULT_BARS.map(bar => String(bar.speed)));
    const [background, setBackground] = useState(DEFAULT_BACKGROUND);
    const [running, setRunning] = useState(true);
    const [exportState, setExportState] = useState<ExportState>({ status: "idle" });
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const speedKey = speedTexts.map(text => clampSpeed(Number(text))).join(",");
    const bars = useMemo<Bar[]>(
        () => labels.map((label, index) => ({ label, speed: Number(speedKey.split(",")[index]) })),
        [labels, speedKey],
    );
    const plan = useMemo(() => planLoop(speedKey.split(",").map(Number)), [speedKey]);

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
    const setSpeedText = (index: number, text: string) => {
        setSpeedTexts(current => current.map((old, i) => (i === index ? text : old)));
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
                    Edit the labels and set each bar&apos;s speed from 0 to 100. Bars bounce more and more from 80 to 100.
                    Export GIF saves the labels and bars exactly as shown, as a GIF that loops perfectly.
                </p>
            </div>

            <div className="nalas-bars-stage">
                <canvas
                    ref={canvasRef}
                    className="nalas-bars-canvas"
                    width={BARS_WIDTH}
                    height={BARS_HEIGHT}
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
                            <input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                value={speedTexts[index]}
                                aria-label={`Bar ${index + 1} speed`}
                                onChange={event => setSpeedText(index, event.target.value)}
                                onBlur={() => setSpeedText(index, String(clampSpeed(Number(speedTexts[index]))))}
                            />
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
                            && ` To make every bar end where it started, speeds are nudged by up to ${plan.largestChange.toFixed(1)}.`}
                    </>
                )}
            </p>
        </div>
    );
}
