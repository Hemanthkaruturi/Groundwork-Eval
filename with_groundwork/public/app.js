(function () {
  const STORAGE_KEY = 'md2pdf.state';
  const MAX_BODY_BYTES = 1000000; // "about 1 MB" (server limit is 1 MiB)
  const PREVIEW_DELAY_MS = 300;
  const DEFAULTS = {
    markdown: '',
    theme: 'clean',
    page: { size: 'A4', orientation: 'portrait', margins: 'normal', pageNumbers: true },
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    editor: $('editor'), preview: $('preview'), file: $('file'), theme: $('theme'), size: $('size'),
    orientation: $('orientation'), margins: $('margins'), pageNumbers: $('pageNumbers'),
    download: $('download'), messages: $('messages'),
  };

  let uploadedName = null;
  let previewTimer = null;
  let rendering = Promise.resolve();
  let renderedWarnings = [];

  // ---- messages -----------------------------------------------------------
  function showMessages(items) {
    el.messages.replaceChildren();
    for (const { kind, text } of items) {
      const p = document.createElement('p');
      p.className = 'msg ' + kind;
      p.textContent = text;
      el.messages.appendChild(p);
    }
  }

  // ---- state / local storage (FR-10) ---------------------------------------
  function readState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULTS);
      const s = JSON.parse(raw);
      const ok = (list, v, d) => (list.includes(v) ? v : d);
      const p = s && typeof s.page === 'object' && s.page ? s.page : {};
      return {
        markdown: typeof s.markdown === 'string' ? s.markdown : '',
        theme: ok(MdRender.THEMES, s.theme, DEFAULTS.theme),
        page: {
          size: ok(['A4', 'Letter', 'Legal', 'A3'], p.size, DEFAULTS.page.size),
          orientation: ok(['portrait', 'landscape'], p.orientation, DEFAULTS.page.orientation),
          margins: ok(['narrow', 'normal', 'wide'], p.margins, DEFAULTS.page.margins),
          pageNumbers: typeof p.pageNumbers === 'boolean' ? p.pageNumbers : DEFAULTS.page.pageNumbers,
        },
      };
    } catch (e) {
      return structuredClone(DEFAULTS);
    }
  }

  function currentState() {
    return {
      markdown: el.editor.value,
      theme: el.theme.value,
      page: {
        size: el.size.value,
        orientation: el.orientation.value,
        margins: el.margins.value,
        pageNumbers: el.pageNumbers.checked,
      },
    };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState()));
    } catch (e) { /* storage blocked or full: the app still works */ }
  }

  function applyState(s) {
    el.editor.value = s.markdown;
    el.theme.value = s.theme;
    el.size.value = s.page.size;
    el.orientation.value = s.page.orientation;
    el.margins.value = s.page.margins;
    el.pageNumbers.checked = s.page.pageNumbers;
  }

  // ---- preview (FR-2) --------------------------------------------------------
  function renderPreview() {
    const { markdown, theme } = currentState();
    rendering = rendering.then(async () => {
      const { warnings } = await MdRender.render(markdown, el.preview, theme);
      renderedWarnings = warnings;
      document.body.dataset.previewVersion = String((Number(document.body.dataset.previewVersion) || 0) + 1);
    }).catch(() => {});
    return rendering;
  }

  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(renderPreview, PREVIEW_DELAY_MS);
  }

  // ---- upload (FR-1) -----------------------------------------------------------
  el.file.addEventListener('change', async () => {
    const f = el.file.files[0];
    el.file.value = '';
    if (!f) return;
    if (!/\.(md|markdown)$/i.test(f.name)) {
      showMessages([{ kind: 'error', text: 'Only .md or .markdown files can be uploaded.' }]);
      return;
    }
    el.editor.value = await f.text();
    uploadedName = f.name.replace(/\.(md|markdown)$/i, '');
    showMessages([]);
    saveState();
    renderPreview();
  });

  // ---- download (FR-8, FR-9) -----------------------------------------------------
  function safeName(raw) {
    const cleaned = raw.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100);
    return cleaned;
  }

  function pdfFileName() {
    if (uploadedName) return (safeName(uploadedName) || 'document') + '.pdf';
    const h = el.preview.querySelector('h1, h2, h3, h4, h5, h6');
    const fromHeading = h ? safeName(h.textContent) : '';
    return (fromHeading || 'document') + '.pdf';
  }

  el.download.addEventListener('click', async () => {
    const state = currentState();
    if (!state.markdown.trim()) {
      showMessages([{ kind: 'error', text: 'Nothing to export' }]);
      return;
    }
    const body = JSON.stringify(state);
    if (new Blob([body]).size > MAX_BODY_BYTES) {
      showMessages([{ kind: 'error', text: 'This document is larger than the 1 MB limit. Shorten it and try again.' }]);
      return;
    }
    await renderPreview(); // make sure the file name matches the latest text
    el.download.disabled = true;
    showMessages([{ kind: 'info', text: 'Creating PDF…' }]);
    try {
      const res = await fetch('/api/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      if (!res.ok) {
        let msg = 'PDF could not be created. Please try again.';
        try { msg = (await res.json()).error || msg; } catch (e) { /* keep default */ }
        showMessages([{ kind: 'error', text: msg }]);
        return;
      }
      let warnings = [];
      try { warnings = JSON.parse(decodeURIComponent(res.headers.get('X-Render-Warnings') || '[]')); } catch (e) { /* ignore */ }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfFileName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showMessages(warnings.map((w) => ({ kind: 'warning', text: 'Warning: ' + w })));
      el.download.dataset.lastFile = a.download;
    } catch (e) {
      showMessages([{ kind: 'error', text: 'PDF could not be created. Please try again.' }]);
    } finally {
      el.download.disabled = false;
    }
  });

  // ---- wiring ----------------------------------------------------------------------
  el.editor.addEventListener('input', () => {
    if (!el.editor.value) uploadedName = null;
    saveState();
    schedulePreview();
  });
  for (const c of [el.theme, el.size, el.orientation, el.margins, el.pageNumbers]) {
    c.addEventListener('change', () => {
      saveState();
      if (c === el.theme) renderPreview();
    });
  }

  applyState(readState());
  renderPreview();
})();
