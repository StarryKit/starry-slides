# Starry Slides — 项目方案文档

## 项目概述

一个开源的 HTML Slides 编辑器，由两部分组成：

1. **Skill**：调用 AI 生成带标记的 HTML slides
2. **Editor**：基于 iframe + Konva 的可视化编辑器，可直接编辑 AI 生成的 HTML slides

灵感来源于 Genspark 的 slides 编辑器实现方式（通过逆向分析得出）。

---

## 背景与动机

### 现状

- AI 生成 HTML slides 已成为主流（Genspark、Gamma、Chronicle 等产品均采用 HTML 渲染）
- 但目前**没有任何开源方案**能对任意 HTML slides 做 WYSIWYG 编辑
- 现有编辑器（PPTist、Polotno）都有自己的私有数据格式，无法直接编辑 HTML

### Genspark 的实现原理（已验证）

通过 Chrome DevTools 分析确认，Genspark 采用双层架构：

```
┌─────────────────────────────────────┐
│  Konva Canvas Layer（透明叠加）      │  ← 选中、拖拽、resize handle、工具栏
├─────────────────────────────────────┤
│  iframe + HTML Slide（内容层）       │  ← AI 生成的原始 HTML，负责视觉渲染
└─────────────────────────────────────┘
```

关键证据：
- `window.Konva` 存在，`typeof Konva === 'object'`
- Console 日志显示坐标转换逻辑：`iframe(x, y) + element(w, h) * scale = border position`
- 移动操作通过 CSS selector 定位 iframe 内元素，写回 `transform: translate()`

---

## 技术方案

### 核心架构

```
AI Skill (生成端)
    │
    │  输出带 data-editable 标记的 HTML
    ▼
HTML Slides 文件
    │
    ▼
┌─────────────────────────────────────────────────────┐
│                   Editor App (React)                 │
│                                                      │
│   ┌──────────────┐    ┌──────────────────────────┐  │
│   │  Slide List  │    │     Edit Canvas Area     │  │
│   │  (左侧缩略图) │    │                          │  │
│   │              │    │  ┌────────────────────┐  │  │
│   │  [Slide 1]   │    │  │  Konva Canvas      │  │  │
│   │  [Slide 2]   │    │  │  (交互层，透明叠加) │  │  │
│   │  [Slide 3]   │    │  ├────────────────────┤  │  │
│   │  ...         │    │  │  iframe            │  │  │
│   └──────────────┘    │  │  (HTML 内容渲染层) │  │  │
│                       │  └────────────────────┘  │  │
│                       └──────────────────────────┘  │
│                                                      │
│   ┌──────────────────────────────────────────────┐  │
│   │  Toolbar（富文本工具栏，随选中元素出现）        │  │
│   └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 数据流

```
1. 加载 HTML
   → Parser 扫描所有 data-editable 元素
   → 构建 JSON 数据模型

2. 用户交互
   → Konva 检测点击/拖拽
   → 坐标转换（Konva坐标 → iframe坐标）
   → 定位对应 data-editable 元素
   → 更新 JSON 数据模型
   → 写回 iframe DOM

3. 保存
   → JSON 数据模型 → 序列化回 HTML
   → 或直接保存修改后的 HTML 字符串
```

---

## Skill 规范

### 生成规则

AI skill 生成 HTML slides 时，**必须**遵守以下规则：

**可编辑元素**（用户需要修改内容的）加 `data-editable` 属性：

```html
<!-- 文字类 -->
<h1 data-editable="text">标题文字</h1>
<h2 data-editable="text">副标题</h2>
<p data-editable="text">正文内容</p>
<span data-editable="text">行内文字</span>

<!-- 图片类 -->
<img data-editable="image" src="..." />

<!-- 容器类（整体可移动） -->
<div class="card" data-editable="block">...</div>
```

**不可编辑元素**（装饰性背景、光效等）不加任何标记：

```html
<div class="grid-bg"></div>
<div class="glow-orb"></div>
<div class="divider"></div>
```

### HTML Slide 结构规范

每个 slide 是一个独立的 HTML 文件（或 HTML 字符串），结构如下：

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    /* slide 样式，宽高固定为 1920x1080 */
    body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; }
    .slide-container { width: 100%; height: 100%; position: relative; }
  </style>
</head>
<body>
  <div class="slide-container">
    <!-- 装饰层（不加标记） -->
    <div class="bg-gradient"></div>

    <!-- 内容层（加标记） -->
    <h1 data-editable="text">Slide Title</h1>
    <p data-editable="text">Slide content goes here</p>
  </div>
</body>
</html>
```

