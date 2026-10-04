import { useId, useState } from "react";

type SliderFieldProps = {
    caption: string;
    value: number;
    min: number;
    /** The slider's end. The number box can go further if `clamp` allows. */
    max: number;
    clamp: (value: number) => number;
    onChange: (value: number) => void;
};

/** A slider with a number box beside it, for exact values. */
export function SliderField({ caption, value, min, max, clamp, onChange }: SliderFieldProps) {
    const id = useId();
    // What's being typed, so a box can be cleared and retyped. Null shows the value.
    const [draft, setDraft] = useState<string | null>(null);

    return (
        <div className="nalas-slider">
            <label htmlFor={id}>{caption}</label>
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                step={1}
                value={Math.max(min, Math.min(max, value))}
                onChange={event => onChange(clamp(Number(event.target.value)))}
            />
            <input
                type="number"
                className="nalas-slider-number"
                aria-label={`${caption}, exact value`}
                min={min}
                step={1}
                value={draft ?? String(value)}
                onFocus={() => setDraft(String(value))}
                onChange={event => {
                    setDraft(event.target.value);
                    const typed = Number(event.target.value);
                    if (event.target.value.trim() !== "" && Number.isFinite(typed)) onChange(clamp(typed));
                }}
                onBlur={() => setDraft(null)}
                onKeyDown={event => {
                    if (event.key === "Enter") event.currentTarget.blur();
                }}
            />
        </div>
    );
}
