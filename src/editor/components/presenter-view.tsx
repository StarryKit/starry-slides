import { Maximize2, Pen, X, Zap } from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PRESENTATION_PEN_COLORS,
  type PresentationTool,
  clampPresentationIndex,
  injectBaseTag,
  planPresentationSlides,
} from "../../core";
import { Button } from "./ui/button";

export interface PresenterViewProps {
  slides: {
    hidden?: boolean;
    id: string;
    width: number;
    height: number;
    htmlSource: string;
    sourceFile?: string;
  }[];
  startSlideId?: string;
  onExit: () => void;
}

function PresenterView({ slides, startSlideId, onExit }: PresenterViewProps) {
  const initialIndex = useMemo(() => {
    const index = slides.findIndex((slide) => slide.id === startSlideId);
    return index >= 0 ? index : 0;
  }, [slides, startSlideId]);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [tool, setTool] = useState<PresentationTool>("none");
  const [penColor, setPenColor] = useState("#F59E0B");
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [paths, setPaths] = useState<Array<{ color: string; points: string }>>([]);
  const [laserPoint, setLaserPoint] = useState({ x: -100, y: -100 });
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [viewportSize, setViewportSize] = useState(() => ({
    height: window.innerHeight,
    width: window.innerWidth,
  }));
  const frameRef = useRef<HTMLDivElement>(null);
  const inkPathRef = useRef<{ color: string; points: string } | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const previousActiveIndexRef = useRef(activeIndex);

  const presentationSlides = useMemo(() => planPresentationSlides(slides), [slides]);

  const activeSlide =
    presentationSlides[Math.min(activeIndex, presentationSlides.length - 1)] ?? null;

  useEffect(() => {
    const nextIndex = presentationSlides.findIndex((slide) => slide.id === startSlideId);
    setActiveIndex(nextIndex >= 0 ? nextIndex : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentationSlides]);

  useEffect(() => {
    const nextIndex = presentationSlides.findIndex((slide) => slide.id === activeSlide?.id);
    if (nextIndex >= 0 && nextIndex !== activeIndex) {
      setActiveIndex(nextIndex);
    }
  }, [activeIndex, activeSlide?.id, presentationSlides]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onResize = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      setViewportSize({
        height: window.innerHeight,
        width: window.innerWidth,
      });
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("fullscreenchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("fullscreenchange", onResize);
    };
  }, []);

  const showToolbar = useCallback(() => {
    setToolbarVisible(true);
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setToolbarVisible(false);
    }, 1500);
  }, []);

  function setMode(nextTool: PresentationTool) {
    setTool((currentTool) => (currentTool === nextTool ? "none" : nextTool));
  }

  const clearInk = useCallback(() => {
    setPaths([]);
    inkPathRef.current = null;
  }, []);

  function goToIndex(nextIndex: number) {
    setTool("none");
    setActiveIndex(clampPresentationIndex(nextIndex, presentationSlides.length));
    clearInk();
  }

  function goNext() {
    goToIndex(activeIndex + 1);
  }

  function toggleFullscreen() {
    const element = document.documentElement;
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
      return;
    }

    if (element.requestFullscreen) {
      void element.requestFullscreen();
    }
  }

  function shouldShowToolbar(event: ReactPointerEvent<HTMLElement>) {
    return event.clientY >= window.innerHeight - 96;
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (shouldShowToolbar(event)) {
      showToolbar();
    }

    if (tool === "laser") {
      setLaserPoint({ x: event.clientX, y: event.clientY });
    }

    if (tool === "pen" && inkPathRef.current) {
      const frame = frameRef.current;
      const rect = frame?.getBoundingClientRect();
      if (frame && rect) {
        const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width) / scale;
        const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height) / scale;
        const nextPath = {
          ...inkPathRef.current,
          points: `${inkPathRef.current.points} L ${x.toFixed(1)} ${y.toFixed(1)}`,
        };
        inkPathRef.current = nextPath;
        setPaths((current) => [...current.slice(0, -1), nextPath]);
      }
    }
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    endInk();

    if (tool !== "none" || !frameRef.current || !(event.target instanceof Node)) {
      return;
    }

    if (!frameRef.current.contains(event.target)) {
      return;
    }

    goNext();
  }

  function beginInk(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      tool !== "pen" ||
      !frameRef.current ||
      !(event.target instanceof Node) ||
      !frameRef.current.contains(event.target)
    ) {
      return;
    }

    const rect = frameRef.current.getBoundingClientRect();
    const isInsideFrame =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (!isInsideFrame) {
      return;
    }

    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width) / scale;
    const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height) / scale;
    const nextPath = {
      color: penColor,
      points: `M ${x.toFixed(1)} ${y.toFixed(1)}`,
    };
    inkPathRef.current = nextPath;
    setPaths((current) => [...current, nextPath]);
  }

  function endInk() {
    inkPathRef.current = null;
  }

  useEffect(() => {
    if (previousActiveIndexRef.current === activeIndex) {
      return;
    }

    previousActiveIndexRef.current = activeIndex;
    clearInk();
  }, [activeIndex, clearInk]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (tool === "pen") {
          setTool("none");
          clearInk();
          showToolbar();
          return;
        }

        onExit();
        return;
      }

      if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === "PageDown") {
        setTool("none");
        setActiveIndex((currentIndex) => Math.min(currentIndex + 1, presentationSlides.length - 1));
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowUp" || event.key === "PageUp") {
        setTool("none");
        setActiveIndex((currentIndex) => Math.max(currentIndex - 1, 0));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clearInk, onExit, presentationSlides.length, showToolbar, tool]);

  useEffect(() => {
    if (!activeSlide) {
      return;
    }

    const iframe = frameRef.current?.querySelector<HTMLIFrameElement>(
      "[data-testid='presenter-slide-iframe']"
    );
    if (iframe) {
      iframe.srcdoc = injectBaseTag(activeSlide.htmlSource, activeSlide.sourceFile);
    }
  }, [activeSlide]);

  if (!activeSlide) {
    return null;
  }

  const scale = Math.min(
    viewportSize.width / activeSlide.width,
    viewportSize.height / activeSlide.height
  );
  const frameWidth = Math.max(320, Math.floor(activeSlide.width * scale));
  const frameHeight = Math.max(240, Math.floor(activeSlide.height * scale));
  const penCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='6' fill='${encodeURIComponent(
    penColor
  )}' stroke='%23111827' stroke-width='2'/%3E%3C/svg%3E") 12 12, auto`;
  const cursor = tool === "laser" ? "none" : tool === "pen" ? penCursor : "default";

  return (
    <main
      className="fixed inset-0 z-50 overflow-hidden bg-[#111]"
      data-testid="presenter-view"
      style={{ cursor }}
      onPointerMove={handlePointerMove}
      onPointerDown={beginInk}
      onPointerUp={handlePointerUp}
      onPointerLeave={endInk}
    >
      <div
        ref={frameRef}
        className="absolute left-1/2 top-1/2 overflow-hidden bg-white shadow-[0_18px_70px_rgba(0,0,0,0.42)]"
        data-testid="presenter-slide-frame"
        style={{
          width: `${frameWidth}px`,
          height: `${frameHeight}px`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <iframe
          title="Presented slide"
          className="pointer-events-none block border-0 bg-white"
          data-testid="presenter-slide-iframe"
          style={{
            width: `${activeSlide.width}px`,
            height: `${activeSlide.height}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          data-testid="presenter-ink-layer"
          aria-hidden="true"
          viewBox={`0 0 ${activeSlide.width} ${activeSlide.height}`}
        >
          {paths.map((path, index) => (
            <path
              key={`${path.color}-${index}`}
              d={path.points}
              fill="none"
              stroke={path.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={4}
            />
          ))}
        </svg>
      </div>
      <div
        className="pointer-events-none fixed left-0 top-0 size-4 rounded-full bg-[#f7ff2a] shadow-[0_0_0_1px_rgba(17,24,39,0.85),0_0_14px_rgba(247,255,42,0.9),0_0_24px_rgba(34,211,238,0.65)]"
        data-testid="presenter-laser-cursor"
        style={{
          opacity: tool === "laser" ? 1 : 0,
          transform: `translate(${laserPoint.x}px, ${laserPoint.y}px) translate(-50%, -50%)`,
        }}
      />
      {tool === "pen" ? (
        <div
          className="absolute bottom-[78px] left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-md border border-white/15 bg-[#111]/90 px-2 py-2 shadow-[0_14px_44px_rgba(0,0,0,0.32)] backdrop-blur-lg"
          data-testid="presenter-pen-colors"
          aria-label="Pen colors"
        >
          {PRESENTATION_PEN_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Use pen color ${color}`}
              className="size-7 rounded-full border border-white/25 shadow-[0_0_0_1px_rgba(0,0,0,0.25)] transition-transform hover:scale-105"
              style={{
                background: color,
                outline: penColor === color ? "2px solid rgba(255,255,255,0.9)" : "none",
                outlineOffset: "2px",
              }}
              onClick={() => setPenColor(color)}
            />
          ))}
        </div>
      ) : null}
      <nav
        className="absolute bottom-6 left-1/2 z-20 flex h-11 -translate-x-1/2 items-center gap-2 rounded-md border border-white/15 bg-[#111]/90 px-2 py-1.5 text-white shadow-[0_18px_52px_rgba(0,0,0,0.38)] backdrop-blur-lg transition-[opacity,transform] duration-150 data-[visible=false]:translate-y-3 data-[visible=false]:opacity-0 data-[visible=false]:pointer-events-none"
        data-testid="presenter-toolbar"
        data-visible={toolbarVisible ? "true" : "false"}
        onPointerEnter={showToolbar}
        onPointerMove={showToolbar}
      >
        <Button
          variant="ghost"
          size="sm"
          aria-label="Previous slide"
          className="h-8 px-2.5 text-white/80 hover:text-white"
          onClick={() => goToIndex(activeIndex - 1)}
          disabled={activeIndex === 0}
        >
          Prev
        </Button>
        <span className="min-w-14 text-center text-[12px] font-semibold text-white/80">
          {activeIndex + 1} / {presentationSlides.length}
        </span>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Next slide"
          className="h-8 px-2.5 text-white/80 hover:text-white"
          onClick={() => goToIndex(activeIndex + 1)}
          disabled={activeIndex >= presentationSlides.length - 1}
        >
          Next
        </Button>
        <span className="h-5 w-px bg-white/15" />
        <Button
          variant={tool === "laser" ? "secondary" : "ghost"}
          size="sm"
          aria-label="Laser pointer"
          className="h-8 px-2.5 text-white/80 hover:text-white"
          onClick={() => setMode("laser")}
          aria-pressed={tool === "laser"}
        >
          <Zap className="size-3.5" />
          Laser
        </Button>
        <Button
          variant={tool === "pen" ? "secondary" : "ghost"}
          size="sm"
          aria-label="Pen"
          className="h-8 px-2.5 text-white/80 hover:text-white"
          onClick={() => setMode("pen")}
          aria-pressed={tool === "pen"}
        >
          <Pen className="size-3.5" />
          Pen
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          className="h-8 px-2.5 text-white/80 hover:text-white"
          onClick={toggleFullscreen}
        >
          <Maximize2 className="size-3.5" />
          {isFullscreen ? "Window" : "Fullscreen"}
        </Button>
        <span className="h-5 w-px bg-white/15" />
        <Button
          variant="ghost"
          size="sm"
          aria-label="Exit presentation"
          className="h-8 px-2.5 text-white/80 hover:text-white"
          onClick={onExit}
        >
          <X className="size-3.5" />
          Exit
        </Button>
      </nav>
    </main>
  );
}

export { PresenterView };
