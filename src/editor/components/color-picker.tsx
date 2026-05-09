import {
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "../lib/utils";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

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
  ariaLabelPrefix?: string;
  value: string;
  includeGradients?: boolean;
  includeOpacity?: boolean;
  onChange: (value: string) => void;
  onCommit?: () => void;
}

function ColorPicker({
  ariaLabelPrefix,
  value,
  includeGradients = true,
  includeOpacity = true,
  onChange,
  onCommit,
}: ColorPickerProps) {
  const spectrumRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const parsedColor = useMemo(() => parseColorValue(value), [value]);
  const parsedGradient = useMemo(() => parseGradientValue(value), [value]);
  const hsv = useMemo(() => hexToHsv(parsedColor.hex), [parsedColor.hex]);
  const normalizedHex = expandHex(parsedColor.hex);
  const [hexInput, setHexInput] = useState(normalizedHex.replace("#", ""));
  const [gradientStart, setGradientStart] = useState(parsedGradient?.start ?? "#06B6D4");
  const [gradientEnd, setGradientEnd] = useState(parsedGradient?.end ?? "#8B5CF6");
  const [gradientAngle, setGradientAngle] = useState(parsedGradient?.angle ?? 135);
  const [activeTab, setActiveTab] = useState(parsedGradient ? "gradient" : "color");
  const hueColor = `hsl(${hsv.h}, 100%, 50%)`;
  const colorPanel = (
    <div className="grid gap-3">
      <div
        className="relative h-36 w-full touch-none select-none overflow-hidden rounded-xl border-0 before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(to_top,#000,transparent),linear-gradient(to_right,#fff,transparent)] before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        ref={spectrumRef}
        role="slider"
        aria-label="Color saturation and brightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.v * 100)}
        aria-valuetext={formatColorValue(normalizedHex, parsedColor.alpha)}
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
          style={{ background: formatColorValue(normalizedHex, parsedColor.alpha) }}
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
              commitColor(`#${nextValue}`);
            }
          }}
          onBlur={() => {
            setHexInput(normalizedHex.replace("#", ""));
          }}
        />
      </div>

      {includeOpacity ? (
        <section className="grid gap-1.5" aria-label="Opacity">
          <div className="flex items-center justify-between text-[10px] font-medium uppercase leading-tight tracking-wider text-foreground/40">
            <span>Opacity</span>
            <span>{Math.round(parsedColor.alpha * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(parsedColor.alpha * 100)}
            aria-label="Opacity"
            onChange={updateOpacity}
            className="h-2 w-full cursor-pointer accent-foreground"
          />
        </section>
      ) : null}

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
                color.toLowerCase() === normalizedHex.toLowerCase() &&
                  "shadow-[0_0_0_2px_white,0_0_0_4px_rgba(0,0,0,0.18)]"
              )}
              type="button"
              style={{ background: color }}
              aria-label={ariaLabelPrefix ? `Use ${ariaLabelPrefix} ${color}` : `Use ${color}`}
              onClick={() => {
                commitColor(color);
                onCommit?.();
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );

  const gradientPanel = includeGradients ? (
    <section className="grid gap-2" aria-label="Preset gradients">
      <div className="grid grid-cols-6 gap-1.5">
        {GRADIENTS.map((gradient, index) => (
          <button
            key={gradient}
            className={cn(
              "h-8 cursor-pointer rounded-md border border-foreground/10 shadow-[0_1px_4px_rgba(0,0,0,0.08)] transition-[box-shadow,outline-color,border-color] duration-150 hover:border-foreground/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              gradient === value && "shadow-[0_0_0_2px_white,0_0_0_4px_rgba(0,0,0,0.18)]"
            )}
            type="button"
            style={{ background: gradient }}
            aria-label={
              ariaLabelPrefix
                ? `Use ${ariaLabelPrefix} gradient ${index + 1}`
                : `Use gradient ${index + 1}`
            }
            onClick={() => {
              const nextGradient = parseGradientValue(gradient);
              if (nextGradient) {
                setGradientAngle(nextGradient.angle);
                setGradientStart(nextGradient.start);
                setGradientEnd(nextGradient.end);
              }
              commitGradient(nextGradient ?? undefined);
              onCommit?.();
            }}
          />
        ))}
      </div>
      <div className="grid gap-2 rounded-md bg-foreground/[0.03] p-2">
        <div
          className="h-8 rounded-md border border-foreground/10"
          style={{ background: createGradientValue(gradientAngle, gradientStart, gradientEnd) }}
          aria-hidden="true"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            className="h-8 rounded-md bg-white px-2 font-mono text-xs uppercase"
            aria-label="Gradient start"
            value={gradientStart.replace("#", "")}
            onChange={(event) => updateGradientColor("start", event.target.value)}
            onBlur={() => setGradientStart(expandHex(gradientStart))}
          />
          <Input
            className="h-8 rounded-md bg-white px-2 font-mono text-xs uppercase"
            aria-label="Gradient end"
            value={gradientEnd.replace("#", "")}
            onChange={(event) => updateGradientColor("end", event.target.value)}
            onBlur={() => setGradientEnd(expandHex(gradientEnd))}
          />
        </div>
        <div className="grid gap-1">
          <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-foreground/40">
            <span>Angle</span>
            <span>{gradientAngle}deg</span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            value={gradientAngle}
            aria-label="Gradient angle"
            onChange={(event) => {
              const nextAngle = Number.parseInt(event.target.value, 10);
              setGradientAngle(nextAngle);
              commitGradient({ angle: nextAngle });
            }}
            className="h-2 w-full cursor-pointer accent-foreground"
          />
        </div>
      </div>
    </section>
  ) : null;

  useEffect(() => {
    setHexInput(normalizedHex.replace("#", ""));
  }, [normalizedHex]);

  useEffect(() => {
    if (!parsedGradient) {
      return;
    }

    setGradientAngle(parsedGradient.angle);
    setGradientStart(parsedGradient.start);
    setGradientEnd(parsedGradient.end);
    setActiveTab("gradient");
  }, [parsedGradient]);

  function commitColor(nextHex: string, nextAlpha = includeOpacity ? parsedColor.alpha : 1) {
    onChange(formatColorValue(nextHex, nextAlpha));
  }

  function updateOpacity(event: ChangeEvent<HTMLInputElement>) {
    const alpha = Number.parseInt(event.target.value, 10) / 100;
    commitColor(normalizedHex, alpha);
  }

  function commitGradient(overrides: Partial<{ angle: number; start: string; end: string }> = {}) {
    onChange(
      createGradientValue(
        overrides.angle ?? gradientAngle,
        overrides.start ?? gradientStart,
        overrides.end ?? gradientEnd
      )
    );
  }

  function updateGradientColor(target: "start" | "end", rawValue: string) {
    const nextValue = `#${rawValue.replace(/[^0-9a-f]/gi, "").slice(0, 6)}`;
    if (target === "start") {
      setGradientStart(nextValue);
    } else {
      setGradientEnd(nextValue);
    }

    if (nextValue.length === 7) {
      commitGradient({ [target]: expandHex(nextValue) });
    }
  }

  function updateFromSpectrum(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = spectrumRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);

    const saturation = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const brightness = clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1);
    commitColor(hsvToHex({ ...hsv, s: saturation, v: brightness }));
  }

  function updateFromHue(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = hueRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);

    const hue = Math.round(clamp((event.clientX - rect.left) / rect.width, 0, 1) * 360);
    commitColor(hsvToHex({ ...hsv, h: hue === 360 ? 0 : hue }));
  }

  if (!includeGradients) {
    return colorPanel;
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-3">
      <TabsList className="grid w-full grid-cols-2" aria-label="Color picker mode">
        <TabsTrigger value="color">Color</TabsTrigger>
        <TabsTrigger value="gradient">Gradient</TabsTrigger>
      </TabsList>
      <TabsContent value="color" className="mt-0">
        {colorPanel}
      </TabsContent>
      <TabsContent value="gradient" className="mt-0">
        {gradientPanel}
      </TabsContent>
    </Tabs>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseColorValue(value: string) {
  const rgbaMatch = value
    .trim()
    .match(/^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:[\s,/]+([\d.]+))?\s*\)$/i);
  if (rgbaMatch) {
    return {
      alpha: clamp(Number.parseFloat(rgbaMatch[4] ?? "1"), 0, 1),
      hex: `#${toHexChannel(rgbaMatch[1] || "0")}${toHexChannel(
        rgbaMatch[2] || "0"
      )}${toHexChannel(rgbaMatch[3] || "0")}`,
    };
  }

  return {
    alpha: 1,
    hex: isHexColor(value) ? value.trim() : "#0F172A",
  };
}

