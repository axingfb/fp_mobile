(() => {
  const prototype = document.querySelector('#prototype');
  const docs = document.querySelector('#document');
  const map = document.querySelector('#page-map');
  const buttons = [...document.querySelectorAll('.switcher [data-mode]')];
  const modules = document.querySelector('#page-map-modules');
  const groups = document.querySelector('#page-map-groups');
  const viewer = document.querySelector('#page-map-detail');
  const fullImage = viewer.querySelector('.page-map-full');
  const caption = viewer.querySelector('h2');
  let loadVersion = 0;
  let selectedGroupId;

  viewer.querySelector('button').onclick = () => viewer.close();
  viewer.addEventListener('click', event => {
    if (event.target === viewer) {
      const bounds = viewer.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom) viewer.close();
    }
  });
  viewer.addEventListener('close', () => fullImage.removeAttribute('src'));

  function renderGroup(group) {
    const section = document.createElement('section');
    section.className = 'page-map-group';
    const heading = document.createElement('h2');
    heading.textContent = group.name;
    const count = document.createElement('span');
    count.className = 'page-map-count';
    count.textContent = group.screens.length + ' 张';
    heading.append(count);

    const grid = document.createElement('div');
    grid.className = 'page-map-grid';
    for (const screen of group.screens) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'page-map-tile';
      const label = document.createElement('span');
      label.textContent = screen.title;
      const thumbnail = document.createElement('img');
      thumbnail.src = 'page-map/' + screen.image;
      thumbnail.alt = '';
      thumbnail.loading = 'lazy';
      thumbnail.width = 852;
      thumbnail.height = 393;
      tile.append(thumbnail, label);
      tile.onclick = () => {
        caption.textContent = group.name + ' / ' + screen.title;
        fullImage.src = thumbnail.src;
        fullImage.alt = screen.title;
        viewer.showModal();
      };
      grid.append(tile);
    }
    section.append(heading, grid);

    groups.replaceChildren(section);
  }

  function renderModules(snapshotGroups) {
    if (!snapshotGroups.length) {
      selectedGroupId = undefined;
      groups.textContent = '还没有同步截图。';
      return;
    }

    const initialGroup = snapshotGroups.find(group => group.id === selectedGroupId) || snapshotGroups[0];
    selectedGroupId = initialGroup.id;
    for (const group of snapshotGroups) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ui-btn';
      button.textContent = group.name;
      button.setAttribute('aria-controls', groups.id);
      button.setAttribute('aria-pressed', String(group === initialGroup));
      button.classList.toggle('selected', group === initialGroup);
      button.onclick = () => {
        if (selectedGroupId === group.id) return;
        const previous = modules.querySelector('[aria-pressed="true"]');
        previous.classList.remove('selected');
        previous.setAttribute('aria-pressed', 'false');
        button.classList.add('selected');
        button.setAttribute('aria-pressed', 'true');
        selectedGroupId = group.id;
        renderGroup(group);
      };
      modules.append(button);
    }
    renderGroup(initialGroup);
  }

  async function loadMap() {
    const version = ++loadVersion;
    modules.replaceChildren();
    groups.textContent = '正在加载页面地图…';
    try {
      const response = await fetch('page-map/snapshot.json', {cache: 'no-store'});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const snapshot = await response.json();
      if (version !== loadVersion) return;
      renderModules(snapshot.groups);
    } catch {
      if (version === loadVersion) {
        modules.replaceChildren();
        groups.textContent = '页面地图未加载，请重新打开。';
      }
    }
  }

  function setMode(mode, save = false) {
    if (viewer.open) viewer.close();
    if (mode !== 'prototype') window.fpKeyboard?.close('navigation', false);
    document.body.dataset.view = mode;
    prototype.hidden = mode !== 'prototype';
    docs.classList.toggle('active', mode === 'document');
    map.hidden = mode !== 'map';
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    }
    if (save) {
      const url = new URL(location.href);
      if (mode === 'prototype') url.searchParams.delete('view');
      else url.searchParams.set('view', mode);
      history.replaceState(null, '', url);
      window.scrollTo(0, 0);
    }
    if (mode === 'document') loadRequirement();
    if (mode === 'map') loadMap();
  }

  for (const button of buttons) {
    button.onclick = () => setMode(button.dataset.mode, true);
  }
  const initial = new URLSearchParams(location.search).get('view');
  setMode(initial === 'map' || initial === 'document' ? initial : 'prototype');
})();