---

## Editor 实现细节

### 技术栈

```
React          → 整体框架
Konva.js       → 交互层（选中框、拖拽、resize handle）
TipTap         → 富文本编辑（双击进入文字编辑模式）
iframe         → HTML slides 渲染容器
```

### 核心模块

#### 1. Parser — HTML → JSON 数据模型

```typescript
interface EditableElement {
  id: string
  selector: string        // CSS selector，用于定位 iframe 内元素
  type: 'text' | 'image' | 'block'
  content: string         // 当前内容
  transform: {
    x: number
    y: number
  }
  styles: {
    fontSize?: number
    color?: string
    fontWeight?: string
    // ...
  }
}

interface SlideModel {
  id: string
  htmlSource: string      // 原始 HTML 字符串
  elements: EditableElement[]
}

function parseSlide(html: string): SlideModel {
  // 1. 解析 HTML，找所有 [data-editable] 元素
  // 2. 提取 selector、content、当前 transform、样式
  // 3. 返回结构化数据模型
}
```

#### 2. 坐标桥接 — 最核心的技术点

```typescript
interface CoordBridge {
  // iframe 在外层容器中的位置
  iframeRect: DOMRect
  // slide 的原始尺寸（1920x1080）
  slideNativeSize: { width: number; height: number }
  // 当前缩放比例
  scale: number
}

function elementToKonvaCoords(
  elementRect: DOMRect,  // iframe 内元素的位置（相对于 iframe）
  bridge: CoordBridge
): { x: number; y: number; width: number; height: number } {
  return {
    x: bridge.iframeRect.left + elementRect.left * bridge.scale,
    y: bridge.iframeRect.top + elementRect.top * bridge.scale,
    width: elementRect.width * bridge.scale,
    height: elementRect.height * bridge.scale,
  }
}

function konvaToIframeCoords(
  konvaX: number,
  konvaY: number,
  bridge: CoordBridge
): { x: number; y: number } {
  return {
    x: (konvaX - bridge.iframeRect.left) / bridge.scale,
    y: (konvaY - bridge.iframeRect.top) / bridge.scale,
  }
}
```

#### 3. 选中与拖拽

```typescript
// 用户点击 Konva canvas
konvaStage.on('click', (e) => {
  const iframeCoord = konvaToIframeCoords(e.evt.clientX, e.evt.clientY, bridge)

  // 找 iframe 内对应元素
  const el = iframeDoc.elementFromPoint(iframeCoord.x, iframeCoord.y)
  if (!el || !el.dataset.editable) return

  // 在 JSON 模型中找到对应数据
  const elementModel = findElementByDomNode(el, slideModel)

  // Konva 画选中框
  const konvaCoords = elementToKonvaCoords(el.getBoundingClientRect(), bridge)
  showTransformer(konvaCoords)
})

// 用户拖拽
konvaTransformer.on('dragmove', (delta) => {
  // 1. 更新 JSON 数据模型
  elementModel.transform.x += delta.x / bridge.scale
  elementModel.transform.y += delta.y / bridge.scale

  // 2. 写回 iframe DOM
  const el = iframeDoc.querySelector(elementModel.selector)
  el.style.transform = `translate(${elementModel.transform.x}px, ${elementModel.transform.y}px)`
})
```

#### 4. 文字编辑

```typescript
// 双击进入文字编辑模式
konvaStage.on('dblclick', (e) => {
  const el = getEditableElement(e, bridge)
  if (el?.dataset.editable !== 'text') return

  // 隐藏 Konva 选中框
  hideTransformer()

  // 激活 TipTap 编辑器，覆盖在对应位置
  const rect = elementToKonvaCoords(el.getBoundingClientRect(), bridge)
  showTipTapEditor({
    position: rect,
    initialContent: el.innerHTML,
    onUpdate: (newContent) => {
      // 更新 JSON 模型
      elementModel.content = newContent
      // 写回 iframe DOM
      el.innerHTML = newContent
    }
  })
})
```

#### 5. 撤销/重做

