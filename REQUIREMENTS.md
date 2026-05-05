# Starry Slides — 编辑器需求方案

## 1. CLI `view` 命令：渲染所有 slide 为图片

**需求：** 在 CLI 中添加 `sslides view [deck]` 命令，将 deck 中每张 slide 渲染为 PNG 图片并输出到指定目录。

**方案：**
- 使用已有的 Playwright + Chromium（已安装）进行 headless 渲染
- 读取 `manifest.json` 获取 slide 列表，逐个加载 HTML 文件
- 每张 slide 的 HTML 是自包含的（内联 CSS），直接用 `page.goto('file://...')` 加载
- 从 HTML 中解析 `data-slide-width` / `data-slide-height` 设置 viewport
- 输出到 `--out-dir`（默认 `deck 目录/view-output/`）
- 支持 `--scale` 参数控制分辨率倍率（默认 1x，用于 retina 可设 2x）

**涉及文件：**
- `src/cli/index.ts` — 添加 `view` 命令入口
- 新建 `src/cli/view-slides.ts` — Playwright 渲染逻辑

---

## 2. 删除侧边栏编辑面板，只保留浮动工具栏

**需求：** 移除右侧 sidebar tool panel，所有编辑功能统一由浮动工具栏（FloatingToolbar）承载。工具栏跟随选中元素浮动显示。

**方案：**
- 删除 `SidebarToolPanel` 组件及其引用
- 从 editor 主组件（`index.tsx`）中移除 sidebar 相关的 state 和 toggle 逻辑
- 确保 FloatingToolbar 覆盖 sidebar 的全部功能：
  - 目前两者共享同一套 `ELEMENT_TOOL_GROUPS` 数据模型，功能已对齐
  - sidebar 有"自定义 CSS 属性"输入（custom-css controlType），需迁移到浮动工具栏
  - sidebar 有 attribute 区域（locked、alt text、aria-label、link URL），需在浮动工具栏中添加
- 移除 sidebar toggle 按钮和 mode switching 逻辑

**涉及文件：**
- `src/editor/components/sidebar-tool-panel.tsx` — 删除
- `src/editor/components/sidebar-tool-panel-parts.tsx` — 删除
- `src/editor/index.tsx` — 移除 sidebar 引用
- `src/editor/components/floating-toolbar.tsx` — 补充缺失功能

---

## 3. 右键 Context Menu

**需求：** 右键点击元素时弹出上下文菜单，提供常用操作快捷入口。

**方案：**
- 新建 `src/editor/components/context-menu.tsx`
- 在 stage canvas 上监听 `contextmenu` 事件，阻止默认行为
- 根据点击位置判断是否命中元素，动态构建菜单项

**菜单内容（根据上下文变化）：**
- 无选区 / 点击空白：粘贴、全选
- 选中元素：剪切、复制、粘贴、删除、复制元素
- 编辑中：剪切、复制、粘贴、全选
- 通用：置于顶层/底层、上移一层/下移一层
- 选中多个元素：组合（Group）

**实现要点：**
- 菜单定位跟随鼠标坐标，自动避免溢出视口
- 点击菜单外部或按 Escape 关闭
- 复用已有的剪贴板操作（`editor-clipboard.ts`）和 layer order 逻辑

**涉及文件：**
- 新建 `src/editor/components/context-menu.tsx`
- `src/editor/components/stage-canvas.tsx` — 挂载 contextmenu 事件

---

## 4. 组合 / 解耦（Group / Ungroup）

**需求：** 支持将多个元素组合为一个组，组内元素可以一起移动、缩放。支持解耦还原为独立元素。

**调研结论：**

HTML-native slide 编辑器中，组合的主流实现方式：

