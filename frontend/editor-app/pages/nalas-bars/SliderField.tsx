import { useId, useState } from "react";

type NumberBoxProps = {
    id?: string;
    label: string;
    value: number;
    min: number;
    clamp: (value: number) => number;
    onChange: (value: number) => void;
};

/** A number box that can be cleared and retyped, passing on each valid value as it's typed. */
function NumberBox({ id, label, value, min, clamp, onChange }: NumberBoxProps) {
    // What's being typed. Null shows the value.
    const [draft, setDraft] = useState<string | null>(null);

    return (
        <input
            id={id}
            type="number"
            className="nalas-slider-number"
            aria-label={label}
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
    );
}

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
            <NumberBox label={`${caption}, exact value`} value={value} min={min} clamp={clamp} onChange={onChange} />
        </div>
    );
}

type NumberFieldProps = {
    caption: string;
    value: number;
    min: number;
    clamp: (value: number) => number;
    onChange: (value: number) => void;
};

/** Just a number box, for settings typed rather than slid. */
export function NumberField({ caption, value, min, clamp, onChange }: NumberFieldProps) {
    const id = useId();

    return (
        <div className="nalas-number-field">
            <label htmlFor={id}>{caption}</label>
            <NumberBox id={id} label={caption} value={value} min={min} clamp={clamp} onChange={onChange} />
        </div>
    );
}
