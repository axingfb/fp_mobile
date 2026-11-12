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
    ['account', 'My Account', 'user'], ['funds', 'Fund Accounts', 'wallet'],
    ['transactions', 'Transactions', 'transactions'], ['responsible', 'Responsible Gaming', 'responsible'],
    ['settings', 'Settings & Help', 'settings']
  ];
  let accountSection = 'account', fundTab = 'GCash', transactionTab = 'Deposit';
  let responsibleScroll = 0, blockDuration = '15 Days', openTime = null;
  const kycDraft = {idType: '', photos: {front: null, back: null, selfie: null}};
  // Prototype state; replace with account data when the flows are connected.
  const accountStatus = {kycApproved: false, loginPasswordSet: localStorage.fpLoginPasswordSet === 'true', walletPasswordSet: localStorage.fpWalletPasswordSet === 'true'};
  const gamingDefaults = {durationEnabled: false, hours: 1, scheduleEnabled: false, start: '', end: '', lossEnabled: false, loss: ''};
  let savedGaming;
  try { savedGaming = {...gamingDefaults, ...JSON.parse(localStorage.fpResponsibleGaming || '{}')}; } catch { savedGaming = {...gamingDefaults}; }
  let gamingDraft = {...savedGaming};
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
    if (['#/account/block-confirm', '#/account/faq', '#/account/terms', '#/account/login-password', '#/account/wallet-password', '#/account/kyc'].includes(location.hash)) { navigate('/account'); return; }
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
    const isLogin = overlay.dataset.dialog === 'Log in';
    keyboard.open(input, {
      kind: isLogin ? (['phone', 'otp'].includes(input.dataset.field) ? 'preview-numeric' : 'preview-letters') : 'popup-letters', container: overlay,
      onChange: value => { values[input.dataset.field] = value; },
      onClose: () => { overlay.classList.remove('typing'); active = null; }
    });
    active = input; if (!isLogin) overlay.classList.add('typing');
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
    shell('Personal Center', `<div class="center-sidebar"><nav class="account-menu" aria-label="Personal center"></nav><button type="button" class="ui-btn account-logout" id="account-logout">${icon('logout')}<span>Log out</span></button></div><main class="center-content" tabindex="0"></main>`);
    overlay.dataset.dialog = 'My account';
    const menu = card.querySelector('.account-menu');
    menuItems.forEach(([route, title, image]) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'account-menu-item';
      button.innerHTML = `${icon(image)}<span>${title}</span>`;
      button.setAttribute('aria-current', route === accountSection ? 'page' : 'false');
      button.onclick = () => { accountSection = route; account(); }; menu.append(button);
    });
    card.querySelector('#account-logout').onclick = () => navigate('/logout');
    const content = card.querySelector('.center-content');
    const unavailable = '<span class="center-status">Unavailable</span>';
    const row = (label, status = unavailable) => `<div class="center-row"><span>${label}</span>${status}</div>`;
    if (accountSection === 'account') {
      const action = (key, label) => `<button type="button" class="center-action" data-account-action="${key}">${label}</button>`;
      const kyc = accountStatus.kycApproved ? '<span class="center-status">Approved</span>' : action('kyc', 'Go to verify');
      content.innerHTML = `<div class="account-top"><button type="button" class="account-avatar" aria-label="Edit avatar">${icon('user')}<span class="avatar-edit-badge" aria-hidden="true">${icon('edit')}</span></button><div class="account-identity"><button type="button" class="account-name" aria-label="Edit nickname"><span></span>${icon('edit')}</button><button type="button" class="copy-id" aria-label="Copy user ID"><span>ID: 10000001</span>${icon('copy')}</button></div></div><div class="center-list">${row('Phone', '<span class="center-status">90****1111</span>')}${row('KYC Verification', kyc)}${row('Login Password', action('login-password', accountStatus.loginPasswordSet ? 'Modify' : 'Not set'))}${row('Wallet Password', action('wallet-password', accountStatus.walletPasswordSet ? 'Modify' : 'Not set'))}</div>`;
      content.querySelectorAll('[data-account-action]').forEach(button => button.onclick = () => {
        const action = button.dataset.accountAction;
        if (['login-password', 'wallet-password', 'kyc'].includes(action)) navigate('/account/' + action);
        else window.dispatchEvent(new CustomEvent('filplay:account-action', {detail: {action}}));
      });
      content.querySelector('.account-avatar').style.background = avatarColors[avatar] || avatarColors.cream;
      content.querySelector('.account-name span').textContent = name;
      content.querySelector('.account-name').onclick = () => navigate('/account/nickname');
      content.querySelector('.account-avatar').onclick = () => navigate('/account/avatar');
      content.querySelector('.copy-id').onclick = async () => { try { await navigator.clipboard.writeText('10000001'); toast('ID copied'); } catch { toast('Copy unavailable'); } };
    } else if (accountSection === 'funds' || accountSection === 'transactions') {
      const funds = accountSection === 'funds';
      const tabs = funds ? ['GCash', 'Bank', 'Maya'] : ['Deposit', 'Withdrawal', 'Game', 'Reward'];
      const selected = funds ? fundTab : transactionTab;
      content.innerHTML = `<div class="center-tabs" role="tablist">${tabs.map(tab => `<button type="button" class="ui-btn ${tab === selected ? 'selected' : ''}" role="tab" aria-selected="${tab === selected}" data-tab="${tab}">${tab}</button>`).join('')}</div><div class="center-empty">${icon(funds ? 'wallet' : 'transactions')}<span>${funds ? 'No accounts added' : 'Transaction records unavailable'}</span>${funds ? '<button type="button" class="ui-btn primary" id="add-fund-account">Add Account</button>' : ''}</div>`;
      content.querySelectorAll('[data-tab]').forEach(button => button.onclick = () => { if (funds) fundTab = button.dataset.tab; else transactionTab = button.dataset.tab; account(); });
      if (funds) content.querySelector('#add-fund-account').onclick = () => {
        window.dispatchEvent(new CustomEvent('filplay:account-action', {detail: {action: 'add-fund-account', channel: fundTab}}));
      };
    } else if (accountSection === 'responsible') {
      const timePicker = key => {
        const value = gamingDraft[key] || '00:00';
        const [hour, minute] = value.split(':');
        const column = (part, count, selected) => `<div class="time-column" role="group" aria-label="${key} ${part}">${Array.from({length: count}, (_, i) => { const n = String(i).padStart(2, '0'); return `<button type="button" class="time-option ${n === selected ? 'selected' : ''}" data-time-part="${part}" data-time-value="${n}" aria-pressed="${n === selected}">${n}</button>`; }).join('')}</div>`;
        return `<div class="time-picker"><div class="time-picker-head"><span>HH</span><span>MM</span></div><div class="time-picker-columns">${column('hour', 24, hour)}${column('minute', 60, minute)}</div><button type="button" class="ui-btn primary time-done">Done</button></div>`;
      };
      const toggle = (key, label) => `<label class="gaming-switch"><input type="checkbox" role="switch" data-gaming-toggle="${key}" aria-label="${label}" ${gamingDraft[key] ? 'checked' : ''}><span aria-hidden="true"></span></label>`;
      content.innerHTML = `<div class="center-list gaming-list">
        <div class="gaming-item">${row('Daily Gaming Duration', toggle('durationEnabled', 'Daily Gaming Duration'))}${gamingDraft.durationEnabled ? `<div class="gaming-details"><div class="gaming-stepper"><button type="button" class="ui-btn" data-step="-1" aria-label="Decrease hours" ${gamingDraft.hours <= 1 ? 'disabled' : ''}>−</button><span>${gamingDraft.hours} ${gamingDraft.hours === 1 ? 'Hour' : 'Hours'}</span><button type="button" class="ui-btn" data-step="1" aria-label="Increase hours">+</button></div></div>` : ''}</div>
        <div class="gaming-item">${row('Daily Gaming Schedule', toggle('scheduleEnabled', 'Daily Gaming Schedule'))}${gamingDraft.scheduleEnabled ? `<div class="gaming-details"><div class="gaming-times">${['start', 'end'].map(key => `<div class="gaming-time-field"><span>${key === 'start' ? 'Start' : 'End'}</span><button type="button" class="custom-field time-trigger" data-time-trigger="${key}" aria-expanded="${openTime === key}">${gamingDraft[key] || 'Select time'}</button></div>`).join('')}</div>${openTime ? timePicker(openTime) : ''}</div>` : ''}</div>
        <div class="gaming-item">${row('Daily Loss Limit', toggle('lossEnabled', 'Daily Loss Limit'))}${gamingDraft.lossEnabled ? `<div class="gaming-details"><label class="gaming-money"><span>PHP</span><input class="custom-field" type="text" inputmode="none" autocomplete="off" aria-label="Daily loss limit in PHP" data-gaming-field="loss" value="${gamingDraft.loss}"></label></div>` : ''}</div>
        <button type="button" class="center-row gaming-block" id="gaming-block"><span>Block My Account</span>${icon('chevron')}</button>
      </div><div class="gaming-actions"><button type="button" class="ui-btn" id="gaming-cancel">Cancel</button><button type="button" class="ui-btn primary" id="gaming-confirm">Confirm</button></div>`;
      const redraw = () => { const scroll = content.scrollTop; account(); card.querySelector('.center-content').scrollTop = scroll; };
      content.querySelectorAll('[data-gaming-toggle]').forEach(input => input.onchange = () => { gamingDraft[input.dataset.gamingToggle] = input.checked; redraw(); });
      content.querySelectorAll('[data-gaming-field]').forEach(input => input.oninput = () => { gamingDraft[input.dataset.gamingField] = input.value; });
      const lossInput = content.querySelector('[data-gaming-field="loss"]');
      if (lossInput) {
        const openLossKeyboard = () => {
          if (keyboard.restoring || (keyboard.isOpen && keyboard.source === lossInput)) return;
          keyboard.open(lossInput, {kind: 'preview-numeric', container: overlay});
        };
        lossInput.onfocus = openLossKeyboard;
        lossInput.onclick = openLossKeyboard;
      }
      content.querySelectorAll('[data-time-trigger]').forEach(button => button.onclick = () => { openTime = openTime === button.dataset.timeTrigger ? null : button.dataset.timeTrigger; redraw(); });
      content.querySelectorAll('[data-time-part]').forEach(button => button.onclick = () => {
        const [hour, minute] = (gamingDraft[openTime] || '00:00').split(':');
        gamingDraft[openTime] = button.dataset.timePart === 'hour' ? `${button.dataset.timeValue}:${minute}` : `${hour}:${button.dataset.timeValue}`;
        const siblings = button.parentElement.querySelectorAll('.time-option');
        siblings.forEach(item => { const selected = item === button; item.classList.toggle('selected', selected); item.setAttribute('aria-pressed', String(selected)); });
        content.querySelector(`[data-time-trigger="${openTime}"]`).textContent = gamingDraft[openTime];
      });
      const timeDone = content.querySelector('.time-done');
      if (timeDone) timeDone.onclick = () => { if (!gamingDraft[openTime]) gamingDraft[openTime] = '00:00'; openTime = null; redraw(); };
      content.querySelectorAll('.time-column').forEach(column => column.querySelector('.selected')?.scrollIntoView({block: 'nearest'}));
      content.querySelectorAll('[data-step]').forEach(button => button.onclick = () => { gamingDraft.hours = Math.max(1, gamingDraft.hours + Number(button.dataset.step)); redraw(); });
      content.scrollTop = responsibleScroll;
      content.onscroll = () => { responsibleScroll = content.scrollTop; };
      content.querySelector('#gaming-block').onclick = () => { responsibleScroll = content.scrollTop; navigate('/account/block-confirm'); };
      content.querySelector('#gaming-cancel').onclick = () => { gamingDraft = {...savedGaming}; redraw(); };
      content.querySelector('#gaming-confirm').onclick = () => { savedGaming = {...gamingDraft}; localStorage.fpResponsibleGaming = JSON.stringify(savedGaming); window.dispatchEvent(new CustomEvent('filplay:responsible-gaming-save', {detail: {...savedGaming}})); toast('Settings saved'); };
    } else {
      const soundEnabled = localStorage.fpSound !== 'false';
      const soundSwitch = (id, label, checked, disabled = false) => `<label class="gaming-switch"><input type="checkbox" role="switch" id="${id}" aria-label="${label}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span aria-hidden="true"></span></label>`;
      content.innerHTML = `<div class="center-group"><h3>Settings</h3><div class="center-list">${row('Sound', soundSwitch('sound-switch', 'Sound', soundEnabled))}<div class="sound-sub">${row('Music', soundSwitch('music-switch', 'Music', soundEnabled && localStorage.fpMusic !== 'false', !soundEnabled))}${row('Sound effects', soundSwitch('effects-switch', 'Sound effects', soundEnabled && localStorage.fpSoundEffects !== 'false', !soundEnabled))}</div></div></div><div class="center-group"><h3>Help</h3><div class="center-list"><button type="button" class="center-row gaming-block" id="open-faq"><span>FAQ</span>${icon('chevron')}</button></div></div><div class="center-group"><h3>Terms</h3><div class="center-list"><button type="button" class="center-row gaming-block" id="open-terms"><span>Terms of Use</span>${icon('chevron')}</button></div></div>`;
      content.querySelector('#open-faq').onclick = () => navigate('/account/faq');
      content.querySelector('#open-terms').onclick = () => navigate('/account/terms');
      const sound = content.querySelector('#sound-switch'), music = content.querySelector('#music-switch'), effects = content.querySelector('#effects-switch');
      const publishSound = () => window.dispatchEvent(new CustomEvent('filplay:sound-change', {detail: {enabled: sound.checked, music: music.checked, effects: effects.checked}}));
      sound.onchange = () => { localStorage.fpSound = String(sound.checked); music.checked = effects.checked = sound.checked; music.disabled = effects.disabled = !sound.checked; localStorage.fpMusic = localStorage.fpSoundEffects = String(sound.checked); publishSound(); };
      music.onchange = () => { localStorage.fpMusic = String(music.checked); publishSound(); };
      effects.onchange = () => { localStorage.fpSoundEffects = String(effects.checked); publishSound(); };
    }
  }
  function kyc() {
    const types = ['Country ID', 'Unified Multi-Purpose ID (UMID)', "Driver's License", 'Passport', 'PhilHealth ID', 'SSS (Social Security System) ID', 'Postal ID', 'PRC ID', 'TIN – New Version'];
    shell('KYC verify', `<div class="kyc-progress" aria-label="Step 1 of 3"><span class="current"></span><span></span><span></span></div><div class="kyc-scroll"><h3>Upload Identification</h3><p>Please upload the required images and a selfie holding your ID.</p><label class="field-label">ID Type</label><button type="button" class="custom-field kyc-select" id="kyc-type">${kycDraft.idType || 'Please select'} ${icon('chevron')}</button><div class="kyc-photos">${[['front','Front side of ID'],['back','Back side of ID'],['selfie','Selfie with ID card']].map(([key,label]) => `<div><span class="field-label">${label}</span><label class="kyc-upload" for="kyc-${key}">${icon('user')}<span>${kycDraft.photos[key] ? 'Change Photo' : 'Take Photo'}</span></label><input class="kyc-file" id="kyc-${key}" type="file" accept="image/*" data-photo="${key}"><span class="kyc-file-name" data-file-name="${key}"></span></div>`).join('')}</div><div class="form-error" role="status"></div><button type="button" class="ui-btn primary kyc-next">Next</button></div><div class="kyc-picker" hidden><div class="kyc-picker-card" role="dialog" aria-modal="true" aria-labelledby="kyc-picker-title"><header><h3 id="kyc-picker-title">ID Type</h3><button type="button" class="ui-icon-button" id="kyc-picker-close" aria-label="Close ID type">${icon('close')}</button></header><div class="kyc-options">${types.map((type,i) => `<button type="button" data-id-index="${i}" class="kyc-option">${type}</button>`).join('')}</div></div></div>`);
    card.querySelector('.ui-close').onclick = () => navigate('/account');
    const picker = card.querySelector('.kyc-picker'), trigger = card.querySelector('#kyc-type');
    trigger.onclick = () => { picker.hidden = false; picker.querySelector('.kyc-option').focus(); };
    const closePicker = () => { picker.hidden = true; trigger.focus(); };
    card.querySelector('#kyc-picker-close').onclick = closePicker;
    picker.onclick = event => { if (event.target === picker) closePicker(); };
    picker.querySelectorAll('[data-id-index]').forEach(button => button.onclick = () => { kycDraft.idType = types[Number(button.dataset.idIndex)]; trigger.firstChild.textContent = kycDraft.idType + ' '; closePicker(); });
    card.querySelectorAll('[data-photo]').forEach(input => { const key = input.dataset.photo; const name = card.querySelector(`[data-file-name="${key}"]`); if (kycDraft.photos[key]) name.textContent = kycDraft.photos[key].name; input.onchange = () => { if (input.files[0]) { kycDraft.photos[key] = input.files[0]; name.textContent = input.files[0].name; input.previousElementSibling.querySelector('span').textContent = 'Change Photo'; } }; });
    card.querySelector('.kyc-next').onclick = () => { const missing = []; if (!kycDraft.idType) missing.push('Select an ID type'); if (!kycDraft.photos.front) missing.push('Front of ID is required'); if (!kycDraft.photos.back) missing.push('Back of ID is required'); if (!kycDraft.photos.selfie) missing.push('Selfie with ID is required'); card.querySelector('.form-error').textContent = missing.length ? missing.join(' · ') : 'The next verification step is not connected yet.'; };
  }
  function passwordDialog(wallet) {
    const key = wallet ? 'walletPasswordSet' : 'loginPasswordSet';
    const title = `${accountStatus[key] ? 'Modify' : 'Set'} ${wallet ? 'Wallet' : 'Login'} Password`;
    shell(title, `<div class="password-form"><label class="field-label" for="password-new">Create a 6-digit numeric code</label><div class="password-field">${icon('lock')}<input id="password-new" class="custom-field" type="password" inputmode="none" autocomplete="new-password" maxlength="6" placeholder="Enter password" aria-label="Create a 6-digit numeric code"><button type="button" class="password-visibility" aria-label="Show password" data-show="password-new">Show</button></div><label class="field-label" for="password-confirm">Confirm a 6-digit numeric code</label><div class="password-field">${icon('lock')}<input id="password-confirm" class="custom-field" type="password" inputmode="none" autocomplete="new-password" maxlength="6" placeholder="Enter password" aria-label="Confirm a 6-digit numeric code"><button type="button" class="password-visibility" aria-label="Show confirmation" data-show="password-confirm">Show</button></div><div class="form-error" role="status"></div><button type="button" class="ui-btn primary password-submit" disabled>Confirm</button></div>`);
    card.querySelector('.ui-close').onclick = () => navigate('/account');
    const inputs = [...card.querySelectorAll('.password-field input')], submit = card.querySelector('.password-submit');
    const update = () => { submit.disabled = !inputs.every(input => /^\d{6}$/.test(input.value)); card.querySelector('.form-error').textContent = ''; };
    inputs.forEach(input => {
      input.oninput = update;
      const open = () => { if (!keyboard.restoring) keyboard.open(input, {kind: 'preview-numeric', container: overlay}); };
      input.onfocus = input.onclick = open;
    });
    card.querySelectorAll('[data-show]').forEach(button => button.onclick = () => { const input = card.querySelector('#' + button.dataset.show); const showing = input.type === 'text'; input.type = showing ? 'password' : 'text'; button.textContent = showing ? 'Show' : 'Hide'; button.setAttribute('aria-label', `${showing ? 'Show' : 'Hide'} ${button.dataset.show === 'password-new' ? 'password' : 'confirmation'}`); });
    submit.onclick = () => {
      if (inputs[0].value !== inputs[1].value) { card.querySelector('.form-error').textContent = 'Codes do not match.'; return; }
      accountStatus[key] = true; localStorage[wallet ? 'fpWalletPasswordSet' : 'fpLoginPasswordSet'] = 'true';
      inputs.forEach(input => { input.value = ''; });
      navigate('/account'); toast('Password set in prototype');
    };
  }
  function faq() {
    shell('FAQ', `<article class="faq-content">
      <section><h3>Requirements to Register a Filplay Account</h3><p>To create an account, players must meet these requirements:</p><p><strong>1. Understand Terms and Policies</strong> — Read and comply with Filplay's terms, conditions and operating policies.</p><p><strong>2. Provide Accurate Information</strong> — Submit genuine personal details. Fake identities and impersonation are prohibited.</p><p><strong>3. One Account Per Player</strong> — Each player may have one account. Check that you have not registered before.</p><p><strong>4. Verification Process</strong> — Complete the required verification to activate your account.</p></section>
      <section><h3>Step-by-Step Guide to Log in to Filplay</h3><p><strong>Step 1: Access the Filplay Website</strong><br>Visit www.filplay.com and select “Login / Register”.</p><p><strong>Step 2: Enter your phone number</strong><br>Enter your mobile number, read the terms of use and privacy policy, and agree to them before continuing.</p><p><strong>Step 3: Enter the One-Time Pin (OTP)</strong><br>Enter the OTP sent to your phone. Once registration is confirmed, log in to start playing.</p><p><strong>Optional: Update Login Preferences</strong><br>After registration, you can choose to use a password instead of an OTP.</p></section>
      <section><h3>KYC Process</h3><p>Complete KYC for full access to the platform and cash-in/cash-out services. Provide the requested personal and contact details, check that they are accurate, and enter the verification code.</p></section>
      <section><h3>Step-by-Step Guide to Deposit</h3><ol><li>Open Wallet and select Deposit to see payment methods.</li><li>Enter an initial deposit of at least P500.00.</li><li>Choose the relevant options and continue to the payment gateway.</li><li>After a successful transaction, the amount is credited to your wallet and you receive a notification.</li></ol></section>
      <section><h3>Step-by-Step Guide to Withdraw</h3><ol><li>Open Wallet and select Withdraw.</li><li>If needed, add an account to receive the withdrawal.</li><li>Enter the requested first, middle and last names and account number accurately.</li></ol></section>
    </article>`);
    card.querySelector('.ui-close').onclick = () => navigate('/account');
  }
  function terms() {
    shell('Terms of Use', `<article class="faq-content terms-content"><p class="terms-note">Summary for this prototype. <a href="https://client-filplay.filbet2025.com/docs/terms-of-use" target="_blank" rel="noopener noreferrer">Read the full Terms of Use</a>.</p>
      <section><h3>I. General Introduction and Definition</h3><p>Filplay states that it is operated by GoTech Entertainment Inc. and licensed and supervised by PAGCOR. The terms govern use of the platform and may be amended. Platform and game materials remain the property of their respective rights holders.</p></section>
      <section><h3>II. Member's Basic Information</h3><p>Registration requires the requested information, a valid government-issued ID and a selfie holding it. Players must be at least 21 and eligible under the stated restrictions.</p></section>
      <section><h3>III. Communications Opt In</h3><p>Filplay may communicate administrative, legally required and promotional information through channels including email, SMS, calls and social media.</p></section>
      <section><h3>IV. Collection and Privacy Statement</h3><p>Filplay describes collecting and processing personal information for regulatory, account and service purposes, and sharing it with relevant providers as described in its policy. The terms state that data is stored in the Philippines and retained for at least five years.</p></section>
      <section><h3>V. Terms and Conditions for Membership</h3><p>Eligibility restrictions apply to minors, students and other listed restricted persons. KYC is required before the first withdrawal or within three days of registration, whichever comes first. The terms also describe prohibited conduct, including fraud, multiple accounts, promotion abuse, collusion, automated tools and manipulation, and possible account or fund restrictions.</p></section>
      <section><h3>VI. FILPLAY Has No Liability (Disclaimers)</h3><p>The terms describe circumstances affecting transactions or service availability, account suspension, and limitations on warranties and liability. Games and services are for personal, non-commercial entertainment.</p></section>
      <section><h3>VII. Transaction Policy</h3><p>Transactions may be reviewed for compliance. Payment account names must match the registered account holder. The policy also describes refund conditions and verification requirements.</p></section>
      <section><h3>VIII. Taxes</h3><p>Winnings are subject to applicable tax rules. The terms describe withholding and the player's responsibilities where applicable taxes are not withheld.</p></section>
      <section><h3>IX. KYC Policy and Responsible Gaming</h3><p>The KYC policy covers identity verification, screening, transaction monitoring and risk assessment. The page also describes responsible gaming, player exclusion and sources of support.</p></section>
    </article>`);
    card.querySelector('.ui-close').onclick = () => navigate('/account');
  }
  function blockAccount() {
    const options = ['7 Days', '15 Days', '30 Days', '90 Days', 'Until manually unlocked'];
    shell('Block My Account', `<div class="block-scroll"><div class="block-warning-icon">${icon('lock')}</div><h3>Warning</h3><p>After being disabled, your account will not be able to log in. Contact customer service for assistance with unblocking.</p><p>We recommend withdrawing your balance before disabling your account.</p><div class="block-options" role="group" aria-label="Block duration">${options.map(option => `<button type="button" class="ui-btn ${option === blockDuration ? 'selected' : ''}" data-duration="${option}" aria-pressed="${option === blockDuration}">${option}</button>`).join('')}</div></div><div class="block-footer"><button type="button" class="ui-btn primary" id="confirm-block">I confirm block</button></div>`);
    card.querySelector('.ui-close').onclick = () => navigate('/account');
    card.querySelectorAll('[data-duration]').forEach(button => button.onclick = () => {
      blockDuration = button.dataset.duration;
      card.querySelectorAll('[data-duration]').forEach(item => { const selected = item.dataset.duration === blockDuration; item.classList.toggle('selected', selected); item.setAttribute('aria-pressed', String(selected)); });
    });
    card.querySelector('#confirm-block').onclick = () => {
      window.dispatchEvent(new CustomEvent('filplay:account-action', {detail: {action: 'confirm-block-account', duration: blockDuration}}));
      signed = false; values.password = ''; values.otp = ''; sync(); closeDialog(false); navigate('/'); toast('Account blocked successfully');
    };
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
  function supportPage() {
    closeDialog(false);
    const page = document.createElement('section');
    page.className = 'support-page';
    page.setAttribute('aria-label', 'Customer Service');
    page.innerHTML = `<div class="support-rotate-tip">旋转手机，获得最佳横屏体验</div><div class="support-shell"><header class="support-header"><button type="button" class="ui-back" aria-label="Back">${icon('back')}</button><h1>Customer Service</h1></header><div class="support-messages" aria-live="polite"><div class="support-message agent">Hello! Welcome to Filplay. How can I help you today?</div><div class="support-message customer">Hi! I have a question about my account.</div><div class="support-message agent">Of course! Please let me know how I can help.</div></div><form class="support-composer"><input aria-label="Message" placeholder="Type a message" maxlength="500" autocomplete="off"><button type="submit" class="ui-btn primary">Send</button></form><div class="support-keyboard-slot"></div></div>`;
    page.querySelector('.ui-back').onclick = () => navigate('/');
    const form = page.querySelector('form');
    const input = form.querySelector('input');
    const slot = page.querySelector('.support-keyboard-slot');
    const openKeyboard = () => {
      if (keyboard.restoring || keyboard.isOpen) return;
      slot.querySelectorAll('.support-keyboard-closing').forEach(element => element.remove());
      keyboard.open(input, {type: 'letters', container: slot, onClose: () => {
        if (!page.isConnected) return;
        const closing = keyboard.panel.cloneNode(true);
        closing.hidden = false;
        closing.classList.add('support-keyboard-closing');
        closing.setAttribute('aria-hidden', 'true');
        closing.inert = true;
        slot.append(closing);
        slot.style.height = `${slot.scrollHeight}px`;
        requestAnimationFrame(() => { slot.style.height = '0px'; });
        closing.addEventListener('transitionend', () => closing.remove(), {once: true});
        setTimeout(() => closing.remove(), 300);
      }});
      slot.style.height = `${keyboard.panel.offsetHeight}px`;
    };
    input.addEventListener('focus', openKeyboard);
    input.addEventListener('click', openKeyboard);
    page.querySelector('.support-messages').addEventListener('click', () => {
      if (keyboard.input === input) { input.blur(); keyboard.close('dismiss', false); }
    });
    form.onsubmit = event => { event.preventDefault(); const input = form.querySelector('input'); const text = input.value.trim(); if (!text) return; const message = document.createElement('div'); message.className = 'support-message customer'; message.textContent = text; const messages = page.querySelector('.support-messages'); messages.append(message); input.value = ''; messages.scrollTop = messages.scrollHeight; };
    document.body.append(page);
  }
  function renderRoute() {
    document.querySelectorAll('.support-page').forEach(page => page.remove());
    stage.querySelectorAll('.secondary-page').forEach(page => page.remove());
    const route = location.hash.slice(1);
    if (route === '/support') supportPage();
    else if (route === '/account') account();
    else if (route === '/account/block-confirm') blockAccount();
    else if (route === '/account/kyc') kyc();
    else if (route === '/account/login-password') passwordDialog(false);
    else if (route === '/account/wallet-password') passwordDialog(true);
    else if (route === '/account/faq') faq();
    else if (route === '/account/terms') terms();
    else if (route === '/account/nickname') nickname();
    else if (route === '/account/avatar') avatars();
    else if (route === '/login') login();
    else if (route === '/logout') logout();
    else if (/^\/keyboard(?:\/(numeric|letters))?$/.test(route)) keyboardPreview(route.endsWith('/numeric'));
    else {
      const item = menuItems.find(([slug]) => route === '/account/' + slug);
      if (item) { accountSection = item[0]; account(); } else closeDialog(false);
    }
  }
  guest.onclick = () => navigate('/login');
  document.querySelector('[aria-label="客服"]').onclick = () => navigate('/support');
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
