# Minimal Mono — Design System

> 一份用于复用 **Minimal Mono** 风格的设计规范。核心理念：**克制、灰阶、极小对比、丝滑微交互**。所有组件都应"安静地存在"，靠留白和层级而非颜色取胜。

---

## 1. Design Principles 设计原则

1. **Monochrome First** — 只用 `foreground` 的不同透明度构建层级，禁用品牌彩色。色彩只出现在用户内容里（如填充色），不出现在 chrome 上。
2. **Whisper, don't Shout** — 边框、阴影、文字都比常规弱一档。Hover 才轻微"亮起"。
3. **Tabular & Precise** — 数字一律 `tabular-nums`，标签一律小号大写字母 `tracking-wider`。
4. **Soft Geometry** — 圆角统一，阴影双层（近 + 远），没有任何 neon/glow。
5. **Silent Motion** — 动效只用 `fade-in` + `transition-colors`，不做弹跳/缩放。

---

## 2. Color Tokens 颜色系统

Minimal Mono **不引入新颜色变量**，全部基于 `--foreground` 的 alpha 阶梯。

| Role | Token | 用途 |
|---|---|---|
| Surface | `bg-white` | 所有面板、toolbar、卡片底色 |
| Canvas / Page | `bg-[#fafaf9]` 或 `bg-background` | 工作区背景，比 surface 略灰 |
| Text — Primary | `text-foreground` | 选中态、激活值、标题 |
| Text — Secondary | `text-foreground/70` | 默认按钮文字、icon |
| Text — Tertiary | `text-foreground/60` | 弱化 icon、辅助说明 |
| Text — Label | `text-foreground/40` | 分组小标签（uppercase） |
| Border — Default | `border-foreground/[0.08]` | 容器边框（≈8% alpha） |
| Border — Divider | `bg-foreground/10` | 竖向/横向分隔线 |
| Hover bg | `bg-foreground/[0.04]` | 按钮 hover |
| Active bg | `bg-foreground/[0.06]` ~ `[0.08]` | 选中/按下 |
| Destructive | `text-destructive` | 仅用于删除按钮 hover |

> **规则**：永远不要在 chrome 上写 `text-black` / `text-gray-500` / `bg-slate-100`，必须走 `foreground/{alpha}`，这样一处换主题处处生效。

---

## 3. Typography 字体

| Use | Class | Notes |
|---|---|---|
| 默认 UI | `font-sans` (Inter) | 13–14px 主，12px 辅 |
| 数字/数值 | `tabular-nums` | 必加，避免抖动 |
| 分组小标签 | `text-[10px] uppercase tracking-wider font-medium text-foreground/40` | 例：`字体`/`图层` |
| 按钮文字 | `text-[13px]` | 字重默认 |
| 输入框 | `text-sm` | |

**禁止**：serif、装饰字体、字重 > 600 的非标题文字。

---

## 4. Spacing & Sizing 间距和尺寸

| Token | Value | 用途 |
|---|---|---|
| Toolbar 高度 | `h-8` (32px) 按钮 / `py-1.5` 容器 | 紧凑但不拥挤 |
| Icon 尺寸 | `w-3.5 h-3.5` (14px) | 主 icon |
| 小 icon | `w-3 h-3` (12px) | chevron、状态指示 |
| 按钮内边距 | `px-2`，最小宽度 `min-w-8` | |
| 按钮间距 | `gap-0.5` | toolbar 内 |
| 分组间距 | `gap-1` ~ `gap-2` | section 之间 |
| 面板 padding | `p-1.5` | dropdown panel |
| 面板与 trigger 间距 | `mt-1.5` | |

---

## 5. Radius & Border 圆角和边框

| Element | Radius | Border |
|---|---|---|
| 容器 / 面板 | `rounded-xl` (12px) | `border border-foreground/[0.08]` |
| 按钮 | `rounded-md` (8px) | 无边框 |
| Swatch / 小色块 | `rounded-sm` | `border border-foreground/10` |
| 输入框 | `rounded-md` | `border border-border` |

边框始终 1px，**不使用** 2px+ 厚边框（那是 Neo Brutal 的事）。

---

## 6. Shadow 阴影

双层阴影系统，近层定形，远层定漂浮感：

```css
/* Toolbar / 卡片 */
shadow-[0_2px_12px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.06)]

/* Dropdown / Popover（更悬浮） */
shadow-[0_4px_20px_rgba(0,0,0,0.06),0_12px_40px_rgba(0,0,0,0.08)]
```

> 禁止：彩色阴影、glow、发光描边。

---

## 7. Motion 动效

| 场景 | 动画 |
|---|---|
| 出现 | `animate-fade-in`（已在 tailwind.config 定义） |
| 颜色/背景变化 | `transition-colors` |
| 拖拽数值（scrub） | 无视觉过渡，直接跟手 |

**禁止**：bounce、spring、scale > 1.02、translate Y > 8px。

---

## 8. Component Patterns 组件模式

### 8.1 Button (Ghost)
所有 toolbar 按钮的标准形态：

```tsx
<button className={cn(
  "h-8 min-w-8 px-2 rounded-md flex items-center justify-center gap-1",
  "text-[13px] text-foreground/70",
  "hover:bg-foreground/[0.04] hover:text-foreground transition-colors",
  active && "bg-foreground/[0.06] text-foreground"
)}>
```

