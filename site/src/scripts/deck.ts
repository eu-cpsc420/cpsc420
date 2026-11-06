/**
 * Lecture page runtime.
 *
 * One page, three ways to use it:
 *  - Reading: scroll through slides + notes (stacked / side by side / grid).
 *    A scroll-spy keeps track of the slide in view, so "Present" starts there.
 *  - Presenting: body.presenting shows only the current slide, full screen.
 *    Esc returns to the reading view at the same slide.
 *  - Presenter view: the same page opened with ?presenter (press S). It shows
 *    the current slide, next slide, notes, and a timer, and stays in sync with
 *    every other window of this lecture through a BroadcastChannel.
 */

type State = { index: number; step: number };
type Message =
  | ({ type: 'state'; sender: string } & State)
  | { type: 'hello'; sender: string };

const LAYOUTS = ['stacked', 'side', 'grid'] as const;
type Layout = (typeof LAYOUTS)[number];

function store(key: string, value?: string): string | null {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch {}
  return null;
}
function session(key: string, value?: string | null): string | null {
  try {
    if (value === undefined) return sessionStorage.getItem(key);
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {}
  return null;
}

/** Elements revealed one at a time while presenting, in document order. */
function collectSteps(frame: Element): HTMLElement[] {
  const found = new Set<HTMLElement>();
  frame.querySelectorAll<HTMLElement>('.steps').forEach((container) => {
    for (const child of Array.from(container.children) as HTMLElement[]) {
      if (child.matches('ul, ol')) child.querySelectorAll<HTMLElement>(':scope > li').forEach((li) => found.add(li));
      else found.add(child);
    }
  });
  frame.querySelectorAll<HTMLElement>('.step').forEach((el) => found.add(el));
  const list = [...found].sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  list.forEach((el) => el.classList.add('step'));
  return list;
}

export function initDeck() {
  const deck = document.querySelector<HTMLElement>('.deck');
  if (!deck) return;
  const body = document.body;
  const deckId = deck.dataset.deckId ?? location.pathname;
  const units = Array.from(deck.querySelectorAll<HTMLElement>('.unit.has-slide'));
  const frames = units.map((u) => u.querySelector<HTMLElement>('.slide-frame')!);
  const steps = frames.map(collectSteps);
  const total = frames.length;
  if (total === 0) return;

  const sender = Math.random().toString(36).slice(2);
  const isPresenterView = new URLSearchParams(location.search).has('presenter');
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel(`deck:${deckId}`) : null;

  const state: State = { index: 0, step: 0 };
  let suppressSpyUntil = 0;
  const clamp = (i: number) => Math.max(0, Math.min(total - 1, i));

  const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);
  const hudBar = $('.present-hud .bar');
  const gotoIndicator = $('.goto-indicator');
  const toc = $('.toc');
  const tocLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.toc a[data-n]'));
  const helpDialog = $<HTMLDialogElement>('dialog.help');

  // ---------- "Present from here" buttons ----------
  frames.forEach((frame, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn present-here';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg> Present';
    btn.title = 'Present from this slide';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      startPresenting(i);
    });
    frame.appendChild(btn);
  });

  // ---------- Rendering ----------
  function applyState({ index, step }: State, opts: { silent?: boolean; scroll?: boolean; initial?: boolean } = {}) {
    state.index = clamp(index);
    state.step = Math.max(0, Math.min(steps[state.index].length, step));

    units.forEach((u, i) => u.classList.toggle('current', i === state.index));
    steps.forEach((list, i) =>
      list.forEach((el, k) => {
        const shown = i !== state.index ? true : k < state.step;
        el.classList.toggle('shown', shown);
        el.classList.toggle('next-step', i === state.index && k === state.step);
      }),
    );
    if (hudBar) hudBar.style.width = `${((state.index + 1) / total) * 100}%`;
    highlightToc();
    const hash = `#s${state.index + 1}`;
    if (!opts.initial && location.hash !== hash) history.replaceState(null, '', location.pathname + location.search + hash);

    if (isPresenterView) renderPresenter();
    else if (opts.scroll && !body.classList.contains('presenting')) {
      suppressSpyUntil = Date.now() + 900;
      frames[state.index].closest('.unit')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    if (!opts.silent) channel?.postMessage({ type: 'state', sender, ...state } satisfies Message);
  }

  function highlightToc() {
    tocLinks.forEach((a) => a.classList.toggle('active', Number(a.dataset.n) === state.index + 1));
    const active = tocLinks[state.index];
    if (toc && active) {
      const top = active.offsetTop, bottom = top + active.offsetHeight;
      if (top < toc.scrollTop + 40) toc.scrollTop = top - 40;
      else if (bottom > toc.scrollTop + toc.clientHeight - 40) toc.scrollTop = bottom - toc.clientHeight + 40;
    }
  }

  // ---------- Navigation ----------
  function next() {
    if (state.step < steps[state.index].length) applyState({ index: state.index, step: state.step + 1 });
    else if (state.index < total - 1) applyState({ index: state.index + 1, step: 0 });
  }
  function prev() {
    if (state.step > 0) applyState({ index: state.index, step: state.step - 1 });
    else if (state.index > 0) applyState({ index: state.index - 1, step: steps[state.index - 1].length });
  }
  const nextSlide = () => applyState({ index: state.index + 1, step: 0 });
  const prevSlide = () => applyState({ index: state.index - 1, step: 0 });
  const goTo = (i: number) => applyState({ index: i, step: 0 });

  // ---------- Presenting ----------
  const presentKey = `presenting:${deckId}`;
  function startPresenting(from = state.index, fullscreen = true) {
    body.classList.add('presenting');
    body.classList.remove('toc-open');
    session(presentKey, '1');
    applyState({ index: from, step: 0 });
    if (fullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    bumpIdle();
  }
  function stopPresenting() {
    body.classList.remove('presenting', 'blackout');
    session(presentKey, null);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    frames[state.index].closest('.unit')?.scrollIntoView({ block: 'start' });
  }
  const toggleFullscreen = () =>
    document.fullscreenElement
      ? document.exitFullscreen?.().catch(() => {})
      : document.documentElement.requestFullscreen?.().catch(() => {});

  function openPresenterView() {
    const url = `${location.pathname}?presenter#s${state.index + 1}`;
    window.open(url, `presenter:${deckId}`, 'width=1280,height=800');
  }

  let idleTimer: number | undefined;
  function bumpIdle() {
    body.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => body.classList.add('idle'), 2200);
  }

  // ---------- Reading view: scroll-spy ----------
  let spyQueued = false;
  function spy() {
    spyQueued = false;
    if (body.classList.contains('presenting') || isPresenterView || Date.now() < suppressSpyUntil) return;
    // A slide is "current" once its top passes a line 35% down the viewport
    // (further down at the very bottom of the page, so the last slides can be reached).
    const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
    const line = innerHeight * (atBottom ? 0.7 : 0.35);
    let current = 0;
    let bestTop = -Infinity;
    for (let i = 0; i < frames.length; i++) {
      const r = frames[i].getBoundingClientRect();
      if (r.height === 0) continue;
      // In grid layout several slides share a row: keep the first one of the lowest row above the line.
      if (r.top <= line && r.top > bestTop + 1) { current = i; bestTop = r.top; }
    }
    if (current !== state.index) applyState({ index: current, step: 0 }, { silent: true });
  }
  addEventListener('scroll', () => {
    if (!spyQueued) { spyQueued = true; requestAnimationFrame(spy); }
  }, { passive: true });

  // ---------- Layout switch ----------
  const layoutButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.layout-switch button'));
  function setLayout(layout: Layout, keepPlace = true) {
    const anchor = frames[state.index];
    suppressSpyUntil = Date.now() + 300;
    deck!.dataset.layout = layout;
    layoutButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.layout === layout)));
    store('deck-layout', layout);
    if (keepPlace && anchor) anchor.closest('.unit')?.scrollIntoView({ block: 'start' });
  }
  layoutButtons.forEach((b) => b.addEventListener('click', () => setLayout(b.dataset.layout as Layout)));
  const savedLayout = store('deck-layout') as Layout | null;
  setLayout(savedLayout && LAYOUTS.includes(savedLayout) ? savedLayout : 'stacked', false);

  // Grid: clicking a thumbnail opens it with its notes.
  frames.forEach((frame, i) =>
    frame.addEventListener('click', (e) => {
      if (deck.dataset.layout !== 'grid' || body.classList.contains('presenting')) return;
      if ((e.target as Element).closest('a, button')) return;
      state.index = i;
      setLayout('stacked');
    }),
  );

  // ---------- Presenter view ----------
  const presenter = $('.presenter');
  const timerEl = $('.presenter .timer');
  const clockEl = $('.presenter .clock');
  let timerStart = Date.now();
  let pausedAt: number | null = null;

  function cloneFrame(i: number) {
    const clone = frames[i].cloneNode(true) as HTMLElement;
    clone.querySelector('.present-here')?.remove();
    clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    return clone;
  }

  function renderPresenter() {
    if (!presenter) return;
    const i = state.index;
    presenter.querySelector('.presenter-current')!.replaceChildren(cloneFrame(i));
    const remaining = steps[i].length - state.step;
    const nextSlot = presenter.querySelector('.next-slot')!;
    const nextLabel = presenter.querySelector('.presenter-next .label')!;
    nextLabel.textContent = remaining > 0 ? `Next slide · ${remaining} more step${remaining > 1 ? 's' : ''} on this one` : 'Next slide';
    if (i < total - 1) {
      const nf = cloneFrame(i + 1);
      nf.querySelectorAll('.step').forEach((el) => el.classList.add('shown'));
      nextSlot.replaceChildren(nf);
    } else {
      const end = document.createElement('div');
      end.className = 'end';
      end.textContent = 'End of lecture';
      nextSlot.replaceChildren(end);
    }
    const unit = units[i];
    const notes = unit.querySelector('.notes')?.cloneNode(true);
    const speaker = unit.querySelector('.speaker-notes')?.cloneNode(true);
    const notesSlot = presenter.querySelector('.notes-slot')!;
    const parts: Node[] = [];
    if (notes) parts.push(notes);
    if (speaker) parts.push(speaker);
    if (!parts.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'No notes for this slide.';
      parts.push(empty);
    }
    notesSlot.replaceChildren(...parts);
    presenter.querySelector('.presenter-notes')!.scrollTop = 0;
    presenter.querySelector('.count')!.textContent = `${i + 1} / ${total}`;
  }

  function tick() {
    const elapsed = Math.floor(((pausedAt ?? Date.now()) - timerStart) / 1000);
    const h = Math.floor(elapsed / 3600), m = Math.floor((elapsed % 3600) / 60), s = elapsed % 60;
    if (timerEl) timerEl.textContent = `${h ? h + ':' + String(m).padStart(2, '0') : m}:${String(s).padStart(2, '0')}`;
    if (clockEl) clockEl.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  if (isPresenterView && presenter) {
    body.classList.add('presenter-mode');
    presenter.hidden = false;
    document.title = `Presenter · ${document.title}`;
    const size = Number(store('presenter-notes-size')) || 1.15;
    presenter.style.setProperty('--presenter-notes-size', `${size}rem`);
    presenter.addEventListener('click', (e) => {
      const action = (e.target as Element).closest<HTMLElement>('[data-action]')?.dataset.action;
      if (action === 'next') next();
      else if (action === 'prev') prev();
      else if (action === 'timer-reset') { timerStart = Date.now(); pausedAt = null; tick(); }
      else if (action === 'notes-bigger' || action === 'notes-smaller') {
        const cur = parseFloat(presenter.style.getPropertyValue('--presenter-notes-size')) || 1.15;
        const nextSize = Math.max(0.8, Math.min(2.4, cur + (action === 'notes-bigger' ? 0.1 : -0.1)));
        presenter.style.setProperty('--presenter-notes-size', `${nextSize.toFixed(2)}rem`);
        store('presenter-notes-size', nextSize.toFixed(2));
      }
    });
    timerEl?.addEventListener('click', () => {
      if (pausedAt === null) pausedAt = Date.now();
      else { timerStart += Date.now() - pausedAt; pausedAt = null; }
      tick();
    });
    setInterval(tick, 1000);
    tick();
  }

  // ---------- Sync between windows ----------
  if (channel) {
    channel.onmessage = (e: MessageEvent<Message>) => {
      const msg = e.data;
      if (msg.sender === sender) return;
      if (msg.type === 'hello') channel.postMessage({ type: 'state', sender, ...state } satisfies Message);
      else if (msg.type === 'state') applyState(msg, { silent: true, scroll: true });
    };
  }

  // ---------- Input ----------
  let gotoBuffer = '';
  let gotoTimer: number | undefined;
  function showGoto() {
    if (!gotoIndicator) return;
    gotoIndicator.textContent = gotoBuffer ? `Go to ${gotoBuffer}` : '';
    gotoIndicator.classList.toggle('show', !!gotoBuffer);
  }

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable]')) return;
    if (helpDialog?.open) return;

    const presenting = body.classList.contains('presenting') || isPresenterView;
    const key = e.key;

    if (key === '?') { helpDialog?.showModal(); e.preventDefault(); return; }

    if (presenting) {
      if (/^[0-9]$/.test(key)) {
        gotoBuffer += key;
        showGoto();
        clearTimeout(gotoTimer);
        gotoTimer = window.setTimeout(() => { gotoBuffer = ''; showGoto(); }, 2500);
        return;
      }
      if (key === 'Enter' && gotoBuffer) {
        goTo(Number(gotoBuffer) - 1);
        gotoBuffer = '';
        showGoto();
        e.preventDefault();
        return;
      }
      switch (key) {
        case 'ArrowRight': case ' ': case 'PageDown': case 'Enter': case 'n': case 'l':
          next(); break;
        case 'ArrowLeft': case 'PageUp': case 'Backspace': case 'p': case 'h':
          if (key === 'p' && !isPresenterView) { stopPresenting(); break; }
          prev(); break;
        case 'ArrowDown': case 'j': nextSlide(); break;
        case 'ArrowUp': case 'k': prevSlide(); break;
        case 'Home': goTo(0); break;
        case 'End': goTo(total - 1); break;
        case 'f': case 'F': toggleFullscreen(); break;
        case 'b': case 'B': case '.': body.classList.toggle('blackout'); break;
        case 'Escape': if (!isPresenterView) stopPresenting(); break;
        case 's': case 'S': if (!isPresenterView) openPresenterView(); break;
        default: return;
      }
      e.preventDefault();
      return;
    }

    // Reading view
    switch (key) {
      case 'p': case 'P': startPresenting(); break;
      case 's': case 'S': openPresenterView(); break;
      case '1': case '2': case '3': setLayout(LAYOUTS[Number(key) - 1]); break;
      case 'j': frames[clamp(state.index + 1)].closest('.unit')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); break;
      case 'k': frames[clamp(state.index - 1)].closest('.unit')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); break;
      case 'n': case 'N': body.classList.toggle('show-speaker'); break;
      default: return;
    }
    e.preventDefault();
  });

  // Click / tap while presenting: right two-thirds = next, left third = back.
  document.addEventListener('click', (e) => {
    if (!body.classList.contains('presenting')) return;
    const t = e.target as Element;
    if (t.closest('a, button, .present-controls, pre, input, video')) return;
    if (e.clientX < innerWidth / 3) prev();
    else next();
  });
  let touchX = 0, touchY = 0;
  document.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (!body.classList.contains('presenting')) return;
    const dx = e.changedTouches[0].clientX - touchX, dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { (dx < 0 ? next : prev)(); }
  });
  document.addEventListener('mousemove', () => { if (body.classList.contains('presenting')) bumpIdle(); });

  $('.present-controls')?.addEventListener('click', (e) => {
    const action = (e.target as Element).closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'next') next();
    else if (action === 'prev') prev();
    else if (action === 'fullscreen') toggleFullscreen();
    else if (action === 'exit') stopPresenting();
  });
  $('.present-btn')?.addEventListener('click', () => startPresenting());
  $('.presenter-btn')?.addEventListener('click', openPresenterView);
  $('.help-btn')?.addEventListener('click', () => helpDialog?.showModal());
  $('.toc-toggle')?.addEventListener('click', () => body.classList.toggle('toc-open'));
  tocLinks.forEach((a) => a.addEventListener('click', () => body.classList.remove('toc-open')));

  // ---------- Initial state ----------
  const m = /^#s(\d+)$/.exec(location.hash);
  const initial = m ? clamp(Number(m[1]) - 1) : 0;
  // `initial` skips writing #s1 to the URL before load: Chrome would then scroll to it.
  applyState({ index: initial, step: 0 }, { silent: true, initial: true });
  if (isPresenterView) channel?.postMessage({ type: 'hello', sender } satisfies Message);
  else if (session(presentKey)) startPresenting(initial, false);
  else spy();
}
