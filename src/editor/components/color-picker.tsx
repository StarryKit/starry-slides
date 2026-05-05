import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "../lib/utils";
import { Input } from "./ui/input";

const SWATCHES = [
  "#0F172A",
  "#FFFFFF",
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#EAB308",
  "#84CC16",
  "#10B981",
  "#06B6D4",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
];

const GRADIENTS = [
  "linear-gradient(135deg,#a855f7,#ec4899)",
  "linear-gradient(135deg,#06b6d4,#8b5cf6)",
  "linear-gradient(135deg,#f59e0b,#ec4899)",
  "linear-gradient(135deg,#10b981,#06b6d4)",
  "linear-gradient(135deg,#f97316,#ef4444)",
  "linear-gradient(135deg,#8b5cf6,#3b82f6)",
];

interface ColorPickerProps {
  value: string;
  includeGradients?: boolean;
  onChange: (value: string) => void;
}

function ColorPicker({ value, includeGradients = true, onChange }: ColorPickerProps) {
  const spectrumRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const hsv = useMemo(() => hexToHsv(value), [value]);
  const normalizedHex = hsvToHex(hsv);
  const [hexInput, setHexInput] = useState(normalizedHex.replace("#", ""));
  const hueColor = `hsl(${hsv.h}, 100%, 50%)`;

  useEffect(() => {
    setHexInput(normalizedHex.replace("#", ""));
  }, [normalizedHex]);

  function updateFromSpectrum(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = spectrumRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);

    const saturation = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const brightness = clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1);
    onChange(hsvToHex({ ...hsv, s: saturation, v: brightness }));
  }

  function updateFromHue(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = hueRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);

    const hue = Math.round(clamp((event.clientX - rect.left) / rect.width, 0, 1) * 360);
    onChange(hsvToHex({ ...hsv, h: hue === 360 ? 0 : hue }));
  }

  return (
    <div className="grid gap-3">
      <div
        className="relative h-36 w-full touch-none select-none overflow-hidden rounded-xl border-0 before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(to_top,#000,transparent),linear-gradient(to_right,#fff,transparent)] before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        ref={spectrumRef}
        role="slider"
        aria-label="Color saturation and brightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.v * 100)}
        aria-valuetext={normalizedHex}
        tabIndex={0}
        style={{ backgroundColor: hueColor }}
        onPointerDown={updateFromSpectrum}
        onPointerMove={(event) => {
          if (event.buttons === 1) {
            updateFromSpectrum(event);
          }
        }}
      >
        <span
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-current shadow-[0_2px_8px_rgba(0,0,0,0.22)]"
          aria-hidden="true"
          style={{
            color: normalizedHex,
            left: `calc(${hsv.s * 100}% + ${(0.5 - hsv.s) * 22}px)`,
            top: `calc(${(1 - hsv.v) * 100}% + ${(hsv.v - 0.5) * 22}px)`,
          }}
        />
      </div>

      <div
        className="relative h-3 touch-none select-none rounded-full bg-[linear-gradient(to_right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        ref={hueRef}
        role="slider"
        aria-label="Hue"
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={hsv.h}
        tabIndex={0}
        onPointerDown={updateFromHue}
        onPointerMove={(event) => {
          if (event.buttons === 1) {
            updateFromHue(event);
          }
        }}
      >
        <span
          className="pointer-events-none absolute -top-0.5 size-4 -translate-x-1/2 rounded-full border-2 border-white bg-current shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
          aria-hidden="true"
          style={{ color: hueColor, left: `${(hsv.h / 360) * 100}%` }}
        />
      </div>

      <div className="grid grid-cols-[40px_auto_minmax(0,1fr)] items-center gap-2">
        <span
          className="size-10 rounded-md border border-foreground/10 shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
          style={{ background: normalizedHex }}
          aria-hidden="true"
        />
        <span className="font-mono text-sm font-medium leading-none text-foreground/45">#</span>
        <Input
          className="h-8 rounded-md bg-foreground/[0.03] px-2 font-mono text-sm font-medium uppercase"
          type="text"
          value={hexInput}
          spellCheck={false}
          onChange={(event) => {
            const nextValue = event.target.value.replace(/[^0-9a-f]/gi, "").slice(0, 6);
            setHexInput(nextValue);

            if (nextValue.length === 6) {
              onChange(`#${nextValue}`);
            }
          }}
          onBlur={() => {
            setHexInput(normalizedHex.replace("#", ""));
          }}
        />
      </div>

      <section className="grid gap-1.5" aria-label="Preset colors">
        <div className="text-[10px] font-medium uppercase leading-tight tracking-wider text-foreground/40">
          Presets
        </div>
        <div className="grid grid-cols-12 gap-1">
          {SWATCHES.map((color) => (
            <button
              key={color}
              className={cn(
                "aspect-square min-w-0 cursor-pointer rounded-md border border-foreground/10 shadow-[0_1px_4px_rgba(0,0,0,0.08)] transition-[box-shadow,outline-color,border-color] duration-150 hover:border-foreground/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                color.toLowerCase() === value.toLowerCase() &&
                  "shadow-[0_0_0_2px_white,0_0_0_4px_rgba(0,0,0,0.18)]"
              )}
              type="button"
              style={{ background: color }}
              aria-label={`Use ${color}`}
              onClick={() => {
                onChange(color);
              }}
            />
          ))}
        </div>
      </section>

      {includeGradients ? (
        <section className="grid gap-1.5" aria-label="Preset gradients">
          <div className="text-[10px] font-medium uppercase leading-tight tracking-wider text-foreground/40">
            Gradients
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {GRADIENTS.map((gradient) => (
              <button
                key={gradient}
                className={cn(
                  "h-8 cursor-pointer rounded-md border border-foreground/10 shadow-[0_1px_4px_rgba(0,0,0,0.08)] transition-[box-shadow,outline-color,border-color] duration-150 hover:border-foreground/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  gradient === value && "shadow-[0_0_0_2px_white,0_0_0_4px_rgba(0,0,0,0.18)]"
                )}
                type="button"
                style={{ background: gradient }}
                aria-label="Use gradient"
                onClick={() => {
                  onChange(gradient);
                }}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function hexToHsv(value: string) {
  const fallback = { h: 220, s: 0.54, v: 0.5 };
  const match = /^#?([0-9a-f]{6})$/i.exec(value.trim());

  if (!match) {
    return fallback;
  }

  const hex = match[1];
  const red = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const green = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) {
      hue = ((green - blue) / delta) % 6;
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }
  }

  const normalizedHue = Math.round(hue * 60);

  return {
    h: normalizedHue < 0 ? normalizedHue + 360 : normalizedHue,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

function hsvToHex({ h, s, v }: { h: number; s: number; v: number }) {
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const match = v - chroma;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (h < 60) {
    red = chroma;
    green = x;
  } else if (h < 120) {
    red = x;
    green = chroma;
  } else if (h < 180) {
    green = chroma;
    blue = x;
  } else if (h < 240) {
    green = x;
    blue = chroma;
  } else if (h < 300) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  return `#${toHex(red + match)}${toHex(green + match)}${toHex(blue + match)}`.toUpperCase();
}

function toHex(value: number) {
  return Math.round(clamp(value, 0, 1) * 255)
    .toString(16)
    .padStart(2, "0");
}

export { ColorPicker };