1. **嵌套容器（推荐）：** 组 = 一个 `<div data-editable="block" data-group="true">` 包裹子元素。子元素的 position 保持 relative/absolute，相对于组容器定位。
   - 优点：天然的父子关系，移动组 = 移动容器，子元素相对位置自动保持
   - 优点：选中组时显示组的 bounding box，双击进入组编辑（选中组内单个元素）
   - 缺点：需要处理选择模型的层级切换

2. **扁平列表 + groupId：** 元素平铺，用 groupId 标记归属。移动时联动所有同组元素。
   - 优点：不改变 DOM 结构
   - 缺点：需要手动维护联动逻辑，bounding box 计算复杂

**推荐方案 1（嵌套容器），具体实现：**

**数据模型：**
- `SlideModel.elements` 中添加 `GroupElement` 类型，包含 `children: EditableElement[]`
- 或者在 HTML 层面，组就是一个 `data-editable="block" data-group="true"` 的 div，子元素嵌套在其中

**Group 操作：**
- 选中多个元素 → 右键 / 快捷键 `Cmd+G` → 创建组容器 div，将选中元素移入
- 组容器自动计算 bounding box（包裹所有子元素 + padding）
- 组的 `position: relative`，子元素 `position: absolute`（相对于组）

**Ungroup 操作：**
- 选中组 → 右键 / 快捷键 `Cmd+Shift+G` → 将子元素提升到父层级，删除组容器
- 子元素的绝对位置需要转换为相对于 slide 的坐标

**选择模型：**
- 单击选中组 → 显示组的整体 bounding box
- 双击组 → 进入"组编辑模式"，可以选中组内单个元素
- 按 Escape 退出组编辑模式
- 参考 Figma / Keynote 的双击穿透选择模式

**涉及文件：**
- `src/core/slide-contract.ts` — 扩展 element 类型
- `src/core/slide-document.ts` — 解析组元素
- `src/editor/hooks/use-block-manipulation.ts` — 组的选择 / 移动 / 缩放
- `src/editor/components/block-manipulation-overlay.tsx` — 组的 bounding box 渲染
- 新建 `src/editor/hooks/use-group-operations.ts` — group / ungroup 逻辑
- `src/editor/components/context-menu.tsx` — 添加 group / ungroup 菜单项

### 4b. 拖拽选中框缩放时，内部元素等比缩放

**需求：** 选中多个元素（或一个组）后，拖拽选中框的 resize handle 改变大小时，内部元素按比例自动缩放，类似 Keynote 的效果。

**方案：**
- 选中多个元素 / 组时，显示整体 bounding box + 8 个 resize handle
- 拖拽 handle 时，计算缩放比例 `scaleX = newWidth / oldWidth`、`scaleY = newHeight / oldHeight`
- 对内部每个元素的 `left`、`top`、`width`、`height` 乘以对应比例
- 保持元素间的相对位置和比例关系
- **按住 Shift 锁定宽高比**：只用一个 scale 因子 `scale = max(scaleX, scaleY)`
- 缩放完成后，将新尺寸写回每个元素的 inline style

**关键细节：**
- 缩放基准点取决于拖拽的 handle 方向（左上角 handle → 右下角固定不动）
- 元素的 `transform-origin` 需要跟随 handle 方向调整
- 组内嵌套的组需要递归缩放
- 缩放过程中实时预览（拖拽时同步更新 DOM），松手后提交到历史

**涉及文件：**
- `src/editor/hooks/use-block-manipulation.ts` — 多选 / 组的 resize 逻辑
- `src/editor/hooks/block-manipulation-geometry.ts` — 缩放计算
- `src/editor/components/block-manipulation-overlay.tsx` — 多选 bounding box + resize handles

---

## 5. 完善 Snap 系统，交互接近 Keynote

**需求：** 现有 snap 已有基础（对齐 + 等间距），但要更接近 Keynote 的体验。

**现有系统分析：**
- 已有：边缘对齐（start/center/end）、等间距 snap、slide 中心对齐
- 已有：snap guide 可视化线条
- 常量：SNAP_THRESHOLD_PX=18, 等间距范围 12-360px

