const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STORYBOOK_DIR = path.join(ROOT, 'storybook');
const STORIES_DIR = path.join(ROOT, 'src', 'stories');
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
  Swtich: '表单',
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

const splitKind = kind => {
  const s = String(kind || '').trim();
  if (!s) return { cn: '', en: '' };
  const m = s.match(/^(.*?)\s+([A-Za-z][A-Za-z0-9_-]*)\s*$/);
  if (m) return { cn: m[1].trim(), en: m[2].trim() };
  return { cn: s, en: '' };
};

const sanitize = string =>
  String(string || '')
    .toLowerCase()
    .replace(/[ ’–—―′¿'`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

const sanitizeSafe = (string, part) => {
  const sanitized = sanitize(string);
  if (sanitized === '') {
    throw new Error(`Invalid ${part} '${string}', must include alphanumeric characters`);
  }
  return sanitized;
};

const toId = (kind, name) => `${sanitizeSafe(kind, 'kind')}--${sanitizeSafe(name, 'name')}`;

const listStoryFiles = () => {
  if (!fs.existsSync(STORIES_DIR)) return [];
  return fs
    .readdirSync(STORIES_DIR)
    .filter(f => f.endsWith('.story.js'))
    .filter(f => f !== 'introduce.story.js')
    .sort();
};

const parseStoryFile = source => {
  const kindMatch = source.match(/storiesOf\(\s*['"]([^'"]+)['"]\s*,\s*module\s*\)/);
  const kind = kindMatch ? kindMatch[1] : '';
  const adds = [];
  const addRegex = /\.add\(\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = addRegex.exec(source))) {
    adds.push(m[1]);
  }
  return { kind, storyNames: adds };
};

const buildItems = storyFiles => {
  const items = [];

  for (const file of storyFiles) {
    const abs = path.join(STORIES_DIR, file);
    const source = fs.readFileSync(abs, 'utf8');
    const { kind, storyNames } = parseStoryFile(source);
    if (!kind) continue;
    if (!Array.isArray(storyNames) || storyNames.length === 0) continue;

    const storyName = storyNames.includes('浏览样式') ? '浏览样式' : storyNames[0];
    const storyId = toId(kind, storyName);
    const { cn, en } = splitKind(kind);
    const componentKey = en || kind;
    const category = CATEGORY_MAP[componentKey] || '未分类';

    const iframeUrl = `./storybook/iframe.html?id=${encodeURIComponent(storyId)}&viewMode=story`;
    const storybookUrl = `./storybook/index.html?path=/story/${encodeURIComponent(storyId)}`;

    items.push({
      kind,
      componentKey,
      componentCn: cn,
      componentEn: en,
      category,
      storyId,
      storyName,
      iframeUrl,
      storybookUrl
    });
  }

  items.sort((a, b) => (a.category + a.componentKey).localeCompare(b.category + b.componentKey, 'zh-CN'));
  return items;
};

const main = () => {
  if (!fs.existsSync(path.join(STORYBOOK_DIR, 'iframe.html'))) {
    process.stderr.write(`Missing ${STORYBOOK_DIR}/iframe.html. Run build-storybook first.\n`);
    process.exit(1);
  }
  const storyFiles = listStoryFiles();
  const items = buildItems(storyFiles);
  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: 'src/stories/*.story.js',
    items
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  process.stdout.write(`Wrote ${OUT_JSON} (${items.length} items)\n`);
};

if (require.main === module) main();

module.exports = { buildItems, splitKind, parseStoryFile, toId, sanitize };
