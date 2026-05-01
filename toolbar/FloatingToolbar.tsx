import { cn } from "@/lib/utils";
import {
    AlignCenter, AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignJustify, AlignLeft, AlignRight,
    AlignStartHorizontal,
    AlignStartVertical, ArrowDownToLine, ArrowRight,
    ArrowUpToLine, Bold, ChevronDown, ChevronUp, Circle, Copy, Heart, Hexagon, Image as ImageIcon, Italic,
    Layers, Lock, Minus, Palette, Plus, Shapes, Sparkles,
    Square, Star, Strikethrough, Trash2, Triangle,
    Type, Underline,
    Wand2, Zap,
} from "lucide-react";
import { ReactNode, useEffect, useRef, useState } from "react";
import { ColorPicker } from "./ColorPicker";

export type ElementStyle = {
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  align: "left" | "center" | "right" | "justify";
  fillColor: string;
};

interface FloatingToolbarProps {
  style: ElementStyle;
  onChange: (patch: Partial<ElementStyle>) => void;
  onInsertShape?: (shape: string) => void;
  onAlign?: (a: string) => void;
  onLayer?: (l: string) => void;
  onAnimate?: (a: string) => void;
  onAction?: (a: string) => void;
}

const FONTS = ["Inter", "Plus Jakarta Sans", "Georgia", "Courier New", "Impact", "Palatino"];
const SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 80];
const SWATCHES = [
  "#0F172A", "#FFFFFF", "#EF4444", "#F97316", "#F59E0B", "#10B981",
  "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899", "#64748B", "#A78BFA",
];
const GRADIENTS = [
  "linear-gradient(135deg,#a855f7,#ec4899)",
  "linear-gradient(135deg,#06b6d4,#8b5cf6)",
  "linear-gradient(135deg,#f59e0b,#ec4899)",
  "linear-gradient(135deg,#10b981,#06b6d4)",
  "linear-gradient(135deg,#f97316,#ef4444)",
  "linear-gradient(135deg,#8b5cf6,#3b82f6)",
];
const SHAPES = [
  { id: "rect", icon: Square, label: "矩形" },
  { id: "circle", icon: Circle, label: "圆形" },
  { id: "triangle", icon: Triangle, label: "三角" },
  { id: "star", icon: Star, label: "星形" },
  { id: "hexagon", icon: Hexagon, label: "六边" },
  { id: "arrow", icon: ArrowRight, label: "箭头" },
  { id: "heart", icon: Heart, label: "心形" },
  { id: "image", icon: ImageIcon, label: "图片" },
];
const ANIMATIONS = [
  { id: "fade", label: "淡入", desc: "Fade In", color: "from-violet-500 to-fuchsia-500" },
  { id: "slide", label: "滑入", desc: "Slide Up", color: "from-cyan-500 to-blue-500" },
  { id: "zoom", label: "缩放", desc: "Zoom", color: "from-amber-500 to-pink-500" },
  { id: "bounce", label: "弹跳", desc: "Bounce", color: "from-emerald-500 to-cyan-500" },
  { id: "rotate", label: "旋转", desc: "Spin", color: "from-pink-500 to-orange-500" },
  { id: "blur", label: "模糊", desc: "Blur In", color: "from-indigo-500 to-purple-500" },
];

