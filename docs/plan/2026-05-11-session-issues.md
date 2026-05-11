# Starry Slides — 待解决问题清单

> 2026-05-11 session 整理

---

## 已完成

### 1. Contract v2：CSS 作为一等公民
- 去掉了 "Runtime CSS/JS" 概念
- `<slides>` 和 `<slide>` 的属性变成纯元数据（title, description, generated-at, id, archetype, notes）
- 新增 CSS Requirements 节，定义了 7 项必选 CSS 属性
- 分支：`contract/css-requirements`

### 2. Verifier 与 Contract 对齐
- 去掉了 `legacy-editable-attr` 检查（不再检查 `data-editable`）
- 去掉了 `data-slide-root` / `data-slide-width` / `data-slide-height` 相关检查
- 新增 CSS 验证（missing style block + 7 项必选属性检查）
- Verifier 现在检查：structure → css → static-overflow → rendered-overflow

### 3. 去掉 Static 模式
- 删除 `VerifyMode` 类型，只保留 complete 模式
- 删除 CLI `--static` 选项
- `verifyDeck()` 默认跑所有检查

---

## 待解决

### 4. 去掉 `data-group="true"` 属性
**状态**：已讨论方案，未实施

**方案**：不再用 `data-group="true"` 属性标记 group，改为从 DOM 结构推断：
- `<div>` 有 2+ 个可编辑子元素 → 视为 group，可 ungroup
- 单子元素的 div → 不可 ungroup（div 是子元素结构的一部分）
- `<ul>` / `<ol>` → 不可 ungroup（列表有独立语义）

**影响范围**：
- `src/core/group-operations.ts` — group/ungroup 逻辑
- `src/core/editable-dom.ts` — `getEditableElementType()` 中 `data-group` 判断
- `src/editor/hooks/block-manipulation-geometry.ts`
- `src/editor/lib/editor-selection-operations.ts`
- `src/editor/lib/editor-selection-structure.ts`
- Verifier 的 `structure.invalid-group` 检查（可去掉）
- Contract 的 Group Semantics 节（需更新）

### 5. Parser 与新 Contract 的不一致
**状态**：已发现，未处理

**问题**：`slide-document.ts` 中的 `parseDeckDocument` 和 `findSlideCanvasRoot` 仍然在自动创建老 contract 的属性：
- `data-slide-root="true"` — 老的 slide root 标记
- `data-slide-width` / `data-slide-height` — 老的尺寸属性

这些属性在新 contract 中不再需要（尺寸由 CSS 定义），但 parser 还在生成它们。这会导致：
- 编辑器保存的 HTML 包含冗余属性
- 与 contract 定义不一致

**建议**：parser 应该停止自动创建这些属性，编辑器改为从 CSS 读取尺寸。

### 6. `verifyRenderedOverflow` 的 Pre-existing Bug
**状态**：已发现，未修复

**问题**：`view-renderer.ts` 中 `verifyRenderedOverflow` 在 Playwright `page.evaluate()` 里使用了 `isEditableElement` 函数，但该函数在浏览器上下文中不可用，导致运行时崩溃。

**当前处理**：CLI action 里用 try/catch 兜底，静默跳过 rendered overflow 检查。

**修复方向**：需要将 `isEditableElement` 的逻辑序列化到浏览器上下文中，或者改用 CSS 选择器来判断。

---

## 相关文件

| 文件 | 涉及问题 |
|------|----------|
| `skills/starry-slides/references/STARRY-SLIDES-CONTRACT.md` | #1, #4 |
| `src/core/verify-deck.ts` | #2, #3, #4 |
| `src/core/verify-deck.test.ts` | #2, #3 |
| `src/core/slide-document.ts` | #5 |
| `src/core/slide-contract.ts` | #5 |
| `src/core/group-operations.ts` | #4 |
| `src/core/editable-dom.ts` | #4 |
| `src/node/view-renderer.ts` | #6 |
| `src/cli/commands/verify/action.ts` | #3, #6 |
| `src/cli/commands/verify/index.ts` | #3 |
| `src/cli/commands/open/action.ts` | #6 |
| `src/cli/commands/view/action.ts` | #3 |
| `src/cli/index.test.ts` | #3 |
| `tests/helpers/deck-fixtures.ts` | #2 |
