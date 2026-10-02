// Shared renderer: used by the editor preview AND the PDF print page (FR-8).
// Classic script. Requires highlight.js, katex, mermaid, markdown-it-task-lists and texmath to be loaded first.
(function () {
  const IMAGE_TIMEOUT_MS = 10000;
  const THEMES = ['clean', 'github', 'dark', 'print'];

  let deps = null;
  let currentWarnings = [];

  async function load() {
    if (deps) return deps;
    const { default: markdownit } = await import('/vendor/markdown-it/browser/markdown-it.esm.min.mjs');
    const hljs = window.hljs;
    // eslint-disable-next-line no-undef
    const texmathPlugin = typeof texmath !== 'undefined' ? texmath : window.texmath;

    const katexEngine = {
      renderToString(tex, opts) {
        try {
          return window.katex.renderToString(tex, { ...opts, throwOnError: true });
        } catch (e) {
          currentWarnings.push('Math could not be rendered: ' + String(e.message).split('\n')[0]);
          const esc = tex.replace(/&/g, '&amp;').replace(/</g, '&lt;');
          return '<span class="render-error">Math error: ' + esc + '</span>';
        }
      },
    };

    const md = markdownit({
      html: true,
      linkify: true,
      highlight(code, lang) {
        const escaped = md.utils.escapeHtml(code);
        if (lang === 'mermaid') {
          return '<pre class="mermaid-src">' + escaped + '</pre>';
        }
        if (lang && hljs.getLanguage(lang)) {
          try {
            return '<pre class="hljs"><code>' + hljs.highlight(code, { language: lang }).value + '</code></pre>';
          } catch (e) { /* fall through */ }
        }
        return '<pre class="hljs"><code>' + escaped + '</code></pre>';
      },
    });
    md.use(window.markdownitTaskLists, { enabled: false, label: true });
    md.use(texmathPlugin, { engine: katexEngine, delimiters: 'dollars' });
    deps = { md };
    return deps;
  }

  function placeholder(text) {
    const span = document.createElement('span');
    span.className = 'render-error';
    span.textContent = text;
    return span;
  }

  async function settleImages(container) {
    const imgs = Array.from(container.querySelectorAll('img'));
    await Promise.all(imgs.map((img) => new Promise((resolve) => {
      const fail = (why) => {
        currentWarnings.push('Image could not be loaded: ' + (img.getAttribute('src') || '').slice(0, 80) + (why ? ' (' + why + ')' : ''));
        img.replaceWith(placeholder('[image not available: ' + (img.getAttribute('alt') || 'image') + ']'));
        resolve();
      };
      if (img.complete) {
        if (img.naturalWidth > 0) return resolve();
        return fail();
      }
      const timer = setTimeout(() => fail('timed out'), IMAGE_TIMEOUT_MS);
      img.addEventListener('load', () => { clearTimeout(timer); resolve(); });
      img.addEventListener('error', () => { clearTimeout(timer); fail(); });
    })));
  }

  let mermaidCounter = 0;
  async function renderDiagrams(container, theme) {
    const blocks = Array.from(container.querySelectorAll('pre.mermaid-src'));
    if (!blocks.length) return;
    window.mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
    });
    for (const block of blocks) {
      const id = 'mmd-' + (++mermaidCounter);
      try {
        const { svg } = await window.mermaid.render(id, block.textContent);
        const holder = document.createElement('div');
        holder.className = 'mermaid-diagram';
        holder.innerHTML = svg;
        block.replaceWith(holder);
      } catch (e) {
        currentWarnings.push('Diagram could not be rendered: ' + String(e.message || e).split('\n')[0]);
        const stray = document.getElementById('d' + id);
        if (stray) stray.remove();
        block.replaceWith(placeholder('[diagram error: invalid Mermaid syntax]'));
      }
    }
  }

  // Renders markdown into `container` using `theme`. Resolves with { warnings }.
  async function render(markdown, container, theme) {
    const t = THEMES.includes(theme) ? theme : 'clean';
    currentWarnings = [];
    const { md } = await load();
    container.setAttribute('data-theme', t);
    container.classList.add('md-body');
    container.innerHTML = md.render(markdown);
    await renderDiagrams(container, t);
    await settleImages(container);
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    return { warnings: currentWarnings.slice() };
  }

  window.MdRender = { render, THEMES };
})();
