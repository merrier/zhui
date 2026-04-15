## 背景与目标
当前仓库根目录的宣传页（index.html）包含“全部组件”展示，但其可视化示例为手工静态示意，无法与 Storybook 中真实组件渲染保持一致。目标是实现一个面向 GitHub Pages 的宣传站，使“组件展示”与 Storybook 完全一致，并覆盖 Storybook 中全部组件。

## 范围（本次只做）
- 首页组件展示：仅包含每个组件的“浏览样式”故事（不展示“自定义”）。
- 在首页中展示 Storybook 对应的示例与代码（即 Storybook 中 ShowCode 的输出）。
- 覆盖 Storybook 全部组件（以 `src/stories/*.story.js` 为准）。
- 支持 GitHub Pages 部署，入口仍为仓库根目录 `index.html`。

## 不在范围（本次不做）
- 不在首页上复刻组件内部交互逻辑（由 Storybook 原样渲染保证一致）。
- 不修改组件实现、Storybook 现有 stories 内容与视觉规范。
- 不做多语言、暗色模式等扩展。

## 方案概述（保证 100% 一致）
1. **将 Storybook 以静态站点形式与首页一起部署**
   - 通过 `build-storybook` 将产物输出到仓库内固定目录（例如 `storybook/`）。
   - GitHub Pages 会同时托管根目录首页与 `storybook/` 静态资源。
2. **首页“全部组件”区域改为嵌入 Storybook 的 iframe**
   - 每个组件对应一个 Storybook iframe，指向：
     - `storybook/iframe.html?id=<story-id>&viewMode=story`
   - 首页不再渲染手写 demo，以避免样式与结构偏差。
3. **以 story 清单驱动渲染，确保不漏组件**
   - 从 `src/stories/*.story.js` 提取每个组件的 “kind” 与 “浏览样式” story 名称。
   - 将清单生成到一个可被首页读取的静态 JSON（例如 `storybook-stories.json`），由首页渲染列表。

## Story 选择规则
- 每个 `*.story.js` 文件仅取 `.add('浏览样式', ...)` 对应的 story。
- 若某个组件不存在“浏览样式”，则回退取该文件的第一个 `.add(...)`。
- 首页显示名称优先用 `storiesOf('<中文> <English>', module)` 的标题文本。

## 页面结构（首页）
- 顶部：品牌/CTA/特色（保留现有）
- 组件区（改造点）：
  - 搜索/分类筛选（基于 story 清单的元数据）
  - 组件卡片列表
    - 默认折叠（`<details>`）
    - 展开后加载 iframe（懒加载）
    - 卡片内提供“在 Storybook 打开”链接（新标签页打开该 story）

## 性能与体验策略
- 组件卡片默认折叠；仅展开时设置 iframe `src`（展开前用占位骨架）。
- iframe 设置 `loading="lazy"`。
- 允许用户在首页完成快速筛选，再逐个展开查看。

## 技术实现要点
- Storybook 静态输出目录：`storybook/`（可配置）。
- 生成 story 清单：
  - Node 脚本扫描 `src/stories/*.story.js`，解析出：
    - 组件展示名（kind）
    - “浏览样式” story 的 `storyId`
    - 组件分类（可通过文件名或映射表维护）
- 首页渲染：
  - 读取 `storybook-stories.json`
  - 根据筛选渲染卡片
  - 展开卡片时插入 iframe

## 验收标准
- 首页每个组件展示的视觉与交互（在 iframe 内）与 Storybook 完全一致。
- 首页覆盖 Storybook 中全部组件（按 `src/stories/*.story.js` 文件数核对）。
- 每个组件仅展示“浏览样式”，不展示“自定义”。
- GitHub Pages 部署后可访问：
  - `/`：宣传首页
  - `/storybook/`：Storybook 静态站点（可选访问）
- 首页筛选可用，展开后可看到示例与 ShowCode 输出。