function formatColorValue(hex: string, alpha: number) {
  if (alpha >= 0.995) {
    return hex.toUpperCase();
  }

  const normalizedHex = expandHex(hex).replace("#", "");
  const red = Number.parseInt(normalizedHex.slice(0, 2), 16);
  const green = Number.parseInt(normalizedHex.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedHex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${Math.round(alpha * 100) / 100})`;
}

function createGradientValue(angle: number, start: string, end: string) {
  return `linear-gradient(${angle}deg, ${expandHex(start)}, ${expandHex(end)})`;
}

function parseGradientValue(value: string): { angle: number; start: string; end: string } | null {
  const trimmedValue = value.trim();
  if (!trimmedValue.toLowerCase().startsWith("linear-gradient(") || !trimmedValue.endsWith(")")) {
    return null;
  }

  const content = trimmedValue.slice(trimmedValue.indexOf("(") + 1, -1);
  const parts = splitCssFunctionArguments(content);
  if (parts.length < 3) {
    return null;
  }

  const angle = Number.parseFloat(parts[0] ?? "");
  const start = parseColorValue(parts[1] ?? "").hex;
  const end = parseColorValue(parts[2] ?? "").hex;
  return {
    angle: Number.isFinite(angle) ? clamp(Math.round(angle), 0, 360) : 135,
    start: expandHex(start),
    end: expandHex(end),
  };
}

function splitCssFunctionArguments(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let partStart = 0;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth = Math.max(0, depth - 1);
    } else if (character === "," && depth === 0) {
      parts.push(value.slice(partStart, index).trim());
      partStart = index + 1;
    }
  }

  parts.push(value.slice(partStart).trim());
  return parts;
}

function isHexColor(value: string): boolean {
  return /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

function expandHex(value: string): string {
  const normalized = value.trim().replace("#", "");
  if (normalized.length === 3) {
    return `#${normalized
      .split("")
      .map((character) => character + character)
      .join("")}`.toUpperCase();
  }
  if (normalized.length === 6) {
    return `#${normalized}`.toUpperCase();
  }
  return "#0F172A";
}

function hexToHsv(value: string) {
  const fallback = { h: 220, s: 0.54, v: 0.5 };
  const match = /^#?([0-9a-f]{6})$/i.exec(expandHex(value));

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

function toHexChannel(value: string): string {
  const numericValue = Math.max(0, Math.min(255, Number.parseInt(value, 10) || 0));
  return numericValue.toString(16).padStart(2, "0");
}

export { ColorPicker };