### 8.2 Container / Toolbar
```tsx
<div className="bg-white rounded-xl border border-foreground/[0.08]
                shadow-[0_2px_12px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.06)]
                px-1.5 py-1.5 flex items-center gap-0.5">
```

### 8.3 Divider
```tsx
<div className="w-px h-4 bg-foreground/10 mx-1" />
```

### 8.4 Dropdown Panel
```tsx
<div className="absolute mt-1.5 bg-white rounded-xl border border-foreground/[0.08]
                shadow-[0_4px_20px_rgba(0,0,0,0.06),0_12px_40px_rgba(0,0,0,0.08)]
                p-1.5 animate-fade-in z-50 min-w-[180px]">
```

### 8.5 Section Label
```tsx
<div className="text-[10px] uppercase tracking-wider text-foreground/40 px-2 py-1 font-medium">
  字体
</div>
```

### 8.6 NumberSlider（可拖可输入）
- 容器：`h-8 rounded-md bg-foreground/[0.03] hover:bg-foreground/[0.05]`
- 输入：透明背景，`tabular-nums text-[13px]`
- 拖拽热区：cursor `ew-resize`，scrub 1px = 1 step
- 步进按钮：`w-5 h-full opacity-0 group-hover:opacity-100`

### 8.7 Color Swatch
```tsx
<button className="w-7 h-7 rounded-md border border-foreground/10"
        style={{ background: color }} />
```

---

## 9. Iconography 图标

- 库：**lucide-react**（线性、统一笔画）
- 默认尺寸 `w-3.5 h-3.5`，颜色 `text-foreground/60` ~ `/70`
- 永远不给 icon 上彩色（除非是色彩选择器里的 color swatch）

---

## 10. Do / Don't 速查

| ✅ Do | ❌ Don't |
|---|---|
| `border-foreground/[0.08]` | `border-gray-200` |
| `bg-white` + 双层阴影 | `bg-gradient-*` 在 chrome 上 |
| `text-foreground/70` | `text-slate-500` |
| `animate-fade-in` | `animate-bounce` / spring |
| `tabular-nums` 数字 | 默认比例字数字 |
| 1px 细边 | 2px+ 粗边 |
| icon 14px 灰阶 | icon 上彩色 |
| 小写大字距 label | 普通段落字 label |

---

## 11. 复用清单 Reuse Checklist

新增一个 Minimal Mono 组件时，过一遍：

- [ ] 容器是否用了 `bg-white + rounded-xl + border-foreground/[0.08] + 双层阴影`？
- [ ] 文字是否走 `foreground/{alpha}` 阶梯？
- [ ] 按钮是否是 ghost 形态（无边、hover 才出底）？
- [ ] 数值是否 `tabular-nums`？
- [ ] 分组是否有 uppercase tracking-wider 小标签？
- [ ] 出场动画是否只用 `animate-fade-in`？
- [ ] 是否避免了所有非灰阶的 chrome 颜色？

---

## 12. 参考实现 Reference Implementations

本仓库内可直接对照阅读。路径均以仓库根目录为准；编辑器 chrome 归
`packages/editor`，不要从 `apps/web` 新增或引用编辑器 UI 组件。

| Pattern | 本仓库参考实现 | 对照点 |
|---|---|---|
| Toolbar / Ghost Button | `packages/editor/src/components/floating-toolbar.tsx` | `FloatingToolbar`、`ToolbarTrigger`、`IconButton`、`ToolbarOption` 展示 toolbar 容器、ghost 按钮、active 态、lucide icon、分隔线和删除按钮 hover。 |
| Dropdown / Popover Panel | `packages/editor/src/components/floating-toolbar.tsx` | `ToolbarPanel`、`PanelTitle` 展示浮层定位、面板阴影、入口动效、窄/中/宽面板尺寸和 uppercase 小标签。 |
| Inspector / Properties Panel | `packages/editor/src/components/sidebar-tool-panel.tsx` | `SidebarToolPanel` 展示侧边栏结构、`Tabs`、`Accordion`、字段 label、`Input`、`Select`、颜色/数字/文本属性编辑。 |
| Color Picker / Swatch | `packages/editor/src/components/color-picker.tsx` | `ColorPicker` 展示色谱、hue slider、hex input、preset swatch 和可选 gradient swatch；toolbar 内传 `includeGradients={false}`。 |
| shadcn/ui primitives | `packages/editor/src/components/ui/` | `Button`、`Input`、`Select`、`Tabs`、`Accordion`、`Popover`、`Tooltip`、`Separator` 等基础组件。新增 chrome 优先组合这些组件。 |
| Motion tokens | `packages/editor/src/lib/motion.ts` | `editorMotionClassName`、`editorPanelEnterClassName`、`editorPanelExitClassName` 等统一编辑器微动效。 |
| Class composition | `packages/editor/src/lib/utils.ts` | 使用 `cn()` 组合 Tailwind class，避免手写字符串分支。 |
| Theme tokens / Tailwind entry | `packages/editor/src/styles/index.css` | Tailwind v4 入口、shadcn theme tokens、`@source ".."` 扫描范围和基础 CSS 变量。 |

新增或修改 Minimal Mono 风格组件时，优先复用 `packages/editor/src/components/ui`
里的 shadcn/ui primitive，再在 `packages/editor/src/components/` 内组合成编辑器专用组件。
涉及浮层出现/退出时复用 `packages/editor/src/lib/motion.ts`，涉及条件 class 时使用
`cn()`。
