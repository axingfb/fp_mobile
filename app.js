(() => {
  const stage = document.querySelector('.stage');
  const keyboard = window.fpKeyboard;
  let signed = localStorage.fpSigned !== 'false';
  let name = localStorage.fpName || 'axing';
  let avatar = localStorage.fpAvatar || 'cream';
  let mode = 'OTP', active = null, card, opener = null;
  const values = {phone: '', otp: '', password: '', nickname: name};
  const avatarColors = {cream: '#fff0d6', pink: '#ffc6c4', gold: '#ffe878', blue: '#a8d7ff', mint: '#b8ecd2', lilac: '#dfc9ff'};
  const menuItems = [
    ['security', 'Security & KYC', 'security'], ['funds', 'Fund Accounts', 'wallet'],
    ['transactions', 'Transactions', 'transactions'], ['faq', 'FAQ', 'help'],
    ['responsible', 'Responsible Gaming', 'responsible'], ['settings', 'Setting', 'settings'],
    ['block', 'Block My Account', 'lock']
  ];
  const icon = (name, extra = '') => `<img class="ui-icon ${extra}" src="components/ui/icons/${name}.svg" alt="" draggable="false">`;
  const guest = document.createElement('button');
  guest.className = 'guest-login ui-btn primary';
  guest.type = 'button';
  guest.textContent = 'Log in';
  stage.append(guest);
  const overlay = document.createElement('div');
  overlay.className = 'ui-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  stage.append(overlay);

  function sync() {
    stage.classList.toggle('logged-out', !signed);
    guest.hidden = signed;
    document.querySelector('.profile-name').textContent = name;
    localStorage.fpSigned = signed;
    localStorage.fpName = name;
    localStorage.fpAvatar = avatar;
  }
  sync();

  function navigate(path) {
    if (location.hash === '#' + path) renderRoute();
    else location.hash = path;
  }
  function closeDialog(restore = true) {
    keyboard.close('dialog', false);
    overlay.className = 'ui-overlay';
    overlay.replaceChildren();
    active = null;
    if (restore && opener?.isConnected) opener.focus({preventScroll: true});
  }
  function dismiss() {
    closeDialog();
    if (/^#\/(account|login|logout|keyboard)(\/|$)/.test(location.hash)) navigate('/');
  }
  function shell(title, body, preserveKeyboard = false) {
    const content = `<header class="ui-card-header"><h2 id="dialog-title">${title}</h2><button type="button" class="ui-icon-button ui-close" aria-label="Close">${icon('close')}</button></header><div class="ui-card-body">${body}</div>`;
    if (preserveKeyboard) card.innerHTML = content;
    else {
      if (!overlay.classList.contains('open')) opener = document.activeElement;
      closeDialog(false);
      overlay.innerHTML = `<section class="ui-card">${content}</section>`;
      card = overlay.querySelector('.ui-card');
    }
    overlay.classList.add('open');
    overlay.dataset.dialog = title;
    overlay.setAttribute('aria-labelledby', 'dialog-title');
    card.querySelector('.ui-close').onclick = dismiss;
    if (!preserveKeyboard) card.querySelector('.ui-close').focus({preventScroll: true});
  }
  function toast(text) {
    const message = document.createElement('div');
    message.className = 'toast'; message.setAttribute('role', 'status'); message.textContent = text;
    stage.append(message); setTimeout(() => message.remove(), 1800);
  }
  function field(key, placeholder) {
    const max = key === 'phone' ? 11 : key === 'otp' ? 6 : 24;
    return `<input id="field-${key}" inputmode="none" autocomplete="off" type="${key === 'password' ? 'password' : 'text'}" maxlength="${max}" class="custom-field" data-field="${key}" aria-label="${placeholder}" placeholder="${placeholder}">`;
  }
  function activate(input) {
    if (keyboard.restoring || (active === input && keyboard.isOpen)) return;
    keyboard.open(input, {
      type: ['phone', 'otp'].includes(input.dataset.field) ? 'numeric' : 'letters', container: overlay,
      onChange: value => { values[input.dataset.field] = value; },
      onClose: () => { overlay.classList.remove('typing'); active = null; }
    });
    active = input; overlay.classList.add('typing');
  }
  function bindFields() {
    card.querySelectorAll('[data-field]').forEach(input => {
      input.value = values[input.dataset.field];
      input.onclick = event => { event.stopPropagation(); activate(input); };
      input.onfocus = () => activate(input);
      input.oninput = () => { values[input.dataset.field] = input.value; };
    });
  }
  function login(preserveKeyboard = false) {
    const key = mode === 'OTP' ? 'otp' : 'password';
    shell('Log in', `<div class="login-tabs"><button type="button" class="ui-btn ${mode === 'OTP' ? 'selected' : ''}" aria-pressed="${mode === 'OTP'}" data-mode="OTP">OTP</button><button type="button" class="ui-btn ${mode === 'Password' ? 'selected' : ''}" aria-pressed="${mode === 'Password'}" data-mode="Password">Password</button></div><label class="field-label" for="field-phone">Mobile number · +63</label>${field('phone', '09XXXXXXXXX')}<label class="field-label" for="field-${key}">${mode}</label><div class="form-row">${field(key, mode === 'OTP' ? '6-digit OTP' : 'Password')}${mode === 'OTP' ? '<button type="button" class="ui-btn" id="send-otp">Send OTP</button>' : ''}</div><div class="form-error" role="status"></div><button type="button" class="ui-btn primary" id="submit-login">Log in</button>`, preserveKeyboard);
    bindFields();
    if (preserveKeyboard) { active = null; activate(card.querySelector(`[data-field="${key}"]`)); }
    card.querySelectorAll('[data-mode]').forEach(button => button.onclick = () => {
      if (mode === button.dataset.mode) return;
      const keep = keyboard.isOpen; mode = button.dataset.mode; login(keep);
    });
    const send = card.querySelector('#send-otp');
    if (send) send.onclick = () => {
      values.otp = '123456'; card.querySelector('[data-field="otp"]').value = values.otp;
      toast('Demo OTP: 123456');
    };
    card.querySelector('#submit-login').onclick = () => {
      const error = card.querySelector('.form-error');
      if (!/^09\d{9}$/.test(values.phone) && !/^9\d{9}$/.test(values.phone)) { error.textContent = 'Enter a valid mobile number.'; return; }
      if (!values[key].trim()) { error.textContent = mode === 'OTP' ? 'Enter your OTP.' : 'Enter your password.'; return; }
      signed = true; sync(); closeDialog(false); navigate('/');
    };
  }
  function account() {
    shell('Personal Information', `<div class="account-top"><button type="button" class="account-avatar" aria-label="Edit avatar">${icon('user')}<span class="avatar-edit-badge" aria-hidden="true">${icon('edit')}</span></button><div class="account-identity"><button type="button" class="account-name" aria-label="Edit nickname"><span></span>${icon('edit')}</button><button type="button" class="copy-id" aria-label="Copy user ID"><span>ID: 10000001</span>${icon('copy')}</button></div></div><nav class="account-menu" aria-label="Account settings"></nav><button type="button" class="ui-btn account-logout" id="account-logout">${icon('logout')}<span>Log out</span></button>`);
    // Stable layout variant, independent of the visible title.
    overlay.dataset.dialog = 'My account';
    card.querySelector('.account-avatar').style.background = avatarColors[avatar] || avatarColors.cream;
    card.querySelector('.account-name span').textContent = name;
    card.querySelector('.account-name').onclick = () => navigate('/account/nickname');
    card.querySelector('.account-avatar').onclick = () => navigate('/account/avatar');
    card.querySelector('.copy-id').onclick = async () => {
      try { await navigator.clipboard.writeText('10000001'); toast('ID copied'); }
      catch { toast('Copy unavailable'); }
    };
    const menu = card.querySelector('.account-menu');
    menuItems.forEach(([route, title, image]) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'account-menu-item';
      button.innerHTML = `${icon(image)}<span>${title}</span>${icon('chevron', 'menu-chevron')}`;
      button.onclick = () => navigate('/account/' + route); menu.append(button);
    });
    card.querySelector('#account-logout').onclick = () => navigate('/logout');
  }
  function nickname() {
    values.nickname = name;
    shell('Change Name', `<label class="field-label" for="field-nickname">Nickname</label>${field('nickname', 'Your name')}<button type="button" class="ui-btn primary" id="save-name">Save</button>`);
    bindFields(); card.querySelector('.ui-close').onclick = () => navigate('/account');
    card.querySelector('#save-name').onclick = () => { if (!values.nickname.trim()) return; name = values.nickname.trim(); sync(); navigate('/account'); };
  }
  function avatars() {
    shell('Choose avatar', '<div class="avatar-options"></div>');
    card.querySelector('.ui-close').onclick = () => navigate('/account');
    for (const [key, color] of Object.entries(avatarColors)) {
      const button = document.createElement('button'); button.className = 'account-avatar'; button.type = 'button';
      button.style.background = color; button.innerHTML = icon('user'); button.setAttribute('aria-label', key + ' avatar');
      button.setAttribute('aria-pressed', String(avatar === key));
      button.onclick = () => { avatar = key; sync(); navigate('/account'); };
      card.querySelector('.avatar-options').append(button);
    }
  }
  function logout() {
    shell('Log out?', '<p class="confirm-message">Are you sure you want to log out?</p><div class="confirm-actions"><button type="button" class="ui-btn" id="cancel-out">Cancel</button><button type="button" class="ui-btn primary" id="confirm-out">Log out</button></div>');
    card.querySelector('#cancel-out').onclick = card.querySelector('.ui-close').onclick = () => navigate('/account');
    card.querySelector('#confirm-out').onclick = () => { signed = false; values.password = ''; values.otp = ''; sync(); closeDialog(false); navigate('/'); };
  }
  function secondary(title) {
    closeDialog(false);
    const page = document.createElement('section'); page.className = 'secondary-page';
    page.innerHTML = `<header class="secondary-header"><button type="button" class="ui-back" aria-label="Back">${icon('back')}</button><h2></h2></header>`;
    page.querySelector('h2').textContent = title;
    page.querySelector('.ui-back').onclick = () => navigate('/account'); stage.append(page);
  }
  function keyboardPreview(numeric) {
    shell('Keyboard', `<div class="login-tabs keyboard-preview-tabs"><button type="button" class="ui-btn ${numeric ? 'selected' : ''}" data-preview="numeric">123</button><button type="button" class="ui-btn ${!numeric ? 'selected' : ''}" data-preview="letters">ABC</button></div><label class="field-label" for="keyboard-preview-input">${numeric ? 'Mobile number · +63' : 'Nickname'}</label><input id="keyboard-preview-input" class="custom-field" inputmode="none" autocomplete="off" maxlength="${numeric ? 11 : 24}" aria-label="${numeric ? 'Mobile number' : 'Nickname'}" placeholder="${numeric ? '09XXXXXXXXX' : 'Your name'}"><div class="keyboard-preview-footer"><span class="keyboard-count">0 / ${numeric ? 11 : 24}</span></div>`);
    const input = card.querySelector('input');
    const open = () => {
      if (keyboard.restoring) return;
      keyboard.open(input, {type: numeric ? 'numeric' : 'letters', container: overlay, onClose: () => overlay.classList.remove('typing')});
      overlay.classList.add('typing');
    };
    input.oninput = () => { card.querySelector('.keyboard-count').textContent = input.value.length + ' / ' + input.maxLength; };
    input.onclick = input.onfocus = open;
    card.querySelectorAll('[data-preview]').forEach(button => button.onclick = () => navigate('/keyboard/' + button.dataset.preview));
    open();
  }
  function renderRoute() {
    stage.querySelectorAll('.secondary-page').forEach(page => page.remove());
    const route = location.hash.slice(1);
    if (route === '/account') account();
    else if (route === '/account/nickname') nickname();
    else if (route === '/account/avatar') avatars();
    else if (route === '/login') login();
    else if (route === '/logout') logout();
    else if (/^\/keyboard(?:\/(numeric|letters))?$/.test(route)) keyboardPreview(route.endsWith('/numeric'));
    else {
      const item = menuItems.find(([slug]) => route === '/account/' + slug);
      if (item) secondary(item[1]); else closeDialog(false);
    }
  }
  guest.onclick = () => navigate('/login');
  const profile = document.querySelector('.profile .avatar');
  profile.setAttribute('role', 'button'); profile.setAttribute('tabindex', '0'); profile.setAttribute('aria-label', 'Open user profile');
  profile.onclick = () => navigate('/account');
  profile.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate('/account'); } };
  document.querySelectorAll('.detail .back').forEach(back => { back.classList.add('ui-back'); back.innerHTML = icon('back'); });
  let backdropPress = false;
  overlay.onpointerdown = event => { backdropPress = event.target === overlay; };
  overlay.onclick = event => { if (event.target === overlay && backdropPress) dismiss(); };
  document.addEventListener('keydown', event => {
    if (!overlay.classList.contains('open')) return;
    if (event.key === 'Escape') { event.preventDefault(); dismiss(); }
    if (event.key !== 'Tab') return;
    const nodes = [...overlay.querySelectorAll('button:not(:disabled),input,a[href]')].filter(node => node.getClientRects().length);
    const first = nodes[0], last = nodes.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
})();