export function FloatingToolbar(props: FloatingToolbarProps) {
  const { style, onChange } = props;
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const toggle = (k: string) => setOpen(open === k ? null : k);

  return (
    <div ref={ref} className="animate-pop-in">
      <div className="glass shadow-floating rounded-2xl border border-border/60 px-2 py-2 flex items-center gap-1 font-display">
        {/* Font family */}
        <DropdownTrigger active={open === "font"} onClick={() => toggle("font")} className="min-w-[140px] justify-between">
          <span className="flex items-center gap-2 truncate">
            <Type className="w-4 h-4 text-primary" />
            <span className="truncate text-sm">{style.fontFamily}</span>
          </span>
          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
        </DropdownTrigger>

        {/* Size */}
        <div className="flex items-center bg-secondary rounded-xl">
          <IconBtn onClick={() => onChange({ fontSize: Math.max(8, style.fontSize - 2) })} ghost><Minus className="w-3.5 h-3.5" /></IconBtn>
          <DropdownTrigger active={open === "size"} onClick={() => toggle("size")} className="!px-2 !min-w-0 !bg-transparent !shadow-none">
            <span className="text-sm font-semibold tabular-nums w-7 text-center">{style.fontSize}</span>
          </DropdownTrigger>
          <IconBtn onClick={() => onChange({ fontSize: Math.min(200, style.fontSize + 2) })} ghost><Plus className="w-3.5 h-3.5" /></IconBtn>
        </div>

        <Divider />

        {/* Text format */}
        <IconBtn active={style.bold} onClick={() => onChange({ bold: !style.bold })}><Bold className="w-4 h-4" /></IconBtn>
        <IconBtn active={style.italic} onClick={() => onChange({ italic: !style.italic })}><Italic className="w-4 h-4" /></IconBtn>
        <IconBtn active={style.underline} onClick={() => onChange({ underline: !style.underline })}><Underline className="w-4 h-4" /></IconBtn>
        <IconBtn active={style.strike} onClick={() => onChange({ strike: !style.strike })}><Strikethrough className="w-4 h-4" /></IconBtn>

        <Divider />

        {/* Color */}
        <DropdownTrigger active={open === "color"} onClick={() => toggle("color")}>
          <div className="flex items-center gap-1.5">
            <Palette className="w-4 h-4" />
            <span className="w-4 h-4 rounded-md ring-2 ring-white shadow-sm" style={{ background: style.color }} />
          </div>
          <ChevronDown className="w-3 h-3 opacity-60 ml-1" />
        </DropdownTrigger>

        {/* Align */}
        <DropdownTrigger active={open === "align"} onClick={() => toggle("align")}>
          {style.align === "left" && <AlignLeft className="w-4 h-4" />}
          {style.align === "center" && <AlignCenter className="w-4 h-4" />}
          {style.align === "right" && <AlignRight className="w-4 h-4" />}
          {style.align === "justify" && <AlignJustify className="w-4 h-4" />}
          <ChevronDown className="w-3 h-3 opacity-60 ml-1" />
        </DropdownTrigger>

        <Divider />

        {/* Shapes */}
        <DropdownTrigger active={open === "shapes"} onClick={() => toggle("shapes")}>
          <Shapes className="w-4 h-4" />
          <span className="text-sm">形状</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </DropdownTrigger>

        {/* Arrange */}
        <DropdownTrigger active={open === "arrange"} onClick={() => toggle("arrange")}>
          <Layers className="w-4 h-4" />
          <span className="text-sm">排列</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </DropdownTrigger>

        {/* Animate */}
        <DropdownTrigger active={open === "animate"} onClick={() => toggle("animate")} gradient>
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-semibold">动画</span>
          <ChevronDown className="w-3 h-3 opacity-90" />
        </DropdownTrigger>

        <Divider />

        <IconBtn onClick={() => props.onAction?.("duplicate")}><Copy className="w-4 h-4" /></IconBtn>
        <IconBtn onClick={() => props.onAction?.("lock")}><Lock className="w-4 h-4" /></IconBtn>
        <IconBtn onClick={() => props.onAction?.("delete")} danger><Trash2 className="w-4 h-4" /></IconBtn>
      </div>

      {/* Dropdowns */}
      {open === "font" && (
        <Panel>
          <PanelTitle>字体</PanelTitle>
          <div className="space-y-0.5">
            {FONTS.map((f) => (
              <button key={f} onClick={() => { onChange({ fontFamily: f }); setOpen(null); }}
                className={cn("w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-secondary transition-colors flex items-center justify-between",
                  style.fontFamily === f && "bg-gradient-brand-soft")}
                style={{ fontFamily: f }}>
                <span>{f}</span>
                <span className="text-muted-foreground">Aa</span>
              </button>
            ))}
          </div>
        </Panel>
      )}

      {open === "size" && (
        <Panel className="!w-32">
          {SIZES.map((s) => (
            <button key={s} onClick={() => { onChange({ fontSize: s }); setOpen(null); }}
              className={cn("w-full px-3 py-1.5 rounded-lg text-sm hover:bg-secondary transition-colors text-left tabular-nums",
                style.fontSize === s && "bg-gradient-brand-soft font-semibold")}>
              {s}
            </button>
          ))}
        </Panel>
      )}

      {open === "color" && (
        <Panel className="!w-80">
          <PanelTitle>选择颜色</PanelTitle>
          <ColorPicker
            value={style.color}
            onChange={(c) => onChange(c.startsWith("linear") ? { fillColor: c } : { color: c })}
            variant="candy"
          />
        </Panel>
      )}

      {open === "align" && (
        <Panel className="!w-auto">
          <div className="flex gap-1">
            {[
              { v: "left", I: AlignLeft },
              { v: "center", I: AlignCenter },
              { v: "right", I: AlignRight },
              { v: "justify", I: AlignJustify },
            ].map(({ v, I }) => (
              <button key={v} onClick={() => { onChange({ align: v as any }); setOpen(null); }}
                className={cn("p-2.5 rounded-lg hover:bg-secondary transition-colors",
                  style.align === v && "bg-gradient-brand text-white shadow-glow")}>
                <I className="w-4 h-4" />
              </button>
            ))}
          </div>
        </Panel>
      )}

      {open === "shapes" && (
        <Panel className="!w-72">
          <PanelTitle>插入形状</PanelTitle>
          <div className="grid grid-cols-4 gap-2">
            {SHAPES.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => { props.onInsertShape?.(id); setOpen(null); }}
                className="aspect-square rounded-xl bg-secondary hover:bg-gradient-brand-soft transition-all hover:scale-105 flex flex-col items-center justify-center gap-1 group">
                <Icon className="w-5 h-5 text-foreground/70 group-hover:text-primary transition-colors" />
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </button>
            ))}
          </div>
        </Panel>
      )}

      {open === "arrange" && (
        <Panel className="!w-64">
          <PanelTitle>对齐</PanelTitle>
          <div className="grid grid-cols-3 gap-1 mb-4">
            {[
              { v: "left", I: AlignStartHorizontal, t: "左对齐" },
              { v: "hcenter", I: AlignCenterHorizontal, t: "水平居中" },
              { v: "right", I: AlignEndHorizontal, t: "右对齐" },
              { v: "top", I: AlignStartVertical, t: "顶对齐" },
              { v: "vcenter", I: AlignCenterVertical, t: "垂直居中" },
              { v: "bottom", I: AlignEndVertical, t: "底对齐" },
            ].map(({ v, I, t }) => (
              <button key={v} onClick={() => props.onAlign?.(v)} title={t}
                className="aspect-square rounded-lg hover:bg-gradient-brand-soft flex items-center justify-center transition-colors">
                <I className="w-4 h-4" />
              </button>
            ))}
          </div>
          <PanelTitle>图层</PanelTitle>
          <div className="space-y-0.5">
            {[
              { v: "front", I: ArrowUpToLine, t: "置于顶层" },
              { v: "forward", I: ChevronUp, t: "上移一层" },
              { v: "backward", I: ChevronDown, t: "下移一层" },
              { v: "back", I: ArrowDownToLine, t: "置于底层" },
            ].map(({ v, I, t }) => (
              <button key={v} onClick={() => props.onLayer?.(v)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary text-sm transition-colors">
                <I className="w-4 h-4 text-muted-foreground" />
                {t}
              </button>
            ))}
          </div>
        </Panel>
      )}

      {open === "animate" && (
        <Panel className="!w-80">
          <PanelTitle>
            <span className="flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-accent" />
              动画效果
            </span>
          </PanelTitle>
          <div className="grid grid-cols-2 gap-2">
            {ANIMATIONS.map((a) => (
              <button key={a.id} onClick={() => { props.onAnimate?.(a.id); setOpen(null); }}
                className="group relative overflow-hidden rounded-xl p-3 text-left transition-all hover:scale-[1.03]">
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-90", a.color)} />
                <div className="relative">
                  <Zap className="w-4 h-4 text-white mb-2" />
                  <div className="text-white font-semibold text-sm">{a.label}</div>
                  <div className="text-white/80 text-[10px]">{a.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function DropdownTrigger({
  children, active, onClick, className, gradient,
}: { children: ReactNode; active?: boolean; onClick?: () => void; className?: string; gradient?: boolean }) {
  return (
    <button onClick={onClick}
      className={cn(
        "px-2.5 h-9 rounded-xl flex items-center gap-1.5 text-sm transition-all duration-200",
        "hover:bg-secondary",
        active && "bg-secondary shadow-inner",
        gradient && "bg-gradient-brand text-white hover:opacity-95 shadow-glow",
        gradient && active && "bg-gradient-brand text-white",
        className
      )}>
      {children}
    </button>
  );
}

function IconBtn({
  children, onClick, active, ghost, danger,
}: { children: ReactNode; onClick?: () => void; active?: boolean; ghost?: boolean; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className={cn(
        "h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200",
        !ghost && "hover:bg-secondary",
        ghost && "hover:bg-white/60",
        active && "bg-gradient-brand text-white shadow-glow",
        danger && "hover:bg-destructive/10 hover:text-destructive",
      )}>
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-6 bg-border mx-0.5" />;
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(
      "absolute mt-2 w-64 glass rounded-2xl shadow-pop border border-border/60 p-3 animate-fade-in z-50",
      className
    )}>
      {children}
    </div>
  );
}

function PanelTitle({ children }: { children: ReactNode }) {
  return <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">{children}</div>;
}
