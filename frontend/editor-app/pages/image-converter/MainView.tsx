import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";

import {
    describeFileSize,
    F_LIST_MAX_IMAGE_SIDE,
    ImageConversionError,
    isSupportedImageFile,
    SUPPORTED_IMAGE_EXTENSIONS,
} from "../../models/ImageConversion";
import type { ImageSize } from "../../models/ImageConversion";
import { convertForFList } from "../../services/ImageConverter";
import type { ConvertedImage } from "../../services/ImageConverter";
import { downloadBlob } from "../../utilities/Download";

type Conversion = {
    id: number;
    file: File;
    /** Whether "Enlarge smaller images" was on when it was added. */
    enlarge: boolean;
    status: "waiting" | "converting" | "done" | "error";
    /** The size being tried while it shrinks to fit. */
    attempt?: ImageSize;
    result?: ConvertedImage;
    /** Preview and download address for the result. */
    url?: string;
    message?: string;
};

const ACCEPT = SUPPORTED_IMAGE_EXTENSIONS.join(",");
const ENLARGE_STORAGE_KEY = "f-list-profile-editor:image-enlarge:v1";

function loadEnlarge(): boolean {
    try {
        return window.localStorage.getItem(ENLARGE_STORAGE_KEY) === "on";
    } catch {
        return false;
    }
}

function saveEnlarge(enlarge: boolean) {
    try {
        window.localStorage.setItem(ENLARGE_STORAGE_KEY, enlarge ? "on" : "off");
    } catch {
        // Without storage the checkbox still works, it's just not remembered.
    }
}

function describeSize(size: ImageSize) {
    return `${size.width} × ${size.height}`;
}

function describeStatus(item: Conversion) {
    switch (item.status) {
        case "waiting":
            return "Waiting…";
        case "converting":
            return item.attempt ? `Converting at ${describeSize(item.attempt)}…` : "Reading…";
        case "error":
            return item.message;
        case "done": {
            const { original, size, blob } = item.result!;
            return `${describeSize(original)}, ${describeFileSize(item.file.size)} → ${describeSize(size)}, ${describeFileSize(blob.size)}`;
        }
    }
}

