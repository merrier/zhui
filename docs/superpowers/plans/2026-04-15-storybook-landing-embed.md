# Storybook Landing Embed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在仓库根目录 `index.html` 的“全部组件”区域中，按 Storybook 的“浏览样式”故事逐个嵌入 iframe，实现与 Storybook 完全一致的示例与 ShowCode 展示，并覆盖全部组件。

**Architecture:** 通过 `build-storybook` 将静态 Storybook 输出到仓库内 `storybook/` 目录；再从 `storybook/stories.json` 生成一个供首页消费的 `storybook-stories.json` 清单；首页读取清单渲染组件卡片，并在展开时懒加载对应 `storybook/iframe.html?id=...`。

**Tech Stack:** Storybook@5（现有）、Webpack@4（现有）、Node.js 脚本（fs/path）、纯静态 HTML/CSS/原生 JS（不引入新框架）。

---

## 文件结构变更

**Create**
- `/Users/merrier/repos/zhui/scripts/generate-storybook-stories.js`：从 `storybook/stories.json` 生成 `storybook-stories.json`
- `/Users/merrier/repos/zhui/scripts/fixtures/stories.sample.json`：用于脚本单测的最小样例（可选）
- `/Users/merrier/repos/zhui/scripts/generate-storybook-stories.test.js`：脚本单测（node + assert）

**Modify**
- `/Users/merrier/repos/zhui/package.json`：增加构建脚本（build storybook + 生成清单）
- `/Users/merrier/repos/zhui/index.html`：组件区改为 iframe 嵌入 Storybook（仅“浏览样式”）

**Generated (build output)**
- `/Users/merrier/repos/zhui/storybook/`：`build-storybook` 的静态产物（不手写）
- `/Users/merrier/repos/zhui/storybook-stories.json`：供首页读取的 story 清单（可提交，便于 GH Pages 直接部署）

---

### Task 1: 为 Storybook 静态产物与清单准备构建脚本

