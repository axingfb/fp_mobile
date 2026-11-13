(() => {
  const detail = document.querySelector('.detail');
  const games = ['Fortune Treasures', 'Super Ace', 'Gold Miner', 'Lucky Slots', '777', 'Sugar Rush'].map((name, i) => ({name, id: i + 1}));
  const categories = {slot: 'Slots', casino: 'Casino', poker: 'Poker', arcade: 'Arcade', bingo: 'Bingo', fishing: 'Fishing'};
  const searchIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
  const backIcon = '<img class="ui-icon" src="components/ui/icons/back.svg" alt="">';
  let history = [];
  try { const saved = JSON.parse(localStorage.fpSearchHistory || '[]'); if (Array.isArray(saved)) history = saved.filter(x => typeof x === 'string').slice(0, 8); } catch {}
  const save = () => { try { localStorage.fpSearchHistory = JSON.stringify(history); } catch {} };
  function covers(target, items, returnTo) {
    target.replaceChildren();
    items.forEach(game => {
      const link = document.createElement('a'); link.className = 'game-entry'; link.href = '#/game/' + game.id; link.setAttribute('aria-label', game.name);
      const img = document.createElement('img'); img.src = `assets/game${game.id}-clean.png`; img.alt = game.name; link.append(img);
      link.onclick = () => { sessionStorage.fpGameReturn = returnTo; }; target.append(link);
    });
  }
  const providerSets = {
    slot: ['All Games', 'FASTSPIN', 'JILI', 'PG', 'PP', 'FC', 'MI SLOT', 'YELLOWBAT', 'JDB', 'PLAYTECH'],
    casino: ['All Games', 'Evolution', 'Pragmatic Play', 'SA Gaming'],
    poker: ['All Games', 'JILI', 'KINGMAKER', 'JDB'],
    arcade: ['All Games', 'JILI', 'FC', 'JDB'],
    bingo: ['All Games', 'JILI', 'PG'], fishing: ['All Games', 'JILI', 'FC', 'JDB']
  };
  // Prototype data uses the existing local covers; replace this adapter with the game API.
  const mockGameCounts = {
    slot: [32, 46, 38, 28, 22, 18, 10, 26, 8],
    casino: [24, 18, 10],
    poker: [22, 8, 16],
    arcade: [28, 20, 12],
    bingo: [18, 8],
    fishing: [26, 22, 10]
  };
  const catalogData = Object.keys(categories).flatMap((category, ci) =>
    providerSets[category].slice(1).flatMap((provider, pi) =>
      Array.from({length: mockGameCounts[category][pi]}, (_, i) => ({...games[(i + ci + pi) % games.length],
        key: `${category}-${pi}-${i}`, category, provider}))));
  let played = [];
  try { const saved = JSON.parse(localStorage.fpPlayedGames || '[]'); if (Array.isArray(saved)) played = saved.filter(key => catalogData.some(g => g.key === key)); } catch {}
  const swipeConfig = {threshold: 72}; // CSS pixels dragged beyond an edge before changing group.
  window.fpCatalogSwipe = swipeConfig;
  let transition = null;
  function switchCategoryPage(target, direction = 1) {
    if (transition || location.hash === target) return;
    const track = detail.querySelector('.category-track');
    if (!track || matchMedia('(prefers-reduced-motion: reduce)').matches) { location.hash = target; return; }
    const from = location.hash;
    const state = {target, direction}; transition = state;
    track.style.pointerEvents = 'none';
    track.animate([
      {transform:'translateX(0)', opacity:1},
      {transform:`translateX(${-direction * 42}px)`, opacity:0}
    ], {duration:130, easing:'ease-in', fill:'forwards'}).finished.then(() => {
      if (transition !== state || location.hash !== from) return;
      location.hash = target;
    }).catch(() => { if (transition === state) transition = null; });
  }
  function categoryPage(category, body, base) {
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    let provider = providerSets[category].includes(params.get('provider')) ? params.get('provider') : 'All Games';
    let isHistory = params.get('view') === 'history';
    detail.classList.add('category-browser');
    const header = detail.querySelector('.catalog-header');
    header.querySelector('h1').textContent = isHistory ? 'History' : categories[category];
    const tabs = document.createElement('nav'); tabs.className = 'category-tabs'; tabs.setAttribute('aria-label', 'Game categories');
    document.querySelectorAll('.categories-grid .category-entry').forEach(source => {
      const slug = source.hash.split('/').pop();
      const button = document.createElement('button'); button.className = 'category-tab'; button.type = 'button';
      button.setAttribute('aria-label', categories[slug]); button.setAttribute('aria-pressed', String(!isHistory && slug === category));
      const img = source.querySelector('img').cloneNode(); img.alt = categories[slug]; button.append(img);
      button.onclick = () => switchCategoryPage('#/category/' + slug, Object.keys(categories).indexOf(slug) >= Object.keys(categories).indexOf(category) ? 1 : -1); tabs.append(button);
    });
    const historyButton = document.createElement('button'); historyButton.className = 'ui-btn category-history'; historyButton.textContent = 'History'; historyButton.type = 'button';
    historyButton.setAttribute('aria-pressed', String(isHistory)); historyButton.classList.toggle('selected', isHistory);
    historyButton.onclick = () => switchCategoryPage(base + (isHistory ? '' : '?view=history'), isHistory ? -1 : 1);
    tabs.append(historyButton); header.after(tabs);
    body.innerHTML = '<div class="category-track" tabindex="0" role="region" aria-label="Game covers, scroll horizontally"></div><p class="history-empty" hidden>No recently played games</p><nav class="provider-tabs" aria-label="Game providers"></nav><span class="catalog-announcement" role="status"></span>';
    const track = body.querySelector('.category-track'), providers = body.querySelector('.provider-tabs');
    const selected = isHistory ? played.map(key => catalogData.find(g => g.key === key)).filter(Boolean) : catalogData.filter(g => g.category === category && (provider === 'All Games' || g.provider === provider));
    covers(track, selected, location.hash);
    track.querySelectorAll('a').forEach((link, i) => {
      link.draggable = false; link.querySelector('img').draggable = false;
      link.onclick = () => { sessionStorage.fpGameReturn = location.hash; played = [selected[i].key, ...played.filter(key => key !== selected[i].key)].slice(0, 40); try { localStorage.fpPlayedGames = JSON.stringify(played); } catch {} };
    });
    body.querySelector('.history-empty').hidden = selected.length > 0;
    providers.hidden = isHistory;
    providerSets[category].forEach(label => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'ui-btn' + (provider === label ? ' selected' : ''); button.textContent = label;
      button.setAttribute('aria-pressed', String(provider === label));
      button.onclick = () => switchCategoryPage(base + (label === 'All Games' ? '' : '?provider=' + encodeURIComponent(label)), providerSets[category].indexOf(label) >= providerSets[category].indexOf(provider) ? 1 : -1); providers.append(button);
    });
    providers.querySelector('[aria-pressed="true"]')?.scrollIntoView({block:'nearest', inline:'nearest'});
    function changeGroup(direction) {
      if (isHistory) return;
      const index = providerSets[category].indexOf(provider) + direction;
      if (index >= 0 && index < providerSets[category].length) {
        const next = providerSets[category][index]; switchCategoryPage(base + (index ? '?provider=' + encodeURIComponent(next) : ''), direction);
      } else {
        const keys = Object.keys(categories), nextIndex = keys.indexOf(category) + direction;
        if (nextIndex < 0 || nextIndex >= keys.length) return;
        const next = keys[nextIndex], list = providerSets[next];
        switchCategoryPage('#/category/' + next + (direction < 0 ? '?provider=' + encodeURIComponent(list.at(-1)) : ''), direction);
      }
    }
    let drag = null, suppressClick = false;
    track.onpointerdown = event => {
      if (event.button !== 0) return;
      drag = {id:event.pointerId, x:event.clientX, y:event.clientY, scroll:track.scrollLeft, moved:false, beyond:0};
    };
    track.onpointermove = event => {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) < 7) return;
      if (!drag.moved && Math.abs(event.clientY - drag.y) > Math.abs(dx)) { drag = null; return; }
      drag.moved = true; track.setPointerCapture(event.pointerId); event.preventDefault();
      const wanted = drag.scroll - dx, max = Math.max(0, track.scrollWidth - track.clientWidth);
      track.scrollLeft = Math.max(0, Math.min(max, wanted));
      drag.beyond = wanted < 0 ? wanted : wanted > max ? wanted - max : 0;
      track.classList.toggle('edge-ready', Math.abs(drag.beyond) >= swipeConfig.threshold);
    };
    const finish = event => {
      if (!drag || drag.id !== event.pointerId) return;
      const current = drag; drag = null; suppressClick = current.moved; track.classList.remove('edge-ready');
      if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
      if (event.type !== 'pointercancel' && Math.abs(current.beyond) >= swipeConfig.threshold) changeGroup(Math.sign(current.beyond));
      setTimeout(() => { suppressClick = false; }, 0);
    };
    track.onpointerup = finish; track.onpointercancel = finish;
    track.addEventListener('click', event => { if (suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
    track.onkeydown = event => {
      if (event.target !== track || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
      event.preventDefault(); const direction = event.key === 'ArrowRight' ? 1 : -1;
      if ((direction > 0 && track.scrollLeft >= track.scrollWidth - track.clientWidth - 2) || (direction < 0 && track.scrollLeft <= 2)) changeGroup(direction);
      else track.scrollBy({left:direction * track.clientWidth * .7, behavior:'smooth'});
    };
  }
  let gameLoadTimer, gameMenuFadeTimer;
  let gameMenuResize;
  function gamePage() {
    detail.innerHTML = `<div class="game-screen" role="img" aria-label="Lucky Penny game"></div><div class="game-loading" role="status" aria-label="Loading game"><span class="game-spinner"></span><strong>Loading</strong></div><button type="button" class="game-menu-button" aria-label="Open shortcut menu" aria-haspopup="dialog"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg><span>Menu</span></button><div class="game-menu-overlay" hidden><section class="ui-card game-menu-dialog" role="dialog" aria-modal="true" aria-labelledby="game-menu-title"><header class="ui-card-header"><h2 id="game-menu-title">Shortcut Menu</h2><button type="button" class="game-menu-close" aria-label="Close shortcut menu"><img src="components/ui/icons/close.svg" alt=""></button></header><div class="game-menu-actions"><button type="button" data-game-action="reload"><span class="game-action-icon reload-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9a7 7 0 0 1 11.8-2L20 12M4 12l2.7 5a7 7 0 0 0 11.8-2"/></svg></span>Reload</button><button type="button" data-game-action="exit"><span class="game-action-icon exit-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v9M7 5.5a8 8 0 1 0 10 0"/></svg></span>Exit</button></div></section></div>`;
    const button = detail.querySelector('.game-menu-button'), overlay = detail.querySelector('.game-menu-overlay');
    const close = () => { overlay.hidden = true; button.focus(); clearTimeout(gameMenuFadeTimer); gameMenuFadeTimer = setTimeout(() => button.classList.remove('is-active'), 3000); };
    const load = () => { clearTimeout(gameLoadTimer); detail.classList.add('is-loading'); gameLoadTimer = setTimeout(() => detail.classList.remove('is-loading'), 1000 + Math.random() * 2000); };
    let drag, moved = false, side = 'left';
    gameMenuResize = () => { button.style.left = (side === 'left' ? 0 : Math.max(0, detail.clientWidth - button.offsetWidth)) + 'px'; button.style.top = Math.max(0, Math.min(detail.clientHeight - button.offsetHeight, button.offsetTop)) + 'px'; };
    window.addEventListener('resize', gameMenuResize);
    button.addEventListener('pointerdown', e => { if (e.button !== 0) return; const b = button.getBoundingClientRect(), d = detail.getBoundingClientRect(); drag = {x:e.clientX, y:e.clientY, left:b.left-d.left, top:b.top-d.top}; moved = false; button.setPointerCapture(e.pointerId); });
    button.addEventListener('pointermove', e => { if (!drag) return; const dx=e.clientX-drag.x, dy=e.clientY-drag.y; if (Math.hypot(dx,dy)>4) moved=true; if (!moved) return; button.style.left = Math.max(0, Math.min(detail.clientWidth-button.offsetWidth, drag.left+dx))+'px'; button.style.top = Math.max(0, Math.min(detail.clientHeight-button.offsetHeight, drag.top+dy))+'px'; });
    const finish = () => { if (!drag) return; if (moved) { side = button.offsetLeft + button.offsetWidth/2 < detail.clientWidth/2 ? 'left' : 'right'; button.style.left = (side === 'left' ? 0 : detail.clientWidth-button.offsetWidth)+'px'; } drag = null; };
    button.addEventListener('pointerup', finish); button.addEventListener('pointercancel', finish);
    button.addEventListener('click', () => { if (moved) { moved=false; return; } clearTimeout(gameMenuFadeTimer); button.classList.add('is-active'); overlay.hidden=false; detail.querySelector('.game-menu-close').focus(); });
    detail.querySelector('.game-menu-close').onclick = close;
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.addEventListener('keydown', e => { if (e.key === 'Escape') close(); if (e.key === 'Tab') { const controls = [...overlay.querySelectorAll('button')]; const i = controls.indexOf(document.activeElement); if (e.shiftKey && i === 0) { e.preventDefault(); controls.at(-1).focus(); } else if (!e.shiftKey && i === controls.length-1) { e.preventDefault(); controls[0].focus(); } } });
    detail.querySelector('[data-game-action="reload"]').onclick = () => { close(); load(); };
    detail.querySelector('[data-game-action="exit"]').onclick = () => { clearTimeout(gameLoadTimer); location.hash = sessionStorage.fpGameReturn || '#/'; };
    load();
  }
  function render() {
    const incoming = transition?.target === location.hash ? transition.direction : 0;
    transition = null;
    clearTimeout(gameLoadTimer);
    clearTimeout(gameMenuFadeTimer);
    if (gameMenuResize) { window.removeEventListener('resize', gameMenuResize); gameMenuResize = null; }
    detail.classList.remove('category-browser', 'is-loading');
    detail.classList.toggle('game-page', /^#\/game\//.test(location.hash));
    const match = location.hash.match(/^#\/category\/(slot|casino|poker|arcade|bingo|fishing)(\/search)?(?:\?(.*))?$/);
    detail.classList.toggle('catalog-page', !!match);
    if (!match) {
      if (/^#\/game\//.test(location.hash)) gamePage();
      else detail.innerHTML = `<a class="back ui-back" href="#/" aria-label="Back to lobby">${backIcon}</a>`;
      return;
    }
    const category = match[1], isSearch = !!match[2], base = '#/category/' + category;
    detail.innerHTML = `<header class="catalog-header"><a class="ui-back" href="${isSearch ? base : '#/'}" aria-label="${isSearch ? 'Back to category' : 'Back to lobby'}">${backIcon}</a><h1>${isSearch ? 'Search' : categories[category]}</h1>${!isSearch ? `<a class="catalog-search" href="${base}/search" aria-label="Search games">${searchIcon}</a>` : ''}</header><div class="catalog-body"></div>`;
    const body = detail.querySelector('.catalog-body');
    if (!isSearch) {
      categoryPage(category, body, base);
      if (incoming && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        body.querySelector('.category-track').animate([
          {transform:`translateX(${incoming * 42}px)`, opacity:0},
          {transform:'translateX(0)', opacity:1}
        ], {duration:220, easing:'cubic-bezier(.22,1,.36,1)'});
      }
      return;
    }
    body.innerHTML = `<form class="game-search-form" role="search"><div class="search-input-wrap">${searchIcon}<input class="custom-field" type="search" readonly inputmode="none" maxlength="60" autocomplete="off" placeholder="Search games" aria-label="Search games"><button class="search-clear" type="button" aria-label="Clear search" hidden><img class="ui-icon" src="components/ui/icons/close.svg" alt=""></button></div><button class="ui-btn primary" type="submit">Search</button></form><section class="search-history"><div class="search-history-heading"><h2>Recent searches</h2><button type="button" class="history-clear">Clear all</button></div><div class="history-items"></div></section><section class="search-results" aria-live="polite"><h2></h2><div class="catalog-games"></div><div class="search-empty" hidden><svg viewBox="0 0 140 100" aria-hidden="true"><rect x="17" y="18" width="78" height="65" rx="14" fill="#ffc6c4" stroke="#ac3639" stroke-width="3"/><path d="M31 35h30M31 47h20" stroke="#fff6e8" stroke-width="6" stroke-linecap="round"/><circle cx="89" cy="55" r="25" fill="#fff6e8" stroke="#ac3639" stroke-width="5"/><path d="m108 74 17 17" stroke="#ac3639" stroke-width="9" stroke-linecap="round"/><path d="m82 49 14 14m0-14L82 63" stroke="#d87d73" stroke-width="3" stroke-linecap="round"/></svg><p>No games found</p></div></section>`;
    const input = body.querySelector('input'), clear = body.querySelector('.search-clear');
    input.value = new URLSearchParams(match[3] || '').get('q') || '';
    function drawHistory() {
      const section = body.querySelector('.search-history'); section.hidden = !history.length;
      const list = body.querySelector('.history-items'); list.replaceChildren();
      history.forEach(term => { const button = document.createElement('button'); button.type = 'button'; button.className = 'ui-btn history-chip'; button.textContent = term; button.onclick = () => { input.value = term; submit(); }; list.append(button); });
    }
    function results() {
      const term = input.value.trim(); clear.hidden = !input.value;
      const found = term ? games.filter(game => game.name.toLowerCase().includes(term.toLowerCase())) : games;
      body.querySelector('.search-results h2').textContent = term ? 'Search results' : 'Recommended games';
      covers(body.querySelector('.catalog-games'), found, base + '/search' + (term ? '?q=' + encodeURIComponent(term) : ''));
      body.querySelector('.search-empty').hidden = !!found.length;
    }
    function submit() {
      const term = input.value.trim(); input.value = term;
      if (term) { history = [term, ...history.filter(x => x.toLowerCase() !== term.toLowerCase())].slice(0, 8); save(); }
      window.history.replaceState(null, '', base + '/search' + (term ? '?q=' + encodeURIComponent(term) : ''));
      drawHistory(); results(); input.blur();
    }
    body.querySelector('form').onsubmit = event => { event.preventDefault(); submit(); };
    const openSearchKeyboard = () => {
      const keyboard = window.fpKeyboard;
      if (keyboard.restoring || keyboard.isOpen) return;
      keyboard.open(input, {
        kind: 'preview'
      });
    };
    input.addEventListener('focus', openSearchKeyboard);
    input.addEventListener('click', openSearchKeyboard);
    input.oninput = results;
    clear.onclick = event => { event.stopPropagation(); input.value = ''; submit(); };
    body.querySelector('.history-clear').onclick = () => { history = []; save(); drawHistory(); };
    drawHistory(); results();
  }
  window.addEventListener('hashchange', render); render();
})();