```typescript
// 基于 JSON 数据模型做 history stack
const history: SlideModel[] = []
let historyIndex = 0

function applyChange(mutation: () => void) {
  mutation()
  // 保存快照
  history.splice(historyIndex + 1)
  history.push(deepClone(slideModel))
  historyIndex++
}

function undo() {
  if (historyIndex <= 0) return
  historyIndex--
  restoreFromModel(history[historyIndex])
}

function redo() {
  if (historyIndex >= history.length - 1) return
  historyIndex++
  restoreFromModel(history[historyIndex])
}
```

---

## 项目结构

```
starry-slides/
├── packages/
│   ├── skill/                    # AI Skill（生成 HTML slides）
│   │   ├── SKILL.md              # Skill 规范文档（给 AI 的 prompt）
│   │   ├── examples/             # 示例生成结果
│   │   └── templates/            # 可用的 slide 模板
│   │
│   └── editor/                   # 编辑器（React App）
│       ├── src/
│       │   ├── components/
│       │   │   ├── SlideList/    # 左侧缩略图列表
│       │   │   ├── EditCanvas/   # 主编辑区（iframe + Konva）
│       │   │   │   ├── IframeLayer.tsx
│       │   │   │   ├── KonvaLayer.tsx
│       │   │   │   └── CoordBridge.ts   # 坐标转换核心
│       │   │   ├── Toolbar/      # 富文本工具栏
│       │   │   └── TextEditor/   # TipTap 文字编辑器
│       │   │
│       │   ├── core/
│       │   │   ├── parser.ts     # HTML → JSON 数据模型
│       │   │   ├── serializer.ts # JSON 数据模型 → HTML
│       │   │   ├── history.ts    # 撤销/重做
│       │   │   └── types.ts      # 类型定义
│       │   │
│       │   └── App.tsx
│       │
│       ├── package.json
│       └── vite.config.ts
│
├── README.md
└── package.json                  # monorepo 根配置
```

---

## 开发优先级

### Phase 1 — MVP（核心可用）

- [ ] Skill：能生成带 `data-editable` 标记的 HTML slides
- [ ] Editor：iframe 加载 HTML slide
- [ ] Editor：Konva 叠加层，点击 `data-editable` 元素显示选中框
- [ ] Editor：拖拽移动元素（transform 写回）
- [ ] Editor：双击进入文字编辑（contenteditable）
- [ ] Editor：左侧 slide 缩略图列表，点击切换

### Phase 2 — 完善编辑能力

- [ ] JSON 数据模型（parser + serializer）
- [ ] 撤销/重做（基于数据模型 history）
- [ ] 富文本工具栏（字体、字号、颜色、加粗等）
- [ ] Resize handle（拖拽改变元素大小）
- [ ] 图片元素编辑支持

### Phase 3 — 扩展

- [ ] 导出 PDF
- [ ] 导出 PPTX（参考 dom-to-pptx）
- [ ] 演示模式（全屏播放）
- [ ] 协作编辑（基于 JSON 数据模型 + WebSocket）

---

## 关键技术难点与解法

| 难点                                       | 解法                                                                          |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| iframe 内外坐标映射                        | 用 `getBoundingClientRect()` 获取 iframe 位置，结合 scale 做线性变换          |
| scale 变化时选中框位置偏移                 | 监听 ResizeObserver，scale 变化时重新计算所有 Konva 对象位置                  |
| 拖拽时 transform 累加                      | JSON 模型存储 `{x, y}`，每次拖拽在模型值上叠加 delta，避免读取 computed style |
| 文字编辑时光标位置                         | TipTap 覆盖在对应位置，编辑完成后同步回 iframe DOM 和 JSON 模型               |
| iframe 跨域资源                            | 本地开发用 `srcdoc` 注入 HTML 字符串，避免跨域问题                            |
| `data-editable` 元素的 CSS selector 不唯一 | Parser 阶段生成唯一 `data-editable-id` 属性作为稳定标识符                     |

---

## 参考资料

- Genspark slides 编辑器（架构来源，通过 DevTools 分析）
- [Konva.js Transformer 文档](https://konvajs.org/docs/select_and_transform/Basic_demo.html)
- [TipTap 富文本编辑器](https://tiptap.dev/)
- [dom-to-pptx](https://github.com/atharva9167j/dom-to-pptx)（未来导出 PPTX 用）
