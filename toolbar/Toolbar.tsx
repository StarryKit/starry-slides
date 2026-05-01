export function MinimalToolbar(p: Props) {
  const { style, onChange } = p;
  const { open, setOpen, ref, toggle } = useDropdown();

  const Btn = ({ children, active, onClick, className }: any) => (
    <button onClick={onClick}
      className={cn(
        "h-8 min-w-8 px-2 rounded-md flex items-center justify-center gap-1 text-[13px] text-foreground/70",
        "hover:bg-foreground/[0.04] hover:text-foreground transition-colors",
        active && "bg-foreground/[0.06] text-foreground",
        className
      )}>{children}</button>
  );

  return (
    <div ref={ref} className="animate-fade-in">
      <div className="bg-white rounded-xl border border-foreground/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.06)] px-1.5 py-1.5 flex items-center gap-0.5">
        <Btn onClick={() => toggle("font")} active={open === "font"} className="!min-w-[120px] !justify-between">
          <span className="truncate">{style.fontFamily}</span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Btn>
        <Btn onClick={() => toggle("size")} active={open === "size"} className="!min-w-[52px] !justify-between">
          <span className="tabular-nums">{style.fontSize}</span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Btn>

        <div className="w-px h-4 bg-foreground/10 mx-1" />

        <Btn active={style.bold} onClick={() => onChange({ bold: !style.bold })}><Bold className="w-3.5 h-3.5" /></Btn>
        <Btn active={style.italic} onClick={() => onChange({ italic: !style.italic })}><Italic className="w-3.5 h-3.5" /></Btn>
        <Btn active={style.underline} onClick={() => onChange({ underline: !style.underline })}><Underline className="w-3.5 h-3.5" /></Btn>
        <Btn active={style.strike} onClick={() => onChange({ strike: !style.strike })}><Strikethrough className="w-3.5 h-3.5" /></Btn>

        <div className="w-px h-4 bg-foreground/10 mx-1" />

        <Btn onClick={() => toggle("color")} active={open === "color"}>
          <span className="w-3.5 h-3.5 rounded-sm border border-foreground/10" style={{ background: style.color }} />
        </Btn>
        <Btn onClick={() => toggle("align")} active={open === "align"}>
          {style.align === "left" && <AlignLeft className="w-3.5 h-3.5" />}
          {style.align === "center" && <AlignCenter className="w-3.5 h-3.5" />}
          {style.align === "right" && <AlignRight className="w-3.5 h-3.5" />}
          {style.align === "justify" && <AlignJustify className="w-3.5 h-3.5" />}
        </Btn>

        <div className="w-px h-4 bg-foreground/10 mx-1" />

        <Btn onClick={() => toggle("shapes")} active={open === "shapes"}><Shapes className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => toggle("arrange")} active={open === "arrange"}><Layers className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => toggle("animate")} active={open === "animate"}><Sparkles className="w-3.5 h-3.5" /></Btn>

        <div className="w-px h-4 bg-foreground/10 mx-1" />

        <Btn onClick={() => p.onAction?.("duplicate")}><Copy className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => p.onAction?.("delete")} className="hover:!text-destructive"><Trash2 className="w-3.5 h-3.5" /></Btn>
      </div>

      {open && (
        <MinimalPanel>
          {open === "font" && (
            <>
              <PanelLabel>字体</PanelLabel>
              {FONTS.map((f) => (
                <button key={f} onClick={() => { onChange({ fontFamily: f }); setOpen(null); }}
                  style={{ fontFamily: f }}
                  className={cn("w-full text-left px-2.5 py-1.5 rounded-md text-sm hover:bg-foreground/[0.04]",
                    style.fontFamily === f && "bg-foreground/[0.06]")}>
                  {f}
                </button>
              ))}
            </>
          )}
          {open === "size" && SIZES.map((s) => (
            <button key={s} onClick={() => { onChange({ fontSize: s }); setOpen(null); }}
              className={cn("w-full text-left px-2.5 py-1.5 rounded-md text-sm tabular-nums hover:bg-foreground/[0.04]",
                style.fontSize === s && "bg-foreground/[0.06]")}>{s}</button>
          ))}
          {open === "color" && (
            <div className="w-72">
              <ColorPicker value={style.color} variant="minimal"
                onChange={(c) => onChange(c.startsWith("linear") ? { fillColor: c } : { color: c })} />
            </div>
          )}
          {open === "align" && (
            <div className="flex gap-0.5">
              {[{v:"left",I:AlignLeft},{v:"center",I:AlignCenter},{v:"right",I:AlignRight},{v:"justify",I:AlignJustify}].map(({v,I})=>(
                <button key={v} onClick={() => { onChange({ align: v as any }); setOpen(null); }}
                  className={cn("p-2 rounded-md hover:bg-foreground/[0.04]", style.align===v && "bg-foreground/[0.08]")}>
                  <I className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          )}
          {open === "shapes" && (
            <div className="grid grid-cols-4 gap-1 w-56">
              {SHAPES.map(({id,icon:I,label})=>(
                <button key={id} onClick={()=>{p.onInsertShape?.(id);setOpen(null);}}
                  className="aspect-square rounded-md hover:bg-foreground/[0.04] flex flex-col items-center justify-center gap-0.5">
                  <I className="w-4 h-4 text-foreground/60" />
                  <span className="text-[10px] text-foreground/50">{label}</span>
                </button>
              ))}
            </div>
          )}
          {open === "arrange" && (
            <div className="w-56">
              <PanelLabel>对齐</PanelLabel>
              <div className="grid grid-cols-3 gap-0.5 mb-2">
                {[{v:"left",I:AlignStartHorizontal},{v:"hcenter",I:AlignCenterHorizontal},{v:"right",I:AlignEndHorizontal},{v:"top",I:AlignStartVertical},{v:"vcenter",I:AlignCenterVertical},{v:"bottom",I:AlignEndVertical}].map(({v,I})=>(
                  <button key={v} onClick={()=>p.onAlign?.(v)} className="aspect-square rounded-md hover:bg-foreground/[0.04] flex items-center justify-center">
                    <I className="w-3.5 h-3.5 text-foreground/60" />
                  </button>
                ))}
              </div>
              <PanelLabel>图层</PanelLabel>
              {[{v:"front",I:ArrowUpToLine,t:"置顶"},{v:"forward",I:ChevronUp,t:"上移"},{v:"backward",I:ChevronDown,t:"下移"},{v:"back",I:ArrowDownToLine,t:"置底"}].map(({v,I,t})=>(
                <button key={v} onClick={()=>p.onLayer?.(v)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-foreground/[0.04] text-sm">
                  <I className="w-3.5 h-3.5 text-foreground/60" />{t}
                </button>
              ))}
            </div>
          )}
          {open === "animate" && (
            <div className="w-56">
              <PanelLabel>动画</PanelLabel>
              {ANIMATIONS.map(a=>(
                <button key={a} onClick={()=>{p.onAnimate?.(a);setOpen(null);}}
                  className="w-full text-left px-2.5 py-1.5 rounded-md text-sm hover:bg-foreground/[0.04] capitalize">{a}</button>
              ))}
            </div>
          )}
        </MinimalPanel>
      )}
    </div>
  );
}

const MinimalPanel = ({ children }: { children: ReactNode }) => (
  <div className="absolute mt-1.5 bg-white rounded-xl border border-foreground/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.06),0_12px_40px_rgba(0,0,0,0.08)] p-1.5 animate-fade-in z-50 min-w-[180px]">
    {children}
  </div>
);
const PanelLabel = ({ children }: { children: ReactNode }) => (
  <div className="text-[10px] uppercase tracking-wider text-foreground/40 px-2 py-1 font-medium">{children}</div>
);