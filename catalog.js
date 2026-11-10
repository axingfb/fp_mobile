(() => {
  const detail = document.querySelector('.detail');
  const games = ['Fortune Treasures', 'Super Ace', 'Gold Miner', 'Lucky Slots', '777', 'Sugar Rush'].map((name, i) => ({name, id: i + 1}));
  const categories = {slot: 'Slot', casino: 'Casino', poker: 'Poker', arcade: 'Arcade', bingo: 'Bingo', fishing: 'Fishing'};
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
  function render() {
    const match = location.hash.match(/^#\/category\/(slot|casino|poker|arcade|bingo|fishing)(\/search)?(?:\?(.*))?$/);
    detail.classList.toggle('catalog-page', !!match);
    if (!match) {
      detail.innerHTML = `<a class="back ui-back" href="#/" aria-label="Back to lobby">${backIcon}</a>`;
      if (/^#\/game\//.test(location.hash)) detail.querySelector('a').href = sessionStorage.fpGameReturn || '#/';
      return;
    }
    const category = match[1], isSearch = !!match[2], base = '#/category/' + category;
    detail.innerHTML = `<header class="catalog-header"><a class="ui-back" href="${isSearch ? base : '#/'}" aria-label="${isSearch ? 'Back to category' : 'Back to lobby'}">${backIcon}</a><h1>${isSearch ? 'Search' : categories[category]}</h1>${!isSearch ? `<a class="catalog-search" href="${base}/search" aria-label="Search games">${searchIcon}</a>` : ''}</header><div class="catalog-body"></div>`;
    const body = detail.querySelector('.catalog-body');
    if (!isSearch) { body.innerHTML = '<div class="catalog-games" aria-label="Category games"></div>'; covers(body.firstChild, games, base); return; }
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
        type: 'letters', presentation: 'overlay', doneLabel: 'Search',
        onDone: submit
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