export default function ImageConverterMainView() {
    const [items, setItems] = useState<Conversion[]>([]);
    const [dragging, setDragging] = useState(false);
    const [enlarge, setEnlarge] = useState(loadEnlarge);
    const inputRef = useRef<HTMLInputElement>(null);
    const nextId = useRef(1);
    const queue = useRef<Conversion[]>([]);
    const running = useRef(false);
    const mounted = useRef(true);
    const urls = useRef(new Set<string>());

    const update = useCallback((id: number, changes: Partial<Conversion>) => {
        setItems(current => current.map(item => (item.id === id ? { ...item, ...changes } : item)));
    }, []);

    // One at a time: several 8000-pixel images at once can run a browser out of memory.
    const runQueue = useCallback(async () => {
        if (running.current) return;
        running.current = true;
        try {
            let next = queue.current.shift();
            while (next) {
                const { id, file, enlarge: grow } = next;
                update(id, { status: "converting" });
                try {
                    const result = await convertForFList(file, {
                        enlarge: grow,
                        onAttempt: attempt => update(id, { attempt }),
                    });
                    if (!mounted.current) return;
                    const url = URL.createObjectURL(result.blob);
                    urls.current.add(url);
                    update(id, { status: "done", result, url });
                } catch (error) {
                    console.error(`Converting ${file.name} failed:`, error);
                    update(id, {
                        status: "error",
                        message: error instanceof ImageConversionError
                            ? error.message
                            : "Something went wrong converting this image.",
                    });
                }
                next = queue.current.shift();
            }
        } finally {
            running.current = false;
        }
    }, [update]);

    useEffect(() => {
        const created = urls.current;
        mounted.current = true;
        return () => {
            mounted.current = false;
            queue.current = [];
            created.forEach(url => URL.revokeObjectURL(url));
            created.clear();
        };
    }, []);

    const addFiles = (files: Iterable<File>) => {
        const added = [...files].map((file): Conversion => (
            isSupportedImageFile(file.name)
                ? { id: nextId.current++, file, enlarge, status: "waiting" }
                : {
                    id: nextId.current++,
                    file,
                    enlarge,
                    status: "error",
                    message: "Not an image this can convert. Use PNG, JPG, WebP, BMP or TIFF.",
                }
        ));
        if (added.length === 0) return;
        setItems(current => [...current, ...added]);
        queue.current.push(...added.filter(item => item.status === "waiting"));
        void runQueue();
    };

    const remove = (item: Conversion) => {
        queue.current = queue.current.filter(queued => queued.id !== item.id);
        if (item.url) {
            URL.revokeObjectURL(item.url);
            urls.current.delete(item.url);
        }
        setItems(current => current.filter(other => other.id !== item.id));
    };

    const clearFinished = () => {
        items.filter(item => item.status === "done" || item.status === "error").forEach(remove);
    };

    const onDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDragging(false);
        addFiles(event.dataTransfer.files);
    };

    const finished = items.filter(item => item.status === "done");

    return (
        <div className="image-converter-view">
            <div>
                <h1>Image Converter</h1>
                <p className="image-converter-intro">
                    Makes images fit F-list&apos;s upload limits: at most {F_LIST_MAX_IMAGE_SIDE} × {F_LIST_MAX_IMAGE_SIDE} pixels
                    and under 8 MB, saved as PNG with any transparency kept. Images are converted in your
                    browser and never uploaded.
                </p>
            </div>

            <label className="image-converter-option">
                <input
                    type="checkbox"
                    checked={enlarge}
                    onChange={event => {
                        setEnlarge(event.target.checked);
                        saveEnlarge(event.target.checked);
                    }}
                />
                <span>
                    Enlarge smaller images until their longer side is {F_LIST_MAX_IMAGE_SIDE} pixels, keeping
                    their shape. Applies to images you add after ticking it.
                </span>
            </label>

            <div
                className={`image-converter-drop${dragging ? " is-dragging" : ""}`}
                onDragOver={event => {
                    event.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
            >
                <p>Drop images here, or</p>
                <button type="button" onClick={() => inputRef.current?.click()}>Choose images</button>
                <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPT}
                    multiple
                    hidden
                    onChange={event => {
                        addFiles(event.target.files ?? []);
                        event.target.value = "";
                    }}
                />
                <p className="image-converter-hint">PNG, JPG, WebP, BMP or TIFF</p>
            </div>

            {items.length > 0 && (
                <section className="image-converter-results" aria-label="Converted images">
                    <header className="image-converter-results-header">
                        <h2>Images</h2>
                        <div className="image-converter-actions">
                            {finished.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => finished.forEach(item => downloadBlob(item.result!.blob, item.result!.name))}
                                >
                                    Download all
                                </button>
                            )}
                            <button type="button" onClick={clearFinished}>Clear finished</button>
                        </div>
                    </header>
                    <ul className="image-converter-list">
                        {items.map(item => (
                            <li key={item.id} className={`image-converter-item is-${item.status}`}>
                                <div className="image-converter-preview">
                                    {item.url && <img src={item.url} alt="" />}
                                </div>
                                <div className="image-converter-details">
                                    <span className="image-converter-name">{item.file.name}</span>
                                    <span className="image-converter-status" role={item.status === "error" ? "alert" : undefined}>
                                        {describeStatus(item)}
                                    </span>
                                </div>
                                <div className="image-converter-actions">
                                    {item.status === "done" && (
                                        <button type="button" onClick={() => downloadBlob(item.result!.blob, item.result!.name)}>
                                            Download
                                        </button>
                                    )}
                                    {item.status !== "converting" && (
                                        <button type="button" onClick={() => remove(item)} aria-label={`Remove ${item.file.name}`}>
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