**Files:**
- Create: [generate-storybook-stories.js](file:///Users/merrier/repos/zhui/scripts/generate-storybook-stories.js)

- [ ] **Step 1: 编写 `generate-storybook-stories.js`（先不依赖 Storybook 源码，仅解析 `storybook/stories.json`）**

目标：输入 `storybook/stories.json`，输出 `storybook-stories.json`：
- 仅保留每个组件的“浏览样式” story（story 名为 `浏览样式`）
- 如果某个 kind 没有 `浏览样式`，回退取该 kind 的第一个 story
- 输出结构示例：
  - `items[]`: `{ kind, componentKey, componentCn, componentEn, category, storyId, storyName, iframeUrl, storybookUrl }`

实现代码（直接复制到文件中）：

```js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STORYBOOK_DIR = path.join(ROOT, 'storybook');
const STORIES_JSON = path.join(STORYBOOK_DIR, 'stories.json');
const OUT_JSON = path.join(ROOT, 'storybook-stories.json');

const CATEGORY_MAP = {
  Button: '基础',
  Icon: '基础',
  Breadcrumb: '导航',
  Pagination: '导航',
  Steps: '导航',
  Input: '表单',
  Checkbox: '表单',
  Radio: '表单',
  Switch: '表单',
  Rate: '表单',
  Alert: '反馈',
  Notify: '反馈',
  Loading: '反馈',
  Progress: '反馈',
  Skeleton: '反馈',
  Badge: '数据展示',
  Card: '数据展示',
  Table: '数据展示',
  Tag: '数据展示',
  Watermark: '数据展示',
  Portal: '工具'
};

const splitKind = (kind) => {
  const s = String(kind || '').trim();
  if (!s) return { cn: '', en: '' };
  const m = s.match(/^(.*?)\s+([A-Za-z][A-Za-z0-9_-]*)\s*$/);
  if (m) return { cn: m[1].trim(), en: m[2].trim() };
  return { cn: s, en: '' };
};

const loadStoriesJson = () => {
  const raw = fs.readFileSync(STORIES_JSON, 'utf8');
  return JSON.parse(raw);
};

const buildItems = (storiesJson) => {
  const stories = storiesJson && storiesJson.stories ? storiesJson.stories : {};

  const byKind = new Map();
  for (const [storyId, story] of Object.entries(stories)) {
    const kind = story && story.kind ? String(story.kind) : '';
    const name = story && story.name ? String(story.name) : '';
    if (!kind) continue;
    if (!byKind.has(kind)) byKind.set(kind, []);
    byKind.get(kind).push({ storyId, name });
  }

  const items = [];
  for (const [kind, list] of byKind.entries()) {
    const target = list.find((x) => x.name === '浏览样式') || list[0];
    const { cn, en } = splitKind(kind);
    const componentKey = en || kind;
    const category = CATEGORY_MAP[componentKey] || '未分类';

    const iframeUrl = `./storybook/iframe.html?id=${encodeURIComponent(target.storyId)}&viewMode=story`;
    const storybookUrl = `./storybook/index.html?path=/story/${encodeURIComponent(target.storyId)}`;

    items.push({
      kind,
      componentKey,
      componentCn: cn,
      componentEn: en,
      category,
      storyId: target.storyId,
      storyName: target.name,
      iframeUrl,
      storybookUrl
    });
  }

  items.sort((a, b) => (a.category + a.componentKey).localeCompare(b.category + b.componentKey, 'zh-CN'));
  return items;
};

const main = () => {
  if (!fs.existsSync(STORIES_JSON)) {
    process.stderr.write(`Missing ${STORIES_JSON}. Run build-storybook first.\n`);
    process.exit(1);
  }
  const storiesJson = loadStoriesJson();
  const items = buildItems(storiesJson);
  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: 'storybook/stories.json',
    items
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  process.stdout.write(`Wrote ${OUT_JSON} (${items.length} items)\n`);
};

if (require.main === module) main();

module.exports = { buildItems, splitKind };
```

- [ ] **Step 2: 手工造一个最小 `stories.sample.json` fixture**

Create: `/Users/merrier/repos/zhui/scripts/fixtures/stories.sample.json`

```json
{
  "stories": {
    "按钮-button--浏览样式": { "id": "按钮-button--浏览样式", "kind": "按钮 Button", "name": "浏览样式" },
    "按钮-button--自定义": { "id": "按钮-button--自定义", "kind": "按钮 Button", "name": "自定义" },
    "输入框-input--自定义": { "id": "输入框-input--自定义", "kind": "输入框 Input", "name": "自定义" }
  }
}
```

- [ ] **Step 3: 为脚本写一个 node 单测（不依赖 Jest）**

Create: `/Users/merrier/repos/zhui/scripts/generate-storybook-stories.test.js`

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { buildItems } = require('./generate-storybook-stories');

const samplePath = path.join(__dirname, 'fixtures', 'stories.sample.json');
const sample = JSON.parse(fs.readFileSync(samplePath, 'utf8'));

const items = buildItems(sample);

assert.ok(Array.isArray(items));
assert.equal(items.length, 2);

const btn = items.find((x) => x.componentKey === 'Button');
assert.ok(btn);
assert.equal(btn.storyName, '浏览样式');

const input = items.find((x) => x.componentKey === 'Input');
assert.ok(input);
assert.equal(input.storyName, '自定义');

console.log('OK');
```

- [ ] **Step 4: 运行单测确认通过**

Run:
```bash
node scripts/generate-storybook-stories.test.js
```

Expected:
- 输出 `OK`
- 退出码为 0

- [ ] **Step 5: 提交（可选）**

```bash
git add scripts/generate-storybook-stories.js scripts/generate-storybook-stories.test.js scripts/fixtures/stories.sample.json
git commit -m "build: add generator for landing story list"
```

---

### Task 2: 让构建产物可部署到 GitHub Pages（storybook/ + storybook-stories.json）

**Files:**
- Modify: [package.json](file:///Users/merrier/repos/zhui/package.json)

- [ ] **Step 1: 增加构建脚本（输出到 `storybook/` 并生成 `storybook-stories.json`）**

在 `scripts` 中加入两个命令：
- `build:storybook`: 输出到 `storybook/`
- `build:site`: `build:storybook` + `generate-storybook-stories.js`

示例（按现有脚本风格添加，不删现有脚本）：

```json
{
  "scripts": {
    "build:storybook": "cross-env NODE_OPTIONS=--openssl-legacy-provider build-storybook -o storybook",
    "build:site": "npm run build:storybook && node scripts/generate-storybook-stories.js"
  }
}
```

- [ ] **Step 2: 运行构建脚本，确认产物生成**

Run:
```bash
npm run build:site
```

Expected:
- 目录 `storybook/` 存在，且包含 `index.html`、`iframe.html`、`stories.json`
- 根目录生成 `storybook-stories.json`

- [ ] **Step 3: 手动核对 story 数量覆盖（粗核对）**

Run:
```bash
node -e "const j=require('./storybook-stories.json'); console.log('items', j.items.length)"
```

Expected:
- `items` 数量应当接近（或等于）`src/stories/*.story.js` 文件数量

- [ ] **Step 4: 提交（可选）**

```bash
git add package.json
git commit -m "build: add site build script for gh-pages"
```

---

### Task 3: 首页组件区改为“嵌入 Storybook 浏览样式”（懒加载 + 折叠）

**Files:**
- Modify: [index.html](file:///Users/merrier/repos/zhui/index.html)

- [ ] **Step 1: 移除当前手写 demo 逻辑（buildDemo/静态示意）**

删除/禁用以下逻辑块（保持页面其它部分不受影响）：
- `buildDemo(...)` 及其相关 CSS（`.demo*`）
- 组件卡片展开处插入 demo 的 DOM
- `components.json` 作为“组件清单来源”的逻辑（组件清单改为 `storybook-stories.json`）

- [ ] **Step 2: 增加 `storybook-stories.json` 加载与渲染**

在页面脚本中新增：
- `loadStoryList()`：fetch `./storybook-stories.json`，失败时展示错误提示
- 筛选维度：
  - `category`（从 JSON）
  - 搜索：匹配 `componentEn/componentCn/kind`

渲染卡片结构（建议）：
- 卡片头：`componentEn` + `componentCn` + category badge
- 卡片描述：可选（暂无则省略）
- `<details>`：`summary` 文案改为 “打开示例（Storybook）”
- `<details>` 展开时：
  - 若 iframe 未加载：设置 `iframe.src = item.iframeUrl`
  - iframe 高度默认 560px（可按需调整）
  - 提供一个 “在 Storybook 打开” 的 link（`item.storybookUrl`）

iframe 建议参数：
- `loading="lazy"`
- `referrerpolicy="no-referrer"`
- `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"`

- [ ] **Step 3: 为 `<details>` 加入懒加载行为**

用事件代理监听 `toggle`：
- 当 `details.open === true` 时，查找内部 iframe，若 `data-src` 存在且 `src` 为空，则把 `src = data-src`

- [ ] **Step 4: 本地静态服务验证**

Run:
```bash
npm run build:site
python3 -m http.server 8010
```

在浏览器打开：
- `http://localhost:8010/`：首页
- 展开任意组件卡片：应看到 Storybook 原样示例与 ShowCode
- 点击 “在 Storybook 打开”：应进入 `storybook/index.html` 的对应 story

- [ ] **Step 5: 覆盖全部组件的逐个对比（验收用）**

对照方式（快速）：
- 首页按类别筛选逐个展开 iframe
- 同时打开 `http://localhost:8010/storybook/index.html`
- 确认首页里每个组件的 iframe 内容与 Storybook 完全一致（因为同源同产物，理论上应一致；此步主要排查漏项/错误 id）

- [ ] **Step 6: 提交（可选）**

```bash
git add index.html storybook-stories.json
git commit -m "feat: embed storybook browse stories in landing page"
```

---

### Task 4:（可选）清理与文档

**Files:**
- Modify: `/Users/merrier/repos/zhui/README.md`（可选）

- [ ] **Step 1: 更新 README 的部署/预览说明（可选）**

增加两条命令：
- `npm run build:site`
- 本地预览 `python3 -m http.server 8010`

- [ ] **Step 2: 提交（可选）**

```bash
git add README.md
git commit -m "docs: add build-site instructions"
```

---

## 自检清单（执行者）
- [ ] `npm run build:site` 可成功生成 `storybook/` 与 `storybook-stories.json`
- [ ] 首页组件清单条目数覆盖 `src/stories/*.story.js` 的全部组件
- [ ] 每个组件仅展示“浏览样式”（无“自定义”）
- [ ] 展开才加载 iframe，页面首屏不卡顿
- [ ] GitHub Pages 上相对路径可用（`./storybook/...`、`./storybook-stories.json`）

