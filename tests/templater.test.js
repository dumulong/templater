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

  const clipboard = { writeText: jest.fn().mockResolvedValue() };
  const sandbox = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    localStorage: dom.window.localStorage,
    console,
    setTimeout,
    clearTimeout,
    TextEncoder,
    TextDecoder,
    prompt: dom.window.prompt,
  };
  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.window.navigator.clipboard = clipboard;
  sandbox.window.prompt = sandbox.prompt;
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
    'displayItem',
    'displayObj',
    'replaceCurly',
    'replaceSquare',
    'promptReplaceSquare',
    'addToRegistry',
    'clickLabel',
    'toggleFolder',
    'parseLsData',
    'updateDisplayAfterReplacement',
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
    const dialog = window.document.getElementById('myDialog');
    dialog.show = function () { this.setAttribute('open', ''); };
    dialog.close = function () { this.removeAttribute('open'); };
  });

  it('loads templater functions', () => {
    expect(typeof window.displayItem).toBe('function');
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

  it('displayItem applies replacement from object context', () => {
    const item = window.displayItem('greeting', 'Hello {name}', '', { name: 'Bob' });
    const container = window.document.createElement('div');
    container.innerHTML = item;

    const renderedItem = container.querySelector('.item-container');
    expect(renderedItem.getAttribute('data-value')).toBe('Hello Bob');
    expect(renderedItem.textContent).toContain('Hello Bob');
  });

  it('displayItem can hide the copy button for array headers', () => {
    const item = window.displayItem('items', '', 'array-uuid', {}, { hideCopyButton: true });
    const container = window.document.createElement('div');
    container.innerHTML = item;

    expect(container.querySelector('.copy-button')).toBeNull();
  });

  it('displayObj resolves curly placeholders from parent folder context in nested objects', () => {
    const result = window.displayObj({ city: 'Paris', person: { greeting: 'Hello {city}' } }, [], true);
    const html = result.join('');

    expect(html).toContain('Hello Paris');
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

  it('clickLabel resolves nested curly and square placeholders without changing the registered object', async () => {
    window.navigator.clipboard = { writeText: jest.fn().mockResolvedValue() };
    window.globalData.lsData = { '[host]': 'example.com' };
    const registeredObject = {
      name: 'Ada',
      profile: { greeting: 'Hello {city} at [host]' },
      entries: ['{name} [host]', { label: 'Welcome, {name}' }],
    };
    const originalObject = JSON.stringify(registeredObject);
    const uuid = window.addToRegistry(registeredObject, { city: 'Paris' });
    const clickEvent = new window.MouseEvent('click', { metaKey: true });

    await window.clickLabel(clickEvent, uuid);

    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(JSON.stringify({
      name: 'Ada',
      profile: { greeting: 'Hello Paris at example.com' },
      entries: ['Ada example.com', { label: 'Welcome, Ada' }],
    }, null, 2));
    expect(JSON.stringify(window.globalData.registry.get(uuid))).toBe(originalObject);
  });

  it('clickLabel resolves inherited values from an object rendered through nested folders', async () => {
    window.navigator.clipboard = { writeText: jest.fn().mockResolvedValue() };
    window.globalData.lsData = { '[host]': 'example.com' };
    const source = {
      username: 'Mira',
      profile: { details: { greeting: 'Hello {username} at [host]' } },
    };
    window.displayObj(source, [], true);
    const [uuid] = [...window.globalData.registry.entries()]
      .find(([, registeredObject]) => registeredObject.profile === source.profile);

    await window.clickLabel(new window.MouseEvent('click', { metaKey: true }), uuid);

    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(JSON.stringify({
      profile: { details: { greeting: 'Hello Mira at example.com' } },
    }, null, 2));
  });

  it('toggleFolder toggles folder class and copies object with meta key', async () => {
    const uuid = window.addToRegistry({ foo: 'bar' });
    const folder = window.document.createElement('div');
    folder.dataset.uuid = uuid;
    folder.className = 'item-list hidden-folder';
    window.document.body.appendChild(folder);

    const clickEvent = new window.MouseEvent('click', { metaKey: true });
    window.navigator.clipboard = { writeText: jest.fn().mockResolvedValue() };

    await window.toggleFolder(clickEvent, uuid);

    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(JSON.stringify({ foo: 'bar' }, null, 2));
    expect(folder.classList.contains('hidden-folder')).toBe(true);
  });

  it('toggleFolder resolves placeholders in copied objects without changing the registry entry', async () => {
    window.navigator.clipboard = { writeText: jest.fn().mockResolvedValue() };
    window.globalData.lsData = { '[host]': 'example.com' };
    const registeredObject = { folder: { greeting: 'Hello {name} at [host]' } };
    const originalObject = JSON.stringify(registeredObject);
    const uuid = window.addToRegistry(registeredObject, { name: 'Mira' });
    const folder = window.document.createElement('div');
    folder.dataset.uuid = uuid;
    window.document.body.appendChild(folder);

    await window.toggleFolder(new window.MouseEvent('click', { metaKey: true }), uuid);

    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(JSON.stringify({
      folder: { greeting: 'Hello Mira at example.com' },
    }, null, 2));
    expect(JSON.stringify(window.globalData.registry.get(uuid))).toBe(originalObject);
  });

  it('toggleFolder toggles the folder class without the meta key', () => {
    const folder = window.document.createElement('div');
    folder.dataset.uuid = 'folder-1';
    folder.className = 'item-list hidden-folder';
    window.document.body.appendChild(folder);

    const clickEvent = new window.MouseEvent('click', { metaKey: false });
    window.toggleFolder(clickEvent, 'folder-1');

    expect(folder.classList.contains('hidden-folder')).toBe(false);
  });

  it('promptReplaceSquare waits for modal input and stores the response', async () => {
    window.globalData.lsData = {};
    window.localStorage.clear();

    const resultPromise = window.promptReplaceSquare('Hello [name]');
    const dialog = window.document.getElementById('myDialog');
    const input = dialog.querySelector('#dialogInput');

    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('#dialogPrompt').textContent).toBe('[name]');
    expect(input.value).toBe('');

    input.value = 'Alice';
    dialog.querySelector('.dialog-content').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

    await expect(resultPromise).resolves.toBe('Hello Alice');
    expect(dialog.open).toBe(false);
    expect(window.globalData.lsData['[name]']).toBe('Alice');
    expect(window.localStorage.getItem('templaterLS')).toBe(JSON.stringify({ '[name]': 'Alice' }));
  });

  it('dialog can be dragged by its title bar', () => {
    const dialog = window.document.getElementById('myDialog');
    const titlebar = dialog.querySelector('#dialogTitlebar');
    const rect = { left: 100, top: 80, width: 300, height: 200 };
    jest.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      ...rect,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    });
    dialog.show();

    titlebar.dispatchEvent(new window.MouseEvent('pointerdown', {
      bubbles: true,
      button: 0,
      clientX: 120,
      clientY: 90,
    }));
    window.dispatchEvent(new window.MouseEvent('pointermove', {
      pointerId: undefined,
      clientX: 170,
      clientY: 130,
    }));
    window.dispatchEvent(new window.MouseEvent('pointerup'));

    expect(dialog.style.left).toBe('150px');
    expect(dialog.style.top).toBe('120px');
    dialog.close();
    dialog.style.left = '';
    dialog.style.top = '';
    dialog.style.transform = '';
    dialog.getBoundingClientRect.mockRestore();
  });

  it('promptReplaceSquare stops when the modal is cancelled', async () => {
    window.globalData.lsData = {};

    const resultPromise = window.promptReplaceSquare('Hello [name]');
    window.document.querySelector('.dialog-cancel').click();

    await expect(resultPromise).resolves.toBe(false);
    expect(window.globalData.lsData).toEqual({});
  });

  it('parseLsData loads persisted values into globalData', () => {
    window.localStorage.setItem('templaterLS', JSON.stringify({ '[foo]': 'bar', name: 'Alice' }));

    window.parseLsData();

    expect(window.globalData.lsData).toEqual({ '[foo]': 'bar', name: 'Alice' });
  });

  it('updates every displayed item when a shared square-bracket value changes', () => {
    window.globalData.lsData = { '[name]': 'Alice' };
    window.document.body.innerHTML = `
      <div class="item-container" data-uuid="1" data-value="Hello [name]"><div class="item-value-brief"></div></div>
      <div class="item-container" data-uuid="2" data-value="Hi [name]"><div class="item-value-brief"></div></div>
    `;

    window.updateDisplayAfterReplacement();

    const briefs = Array.from(window.document.querySelectorAll('.item-value-brief'));
    expect(briefs.map((el) => el.textContent)).toEqual(['Hello Alice', 'Hi Alice']);

    window.globalData.lsData['[name]'] = 'Bob';
    window.updateDisplayAfterReplacement();

    expect(briefs.map((el) => el.textContent)).toEqual(['Hello Bob', 'Hi Bob']);
  });
});