**需要增强的部分：**

### 5a. 更智能的参考目标选择
- **问题：** 当前所有非选中元素都被作为 snap target，元素多时会产生过多干扰
- **改进方向：**
  - 优先选择与移动方向相关的元素（水平移动优先看左右邻居，垂直移动优先看上下邻居）
  - 优先选择距离近的元素，按距离衰减权重
  - 考虑视觉分组：同一行/列的元素优先互相 snap
  - 减少不相关目标的干扰，提高 snap 命中精度

### 5b. 更清晰的引导线（Guide Lines）
- **问题：** 当前 guide 线在复杂布局下可能视觉混乱
- **改进方向：**
  - guide 线标注对齐的目标元素（延伸到目标元素边缘，而非仅在当前元素范围内）
  - 不同类型的 guide 用不同样式区分（边缘对齐 vs 中心对齐 vs 等间距）
  - 间距 snap 时显示间距数值标签（如 "24px"）
  - guide 线颜色和粗细优化，在深色/浅色 slide 上都清晰可见
  - snap 触发时的视觉反馈更明确（如吸附瞬间高亮目标元素边缘）

**涉及文件：**
- `src/editor/lib/block-snapping.ts` — snap 算法增强
- `src/editor/lib/block-snap-targets.ts` — 新增对齐目标
- `src/editor/lib/block-snap-guides.ts` — 间距数值标签
- `src/editor/lib/block-snap-constants.ts` — 调整阈值
- `src/editor/hooks/editor-keyboard-operations.ts` — 键盘操作
- `src/editor/components/context-menu.tsx` — 对齐 / 分布菜单项

---

## 6. CLI `verify` 增加 Overflow 检测

**需求：** 当前 `verify` 只做 HTML 结构检查（data-slide-root、data-editable 等）。需要增加检测 slide 内元素是否溢出（超出 slide 可视区域）的功能。

**方案：**

当前 `verify` 使用 JSDOM 做静态分析，但 JSDOM 无法计算实际渲染尺寸（无布局引擎）。overflow 检测需要两种方式配合：

### 6a. 静态检测（JSDOM，快速）
- 检查元素的 inline style 中 `width` / `left` / `right` 组合是否超出 `data-slide-width`
- 检查元素的 inline style 中 `height` / `top` / `bottom` 组合是否超出 `data-slide-height`
- 只能检测显式设置尺寸的元素，无法检测文本自然换行导致的溢出
- 作为 `verify` 的默认附加检查，零成本

### 6b. 渲染检测（Playwright，精确）
- 添加 `--check-overflow` 标志，启用 Playwright 渲染检测
- 对每张 slide 用 headless Chromium 渲染，检查：
  - `document.body.scrollWidth > viewport.width` 或 `scrollHeight > viewport.height`
  - 逐个元素检查 `element.scrollWidth > element.clientWidth` 或 `scrollHeight > clientHeight`
- 输出每个溢出元素的选择器、溢出方向、溢出量
- 与 `view` 命令共享 Playwright 渲染逻辑

**涉及文件：**
- `src/core/verify-deck.ts` — 添加静态 overflow 检查
- 新建 `src/cli/verify-overflow.ts` — Playwright 渲染检测逻辑
- `src/cli/index.ts` — 添加 `--check-overflow` 参数

---

## 实现优先级建议

| 优先级 | 需求 | 理由 |
|--------|------|------|
| P0 | 2. 删除侧边栏 | 简化 UI，为后续功能腾出空间 |
| P0 | 3. Context Menu | 基础交互，其他功能依赖它作为入口 |
| P1 | 1. CLI view | 独立功能，不影响编辑器 |
| P1 | 6. verify overflow | 质量保障，静态检测零成本 |
| P1 | 5. Snap 完善 | 体验提升，增量改进 |
| P2 | 4. 组合/解耦 | 最复杂，需要改动数据模型 |
