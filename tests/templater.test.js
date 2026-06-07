const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { TextEncoder, TextDecoder } = require('util');

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

const { JSDOM } = require('jsdom');

const loadTemplater = async () => {
  const htmlPath = path.resolve(__dirname, '../templater.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, {
    url: 'http://localhost/templater.html',
  });

  const storage = new Map();
  const clipboard = { writeText: jest.fn().mockResolvedValue() };
  const sandbox = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    localStorage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
      removeItem(key) {
        storage.delete(key);
      },
      clear() {
        storage.clear();
      },
    },
    console,
    setTimeout,
    clearTimeout,
    TextEncoder,
    TextDecoder,
  };
  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.window.navigator.clipboard = clipboard;
  sandbox.window.self = sandbox.window;
  sandbox.window.global = sandbox.window;
  sandbox.self = sandbox.window;
  sandbox.global = sandbox.window;

  const context = vm.createContext(sandbox);

  const templaterDataPath = path.resolve(__dirname, '../templater_data.js');
  const templaterDataCode = fs.readFileSync(templaterDataPath, 'utf8');

  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  const scriptContents = [templaterDataCode];

  while ((match = scriptRegex.exec(html)) !== null) {
    const attrs = match[1];
    const content = match[2];
    if (/\bsrc\s*=/.test(attrs)) continue;
    scriptContents.push(content);
  }

  const exportNames = [
    'prepItemForDisplay',
    'replaceCurly',
    'replaceSquare',
    'promptReplaceSquare',
    'addToRegistry',
    'clickLabel',
    'toggleFolder',
    'globalData',
  ];
  const exportScript = exportNames.map((name) => `window.${name} = ${name};`).join('\n');

  const fullScript = scriptContents.join('\n') + '\n' + exportScript;
  vm.runInContext(fullScript, context, { filename: htmlPath });

  return sandbox.window;
};

describe('templater.html JavaScript', () => {
  let window;

  beforeAll(async () => {
    window = await loadTemplater();
  });

  it('loads templater functions', () => {
    expect(typeof window.prepItemForDisplay).toBe('function');
    expect(typeof window.replaceCurly).toBe('function');
    expect(typeof window.replaceSquare).toBe('function');
    expect(typeof window.addToRegistry).toBe('function');
  });

  it('replaceCurly replaces direct keys only', () => {
    const result = window.replaceCurly('Hello {name}, age {age}', { name: 'Alice', age: 30 });
    expect(result).toBe('Hello Alice, age 30');
  });

  it('replaceCurly does not replace missing keys', () => {
    const result = window.replaceCurly('Hello {unknown}!', { name: 'Alice' });
    expect(result).toBe('Hello {unknown}!');
  });

  it('prepItemForDisplay applies replacement from object context', () => {
    const item = window.prepItemForDisplay('greeting', 'Hello {name}', '', { name: 'Bob' });
    expect(item.value).toBe('Hello Bob');
    expect(item.valueBrief).toBe('Hello Bob');
  });

  it('replaceSquare substitutes bracket values from globalData.lsData', () => {
    window.globalData.lsData = { '[foo]': 'bar', '[id]': '123' };
    const result = window.replaceSquare('https://example.com/[foo]/[id]');
    expect(result).toBe('https://example.com/bar/123');
  });

  it('clickLabel copies registered object when meta key is down', async () => {
    window.navigator.clipboard = { writeText: jest.fn().mockResolvedValue() };
    const uuid = window.addToRegistry({ x: 'y' });
    const clickEvent = new window.MouseEvent('click', { metaKey: true });

    await window.clickLabel(clickEvent, uuid);

    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(JSON.stringify({ x: 'y' }, null, 2));
  });

  it('toggleFolder toggles folder class and copies object with meta key', async () => {
    const uuid = window.addToRegistry({ foo: 'bar' });
    const folder = window.document.createElement('div');
    folder.dataset.childrenUuid = uuid;
    folder.className = 'item-list hidden-folder';
    window.document.body.appendChild(folder);

    const clickEvent = new window.MouseEvent('click', { metaKey: true });
    window.navigator.clipboard = { writeText: jest.fn().mockResolvedValue() };

    await window.toggleFolder(clickEvent, uuid);

    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(JSON.stringify({ foo: 'bar' }, null, 2));
    expect(folder.classList.contains('hidden-folder')).toBe(true);
  });
});
