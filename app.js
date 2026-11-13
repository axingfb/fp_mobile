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
  let accountSection = 'account', fundTab = 'GCash', transactionTab = 'Deposit', gameProvider = 'All Games', gamePeriod = 'Today', depositStatus = 'All Status', depositPeriod = 'Last 7 days', withdrawalStatus = 'All Status', withdrawalPeriod = 'Last 7 days', rewardPeriod = 'Last 3 days';
  let transactionDetail = null, transactionScroll = 0;
  let withdrawalRecords = [];
  try {
    const saved = JSON.parse(localStorage.fpWithdrawalRecords || '[]');
    if (Array.isArray(saved)) withdrawalRecords = saved.filter(record => record && typeof record.id === 'string' && typeof record.amount === 'number' && Number.isFinite(record.amount) && record.amount > 0 && ['GCash','Maya','Bank'].includes(record.channel) && record.status === 'Pending' && Number.isFinite(new Date(record.date).getTime())).map(record => ({...record, date: new Date(record.date), type: 'Withdrawal'}));
  } catch { /* An unreadable local history must not prevent opening Wallet. */ }
  const gameRecords = [{game: 'Fortune Treasures', provider: 'PG', status: 'Completed', time: '11/12/2026 14:45:32', bet: 2, win: 0}, {game: 'Super Ace', provider: 'JILI', status: 'Completed', time: '11/12/2026 14:45:21', bet: 2, win: 16}, {game: 'Gold Miner', provider: 'Facai', status: 'Pending', time: '11/12/2026 14:40:00', bet: 5, win: 0}];
  let responsibleScroll = 0, blockDuration = '15 Days', openTime = null;
  let fromSecurityRequirements = false;
  const fundDraft = {bank: '', first: '', middle: '', last: '', number: ''};
  const fundAccounts = {
    GCash: [{number: '9000000123'}, {number: '9000000456'}],
    Bank: [{bank: 'GoTyme Bank', number: '12345678'}, {bank: 'Banco de Oro', number: '87654321'}],
    Maya: [{number: '9000000789'}]
  };
  let walletCode = '', editingFund = null, pendingRemoval = null;
  const kycDraft = {idType: '', photos: {front: null, back: null, selfie: null}, first: '', middle: '', last: '', birth: '', gender: '', nationality: '', birthplace: '', permanent: '', current: '', sameAddress: false, branch: '', income: '', work: ''};
  let kycStep = 1;
  // Prototype state; replace with account data when the flows are connected.
  const accountStatus = {kycApproved: false, loginPasswordSet: localStorage.fpLoginPasswordSet === 'true', walletPasswordSet: false};
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

  // Use the existing Filplay picker surface for all account selects.
  function enhanceAccountSelects() {
    overlay.querySelectorAll('select:not([data-customized])').forEach(select => {
      select.dataset.customized = 'true'; select.hidden = true;
      const trigger = document.createElement('button');
      trigger.type = 'button'; trigger.className = 'custom-field account-select-trigger';
      trigger.setAttribute('aria-label', select.getAttribute('aria-label') || 'Select');
      trigger.setAttribute('aria-haspopup', 'dialog'); trigger.setAttribute('aria-expanded', 'false');
      const text = document.createElement('span'); text.textContent = select.selectedOptions[0]?.textContent || 'Please select';
      trigger.append(text); trigger.insertAdjacentHTML('beforeend', icon('chevron')); select.after(trigger);
      trigger.onclick = event => {
        event.preventDefault(); event.stopPropagation();
        const shade = document.createElement('div'); shade.className = 'account-picker';
        const panel = document.createElement('div'); panel.className = 'kyc-picker-card'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
        const title = select.getAttribute('aria-label') || 'Select'; panel.setAttribute('aria-label', title);
        const header = document.createElement('header'); const heading = document.createElement('h3'); heading.textContent = title;
        const close = document.createElement('button'); close.type = 'button'; close.className = 'ui-icon-button'; close.setAttribute('aria-label', 'Close ' + title); close.innerHTML = icon('close'); header.append(heading, close); panel.append(header);
        const options = document.createElement('div'); options.className = 'kyc-options';
        [...select.options].forEach(option => { if (option.disabled || (!option.value && select.options.length > 1)) return; const button = document.createElement('button'); button.type = 'button'; button.className = 'kyc-option'; button.textContent = option.textContent; button.setAttribute('aria-pressed', String(option.selected)); button.onclick = () => { select.value = option.value; text.textContent = option.textContent; dismissPicker(false); select.dispatchEvent(new Event('change', {bubbles: true})); if (trigger.isConnected) trigger.focus({preventScroll: true}); }; options.append(button); });
        panel.append(options); shade.append(panel); overlay.append(shade); trigger.setAttribute('aria-expanded', 'true');
        function dismissPicker(restore = true) { shade.remove(); trigger.setAttribute('aria-expanded', 'false'); if (restore && trigger.isConnected) trigger.focus({preventScroll: true}); }
        close.onclick = () => dismissPicker(); shade.onclick = e => { if (e.target === shade) dismissPicker(); };
        shade.onkeydown = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); dismissPicker(); } else if (e.key === 'Tab') { const nodes = [...panel.querySelectorAll('button:not(:disabled)')]; if (e.shiftKey && document.activeElement === nodes[0]) { e.preventDefault(); nodes.at(-1)?.focus(); } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) { e.preventDefault(); nodes[0]?.focus(); } } };
        (options.querySelector('[aria-pressed="true"]') || options.querySelector('button') || close).focus({preventScroll: true});
      };
    });
  }
  new MutationObserver(enhanceAccountSelects).observe(overlay, {childList: true, subtree: true});
  new MutationObserver(() => { const page = stage.querySelector('.bag-page, .wallet-page'); if (page) page.inert = overlay.classList.contains('open'); }).observe(overlay, {attributes: true, attributeFilter: ['class']});

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
    if (fromSecurityRequirements && ['#/account/kyc', '#/account/wallet-password'].includes(location.hash)) { fromSecurityRequirements = false; navigate('/account/security-requirements'); return; }
    if (location.hash === '#/account/remove-fund' || location.hash === '#/account/remove-verify') { pendingRemoval = null; navigate('/account'); return; }
    if (location.hash.split('?')[0] === '#/account/transaction-detail') { navigate('/account'); return; }
    if (location.hash === '#/account/add-fund') { navigate('/account'); return; }
    if (location.hash === '#/account/security-requirements') { navigate('/account'); return; }
    if (['#/account/block-confirm', '#/account/faq', '#/account/terms', '#/account/fund-verify', '#/account/login-password', '#/account/wallet-password', '#/account/kyc'].includes(location.hash)) { navigate('/account'); return; }
    closeDialog();
    if(walletOrigin && location.hash === '#/account'){walletOrigin=false;navigate(`/wallet?mode=${walletMode}&channel=${walletChannel}`);return;}
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
    if(title !== 'KYC verify' && (walletOrigin || location.hash.startsWith('#/wallet'))) card.classList.add('wallet-flow');
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
      signed = true; sync(); closeDialog(false); navigate(walletOrigin ? '/wallet?mode=deposit' : '/');
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
      content.querySelector('.account-name').onclick = editNickname;
      content.querySelector('.account-avatar').onclick = () => navigate('/account/avatar');
      content.querySelector('.copy-id').onclick = async () => { try { await navigator.clipboard.writeText('10000001'); toast('ID copied'); } catch { toast('Copy unavailable'); } };
    } else if (accountSection === 'funds' || accountSection === 'transactions') {
      const funds = accountSection === 'funds';
      const tabs = funds ? ['GCash', 'Bank', 'Maya'] : ['Deposit', 'Withdrawal', 'Game', 'Reward'];
      const selected = funds ? fundTab : transactionTab;
      content.innerHTML = `<div class="center-tabs" role="tablist">${tabs.map(tab => `<button type="button" class="ui-btn ${tab === selected ? 'selected' : ''}" role="tab" aria-selected="${tab === selected}" data-tab="${tab}">${tab}</button>`).join('')}</div>${funds ? `<div class="fund-list"></div><div class="center-empty fund-add">${fundAccounts[fundTab].length ? '' : `${icon('wallet')}<span>No accounts added</span>`}<button type="button" class="ui-btn primary" id="add-fund-account" ${fundAccounts[fundTab].length >= 5 ? 'disabled' : ''}>Add Account</button></div>` : selected === 'Game' ? `<div class="game-history"></div>` : selected === 'Reward' ? `<div class="reward-history"></div>` : ['Deposit', 'Withdrawal'].includes(selected) ? `<div class="deposit-history"></div>` : `<div class="center-empty">${icon('transactions')}<span>Transaction records unavailable</span></div>`}`;
      if (!funds && ['Deposit', 'Withdrawal'].includes(selected)) {
        const withdrawal = selected === 'Withdrawal', statusFilter = withdrawal ? withdrawalStatus : depositStatus, periodFilter = withdrawal ? withdrawalPeriod : depositPeriod;
        const now = new Date(), day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const example = (offset, channel, status, amount) => { const date = new Date(day); date.setDate(date.getDate() - offset); date.setHours(14, 25, 30); return {channel, status, amount, date}; };
        const examples = withdrawal ? [example(0, 'Bank', 'Completed', 1200), example(1, 'GCash', 'Pending', 500), example(9, 'Maya', 'Canceled', 300), example(20, 'Bank', 'Timeout', 700)] : [example(0, 'GCash', 'Completed', 500), example(1, 'Maya', 'Pending', 300), example(9, 'Bank', 'Canceled', 800), example(20, 'GCash', 'Timeout', 200)];
        const end = new Date(day); if (periodFilter === 'Yesterday') end.setDate(end.getDate() - 1);
        const count = {'Today':1, 'Yesterday':1, 'Last 7 days':7, 'Last 15 days':15, 'Last 30 days':30}[periodFilter];
        const start = new Date(end); start.setDate(start.getDate() - count + 1);
        const records = (withdrawal ? [...withdrawalRecords, ...examples] : examples).filter(record => { const date = new Date(record.date.getFullYear(), record.date.getMonth(), record.date.getDate()); return (statusFilter === 'All Status' || record.status === statusFilter) && date >= start && date <= end; });
        const format = date => `${date.getFullYear()}/${String(date.getMonth()+1).padStart(2,'0')}/${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}:${String(date.getSeconds()).padStart(2,'0')}`;
        const history = content.querySelector('.deposit-history');
        history.innerHTML = `<div class="game-history-tools"><label><span class="sr-only">Status</span><select class="custom-field" id="deposit-status" aria-label="Status">${['All Status','Pending','Completed','Canceled','Timeout'].map(status => `<option ${status === statusFilter ? 'selected' : ''}>${status}</option>`).join('')}</select></label><label><span class="sr-only">Time period</span><select class="custom-field" id="deposit-period" aria-label="Time period">${['Today','Yesterday','Last 7 days','Last 15 days','Last 30 days'].map(period => `<option ${period === periodFilter ? 'selected' : ''}>${period}</option>`).join('')}</select></label></div><div class="deposit-records">${records.length ? records.map((record, index) => `<button type="button" class="deposit-record" data-record-index="${index}"><div><strong>${record.channel}</strong><time>${format(record.date)}</time></div><div class="deposit-record-right"><strong>${withdrawal ? '−' : '+'} ₱${record.amount.toFixed(2)}</strong><span>${record.status}</span></div></button>`).join('') : `<div class="center-empty">${icon('transactions')}<span>No records</span></div>`}</div><div class="deposit-count">${records.length} ${records.length === 1 ? 'record' : 'records'}</div>`;
        history.querySelectorAll('[data-record-index]').forEach(button => button.onclick = () => { const record = records[Number(button.dataset.recordIndex)]; transactionDetail = {...record, type: selected, id: record.id || `${withdrawal ? '2' : '1'}${record.date.getTime()}${String(record.amount).padStart(4, '0')}`}; transactionScroll = content.scrollTop; navigate('/account/transaction-detail' + (record.id ? '?id=' + encodeURIComponent(record.id) : '')); });
        history.querySelector('#deposit-status').onchange = event => { if (withdrawal) withdrawalStatus = event.target.value; else depositStatus = event.target.value; account(); };
        history.querySelector('#deposit-period').onchange = event => { if (withdrawal) withdrawalPeriod = event.target.value; else depositPeriod = event.target.value; account(); };
      }
      if (!funds && selected === 'Reward') {
        const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const days = {'Today':1, 'Yesterday':1, 'Last 3 days':3, 'Last 7 days':7, 'Last 15 days':15, 'Last 30 days':30};
        const end = new Date(today); if (rewardPeriod === 'Yesterday') end.setDate(end.getDate() - 1);
        const start = new Date(end); start.setDate(start.getDate() - days[rewardPeriod] + 1);
        const rewards = [0, 1, 2].map((offset, index) => { const date = new Date(today); date.setDate(date.getDate() - offset); date.setHours(16, 15, 8); return {type: ['TPG Daily Loss Rebate', 'Daily Rebate', 'TPG Daily Loss Rebate'][index], date, bonus: [140, 28, 75][index]}; }).filter(record => { const date = new Date(record.date.getFullYear(), record.date.getMonth(), record.date.getDate()); return date >= start && date <= end; });
        const format = date => `${String(date.getMonth()+1).padStart(2,'0')}/${String(date.getDate()).padStart(2,'0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}:${String(date.getSeconds()).padStart(2,'0')}`;
        const history = content.querySelector('.reward-history');
        history.innerHTML = `<div class="reward-filter"><select class="custom-field" aria-label="Time period" id="reward-period">${Object.keys(days).map(period => `<option ${period === rewardPeriod ? 'selected' : ''}>${period}</option>`).join('')}</select></div><div class="reward-records">${rewards.length ? rewards.map(record => `<article class="reward-record"><div><span>Type</span><strong>${record.type}</strong></div><div><span>Time</span><strong>${format(record.date)}</strong></div><div><span>Bonus</span><strong>+₱${record.bonus.toFixed(2)}</strong></div></article>`).join('') : `<div class="center-empty">${icon('transactions')}<span>No records</span></div>`}</div>`;
        history.querySelector('#reward-period').onchange = event => { rewardPeriod = event.target.value; account(); };
      }
      if (!funds && selected === 'Game') {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const days = {'Today': 1, 'Yesterday': 1, 'Last 7 days': 7, 'Last 15 days': 15, 'Last 30 days': 30};
        const end = new Date(today); if (gamePeriod === 'Yesterday') end.setDate(end.getDate() - 1);
        const start = new Date(end); start.setDate(start.getDate() - days[gamePeriod] + 1);
        const records = gameRecords.filter(record => { const [date] = record.time.split(' '), [month, day, year] = date.split('/').map(Number); const recorded = new Date(year, month - 1, day); return (gameProvider === 'All Games' || record.provider === gameProvider) && recorded >= start && recorded <= end; });
        const total = key => records.reduce((sum, record) => sum + record[key], 0).toFixed(2);
        const history = content.querySelector('.game-history');
        history.innerHTML = `<div class="game-history-tools"><label><span class="sr-only">Provider</span><select class="custom-field" id="game-provider" aria-label="Provider">${['All Games','JILI','PG','PP','Evolution','Facai','Hacksaw'].map(provider => `<option ${provider === gameProvider ? 'selected' : ''}>${provider}</option>`).join('')}</select></label><label><span class="sr-only">Time period</span><select class="custom-field" id="game-period" aria-label="Time period">${['Today','Yesterday','Last 7 days','Last 15 days','Last 30 days'].map(period => `<option ${period === gamePeriod ? 'selected' : ''}>${period}</option>`).join('')}</select></label></div><div class="game-totals"><div><span>Total Bet (₱)</span><strong>${total('bet')}</strong></div><div><span>Total Wins (₱)</span><strong>${total('win')}</strong></div></div><div class="game-records">${records.length ? records.map(record => `<article class="game-record"><div class="game-record-top"><strong>${record.game}</strong><span class="game-record-status">${record.status}</span></div><time>${record.time}</time><div class="game-values"><div><strong>${record.bet.toFixed(2)}</strong><span>Bet (₱)</span></div><div><strong>${record.win.toFixed(2)}</strong><span>Win (₱)</span></div></div></article>`).join('') : '<div class="center-empty">No records</div>'}</div>`;
        history.querySelector('#game-provider').onchange = event => { gameProvider = event.target.value; account(); };
        history.querySelector('#game-period').onchange = event => { gamePeriod = event.target.value; account(); };
      }
      if (funds) fundAccounts[fundTab].forEach((entry, index) => { const item = document.createElement('div'); item.className = 'fund-account-row'; const info = document.createElement('span'); if (fundTab === 'Bank') { info.className = 'fund-bank-info'; const bankName = document.createElement('span'), bankNumber = document.createElement('span'); bankName.textContent = entry.bank; bankNumber.textContent = entry.number; info.append(bankName, bankNumber); } else info.textContent = `+63 ${entry.number}`; const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'ui-btn'; remove.textContent = 'Delete'; remove.setAttribute('aria-label', `Delete ${fundTab} account ending in ${entry.number.slice(-4)}`); remove.onclick = () => { pendingRemoval = {channel: fundTab, entry}; navigate('/account/remove-fund'); }; item.append(info, remove); content.querySelector('.fund-list').append(item); });
      content.querySelectorAll('[data-tab]').forEach(button => button.onclick = () => { if (funds) fundTab = button.dataset.tab; else transactionTab = button.dataset.tab; account(); });
      if (funds) content.querySelector('#add-fund-account').onclick = () => {
        editingFund = null; Object.assign(fundDraft, {bank:'', first:'', middle:'', last:'', number:''});
        if (!accountStatus.kycApproved || !accountStatus.walletPasswordSet) navigate('/account/security-requirements');
        else navigate('/account/add-fund');
      };
      if (!funds && transactionScroll) { content.scrollTop = transactionScroll; transactionScroll = 0; }
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
  function showTransactionDetail() {
    const recordId = new URLSearchParams(location.hash.split('?')[1]).get('id');
    if (recordId) { transactionDetail = withdrawalRecords.find(record => record.id === recordId) || null; if(transactionDetail){accountSection='transactions';transactionTab='Withdrawal';} }
    if (!transactionDetail) { navigate('/account'); return; }
    const record = transactionDetail;
    const detailRow = (name, value) => `<div class="transaction-detail-row"><span>${name}</span><strong>${value}</strong></div>`;
    shell(record.type, `<div class="transaction-detail">${detailRow('Type', record.type)}${detailRow('Payment Method', record.channel)}${detailRow('Amount', `₱${record.amount.toFixed(2)}`)}${detailRow('Status', record.status)}<div class="transaction-detail-row"><span>Transaction ID</span><div class="transaction-id"><strong></strong><button type="button" class="ui-icon-button" aria-label="Copy transaction ID">${icon('copy')}</button></div></div></div><button type="button" class="ui-btn primary transaction-okay">Okay</button>`);
    card.querySelector('.transaction-id strong').textContent = record.id;
    const back = () => navigate('/account'); card.querySelector('.ui-close').onclick = back; card.querySelector('.transaction-okay').onclick = back;
    card.querySelector('.transaction-id button').onclick = async () => { try { await navigator.clipboard.writeText(record.id); toast('Transaction ID copied'); } catch { toast('Copy unavailable'); } };
  }
  function addFundAccount() {
    const bank = fundTab === 'Bank';
    const banks = ['GoTyme Bank', 'Bank of the Philippine Islands', 'Bank Of China', 'Banco de Oro', 'Union Bank Of The Philippines', 'China Banking Corporation'];
    const bankFields = `<label class="field-label" for="fund-bank">Bank Name</label><select class="custom-field" id="fund-bank" aria-label="Bank Name"><option value="">Please select a bank</option>${banks.map(name => `<option>${name}</option>`).join('')}</select><span class="field-label">Full Name</span><div class="fund-names"><input class="custom-field" aria-label="First Name" placeholder="First Name"><input class="custom-field" aria-label="Middle Name (Optional)" placeholder="Middle Name (Optional)"><input class="custom-field" aria-label="Last Name" placeholder="Last Name"></div><label class="field-label" for="fund-number">Bank Account No. (8–16 digits)</label><input type="text" id="fund-number" class="custom-field" inputmode="none" autocomplete="off" maxlength="16" placeholder="Enter bank account number" aria-label="Bank Account No.">`;
    const mobileFields = `<label class="field-label" for="fund-number">${fundTab} Account No. (+63 9xx xxx xxxx)</label><div class="fund-number"><span>+63</span><input type="text" id="fund-number" class="custom-field" inputmode="none" autocomplete="off" maxlength="10" placeholder="Enter ${fundTab} phone number here" aria-label="${fundTab} Account No."></div>`;
    shell(bank ? 'Add Bank Account' : `Add ${fundTab} Account`, `${bank ? bankFields : mobileFields}<div class="form-error" role="status"></div><button type="button" class="ui-btn primary fund-confirm">${bank ? 'Next' : 'Confirm'}</button>`);
    card.querySelector('.ui-close').onclick = () => navigate('/account');
    const input = card.querySelector('#fund-number');
    input.value = fundDraft.number; input.oninput = () => { fundDraft.number = input.value; };
    if (bank) { const bankSelect = card.querySelector('#fund-bank'); bankSelect.value = fundDraft.bank; bankSelect.onchange = () => { fundDraft.bank = bankSelect.value; }; card.querySelectorAll('.fund-names input').forEach((field, index) => { const key = ['first', 'middle', 'last'][index]; field.value = fundDraft[key]; field.oninput = () => { fundDraft[key] = field.value; }; }); }
    const open = () => { if (!keyboard.restoring) keyboard.open(input, {kind: 'preview-numeric', container: overlay}); };
    input.onfocus = input.onclick = open;
    card.querySelector('.fund-confirm').onclick = () => {
      const error = card.querySelector('.form-error');
      if (bank) { const names = card.querySelectorAll('.fund-names input'); if (!card.querySelector('#fund-bank').value || !names[0].value.trim() || !names[2].value.trim() || !/^\d{8,16}$/.test(input.value)) { error.textContent = 'Complete the required fields and enter an 8–16 digit account number.'; return; } }
      else if (!/^9\d{9}$/.test(input.value)) { error.textContent = `Enter a valid ${fundTab} number.`; return; }
      navigate('/account/fund-verify');
    };
  }
  function confirmFundRemoval() {
    if (!pendingRemoval || !fundAccounts[pendingRemoval.channel].includes(pendingRemoval.entry)) { pendingRemoval = null; navigate('/account'); return; }
    shell('Delete Account?', `<p class="confirm-message">Are you sure you want to remove this account?</p><div class="confirm-actions"><button type="button" class="ui-btn" id="cancel-remove">Cancel</button><button type="button" class="ui-btn primary" id="confirm-remove">Delete</button></div>`);
    const cancel = () => { pendingRemoval = null; navigate('/account'); };
    card.querySelector('.ui-close').onclick = card.querySelector('#cancel-remove').onclick = cancel;
    card.querySelector('#confirm-remove').onclick = () => navigate('/account/remove-verify');
  }
  function fundVerify(removing = false) {
    if (removing && (!pendingRemoval || !fundAccounts[pendingRemoval.channel].includes(pendingRemoval.entry))) { pendingRemoval = null; navigate('/account'); return; }
    shell('Enter Wallet Password', `<label class="field-label" for="fund-password">Wallet Password</label><input id="fund-password" class="custom-field" type="password" inputmode="none" autocomplete="off" maxlength="6" aria-label="Wallet Password" placeholder="Enter 6-digit password"><div class="form-error" role="status"></div><button type="button" class="ui-btn primary fund-confirm">Next</button>`);
    card.querySelector('.ui-close').onclick = () => { if (removing) { pendingRemoval = null; navigate('/account'); } else navigate('/account/add-fund'); };
    const input = card.querySelector('#fund-password');
    const open = () => { if (!keyboard.restoring) keyboard.open(input, {kind: 'preview-numeric', container: overlay}); };
    input.onfocus = input.onclick = open;
    card.querySelector('.fund-confirm').onclick = () => { if (!/^\d{6}$/.test(input.value)) { card.querySelector('.form-error').textContent = 'Enter your 6-digit wallet password.'; return; } if (input.value !== walletCode) { card.querySelector('.form-error').textContent = 'Incorrect wallet password.'; return; } if (removing) { const list = fundAccounts[pendingRemoval.channel], index = list.indexOf(pendingRemoval.entry); if (index < 0) { pendingRemoval = null; navigate('/account'); return; } list.splice(index, 1); pendingRemoval = null; input.value = ''; navigate('/account'); toast('Account removed successfully'); return; } const entry = {...fundDraft}; if (editingFund === null) fundAccounts[fundTab].push(entry); else fundAccounts[fundTab][editingFund] = entry; editingFund = null; input.value = ''; navigate('/account'); toast('Account saved'); };
  }
  function securityRequirements() {
    const requirement = (label, done, action, image) => `<button type="button" class="security-requirement" data-requirement="${action}" ${done ? 'disabled' : ''}>${icon(image)}<span>${label}</span>${done ? '<span class="security-done" aria-label="Done">✓</span>' : icon('chevron')}</button>`;
    shell('Security Requirements', `<p class="security-message">Before adding a fund account, set a wallet password and complete KYC verification.</p><div class="security-requirements">${requirement('Set Wallet Password', accountStatus.walletPasswordSet, 'wallet-password', 'wallet')}${requirement('KYC Verify', accountStatus.kycApproved, 'kyc', 'security')}</div>`);
    card.querySelector('.ui-close').onclick = () => navigate('/account');
    card.querySelectorAll('[data-requirement]:not(:disabled)').forEach(button => button.onclick = () => { fromSecurityRequirements = true; navigate('/account/' + button.dataset.requirement); });
  }
  function closeAccountFlow() {
    if(walletOrigin && !fromSecurityRequirements){walletResume=walletResume&&accountStatus.kycApproved;navigate(`/wallet?mode=${walletMode}&channel=${walletChannel}`);return;}
    if (fromSecurityRequirements) { fromSecurityRequirements = false; navigate('/account/security-requirements'); }
    else navigate('/account');
  }
  function kyc() {
    if (kycStep > 1) { kycDetails(); return; }
    const types = ['Country ID', 'Unified Multi-Purpose ID (UMID)', "Driver's License", 'Passport', 'PhilHealth ID', 'SSS (Social Security System) ID', 'Postal ID', 'PRC ID', 'TIN – New Version'];
    shell('KYC verify', `<div class="kyc-progress" aria-label="Step 1 of 3"><span class="current"></span><span></span><span></span></div><div class="kyc-scroll"><h3>Upload Identification</h3><p>Please upload the required images and a selfie holding your ID.</p><label class="field-label">ID Type</label><button type="button" class="custom-field kyc-select" id="kyc-type">${kycDraft.idType || 'Please select'} ${icon('chevron')}</button><div class="kyc-photos">${[['front','Front side of ID'],['back','Back side of ID'],['selfie','Selfie with ID card']].map(([key,label]) => `<div><span class="field-label">${label}</span><label class="kyc-upload" for="kyc-${key}">${icon('user')}<span>${kycDraft.photos[key] ? 'Change Photo' : 'Take Photo'}</span></label><input class="kyc-file" id="kyc-${key}" type="file" accept="image/*" data-photo="${key}"><span class="kyc-file-name" data-file-name="${key}"></span></div>`).join('')}</div><div class="form-error" role="status"></div><button type="button" class="ui-btn primary kyc-next">Next</button></div><div class="kyc-picker" hidden><div class="kyc-picker-card" role="dialog" aria-modal="true" aria-labelledby="kyc-picker-title"><header><h3 id="kyc-picker-title">ID Type</h3><button type="button" class="ui-icon-button" id="kyc-picker-close" aria-label="Close ID type">${icon('close')}</button></header><div class="kyc-options">${types.map((type,i) => `<button type="button" data-id-index="${i}" class="kyc-option">${type}</button>`).join('')}</div></div></div>`);
    card.querySelector('.ui-close').onclick = closeAccountFlow;
    const picker = card.querySelector('.kyc-picker'), trigger = card.querySelector('#kyc-type');
    trigger.onclick = () => { picker.hidden = false; picker.querySelector('.kyc-option').focus(); };
    const closePicker = () => { picker.hidden = true; trigger.focus(); };
    card.querySelector('#kyc-picker-close').onclick = closePicker;
    picker.onclick = event => { if (event.target === picker) closePicker(); };
    picker.querySelectorAll('[data-id-index]').forEach(button => button.onclick = () => { kycDraft.idType = types[Number(button.dataset.idIndex)]; trigger.firstChild.textContent = kycDraft.idType + ' '; closePicker(); });
    card.querySelectorAll('[data-photo]').forEach(input => { const key = input.dataset.photo; const name = card.querySelector(`[data-file-name="${key}"]`); if (kycDraft.photos[key]) name.textContent = kycDraft.photos[key].name; input.onchange = () => { if (input.files[0]) { kycDraft.photos[key] = input.files[0]; name.textContent = input.files[0].name; input.previousElementSibling.querySelector('span').textContent = 'Change Photo'; } }; });
    card.querySelector('.kyc-next').onclick = () => { const missing = []; if (!kycDraft.idType) missing.push('Select an ID type'); if (!kycDraft.photos.front) missing.push('Front of ID is required'); if (!kycDraft.photos.back) missing.push('Back of ID is required'); if (!kycDraft.photos.selfie) missing.push('Selfie with ID is required'); card.querySelector('.form-error').textContent = missing.length ? missing.join(' · ') : ''; if (!missing.length) { kycStep = 2; kyc(); } };
  }
  function kycDetails() {
    const field = (key, label, type = 'text') => `<label class="kyc-form-field"><span class="field-label">${label}</span><input class="custom-field" type="${type}" data-kyc-field="${key}" aria-label="${label}" placeholder="${type === 'text' ? label : ''}"></label>`;
    const select = (key, label, options) => `<label class="kyc-form-field"><span class="field-label">${label}</span><select class="custom-field" data-kyc-field="${key}" aria-label="${label}"><option value="">Please select</option>${options.map(option => `<option>${option}</option>`).join('')}</select></label>`;
    const stepTwo = `<h3>Basic Information</h3><div class="kyc-grid">${field('first','First Name')}${field('middle','Middle Name (optional)')}${field('last','Last Name')}<label class="kyc-form-field"><span class="field-label">Date of Birth</span><input class="custom-field" type="text" inputmode="numeric" autocomplete="bday" maxlength="10" data-kyc-field="birth" aria-label="Date of Birth" placeholder="MM dd YYYY"></label><div class="kyc-full"><span class="field-label">Gender</span><div class="kyc-gender">${['Female','Male'].map(value => `<button type="button" class="ui-btn ${kycDraft.gender === value ? 'selected' : ''}" data-gender="${value}" aria-pressed="${kycDraft.gender === value}">${value}</button>`).join('')}</div></div>${select('nationality','Nationality',['Philippines'])}${field('birthplace','Place of Birth')}</div>`;
    const stepThree = `<h3>Address And Income</h3><div class="kyc-grid"><label class="kyc-form-field kyc-full"><span class="field-label">Permanent Address</span><textarea class="custom-field kyc-address" data-kyc-field="permanent" aria-label="Permanent Address"></textarea></label><label class="kyc-form-field kyc-full"><span class="field-label">Current Address</span><textarea class="custom-field kyc-address" data-kyc-field="current" aria-label="Current Address" ${kycDraft.sameAddress ? 'readonly' : ''}></textarea></label><label class="kyc-same kyc-full"><input type="checkbox" id="kyc-same" ${kycDraft.sameAddress ? 'checked' : ''}> Same permanent address</label>${select('branch','Nearest Branch',['2040 Taft Ave, Pasay, Metro Manila'])}${select('income','Source of Income',['Employment Income'])}<div class="kyc-full">${select('work','Nature of Work',['Employed – Permanent/Contractual'])}</div></div>`;
    shell('KYC verify', `<div class="kyc-progress" aria-label="Step ${kycStep} of 3">${[1,2,3].map(n => `<span class="${n <= kycStep ? 'current' : ''}"></span>`).join('')}</div><div class="kyc-scroll">${kycStep === 2 ? stepTwo : stepThree}<div class="form-error" role="status"></div></div><div class="kyc-footer"><button type="button" class="ui-btn kyc-previous">Previous</button><button type="button" class="ui-btn primary kyc-next">Next</button></div>`);
    card.querySelector('.ui-close').onclick = closeAccountFlow;
    card.querySelectorAll('[data-kyc-field]').forEach(input => { const key = input.dataset.kycField; input.value = kycDraft[key]; input.oninput = input.onchange = () => { kycDraft[key] = input.value; if (key === 'permanent' && kycDraft.sameAddress) { kycDraft.current = input.value; card.querySelector('[data-kyc-field="current"]').value = input.value; } }; });
    const birth = card.querySelector('[data-kyc-field="birth"]');
    if (birth) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(kycDraft.birth)) { const [year, month, day] = kycDraft.birth.split('-'); birth.value = kycDraft.birth = `${month} ${day} ${year}`; }
      birth.oninput = () => { const digits = birth.value.replace(/\D/g, '').slice(0, 8); birth.value = [digits.slice(0,2), digits.slice(2,4), digits.slice(4,8)].filter(Boolean).join(' '); kycDraft.birth = birth.value; };
    }
    card.querySelectorAll('[data-gender]').forEach(button => button.onclick = () => { kycDraft.gender = button.dataset.gender; card.querySelectorAll('[data-gender]').forEach(item => { const selected = item === button; item.classList.toggle('selected', selected); item.setAttribute('aria-pressed', String(selected)); }); });
    const same = card.querySelector('#kyc-same');
    if (same) same.onchange = () => { kycDraft.sameAddress = same.checked; const current = card.querySelector('[data-kyc-field="current"]'); current.readOnly = same.checked; if (same.checked) { kycDraft.current = kycDraft.permanent; current.value = kycDraft.current; } };
    card.querySelector('.kyc-previous').onclick = () => { kycStep--; kyc(); };
    card.querySelector('.kyc-next').onclick = () => { const required = kycStep === 2 ? ['first','last','birth','gender','nationality','birthplace'] : ['permanent','current','branch','income','work']; const missing = required.some(key => !String(kycDraft[key]).trim()); if (missing) { card.querySelector('.form-error').textContent = 'Please complete the required fields.'; return; } if (kycStep === 2) { const match = /^(\d{2}) (\d{2}) (\d{4})$/.exec(kycDraft.birth); const date = match && new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2])); if (!match || date.getFullYear() !== Number(match[3]) || date.getMonth() !== Number(match[1]) - 1 || date.getDate() !== Number(match[2])) { card.querySelector('.form-error').textContent = 'Enter a valid date of birth (MM dd YYYY).'; return; } kycStep = 3; kyc(); } else { accountStatus.kycApproved = true; kycStep = 1; closeAccountFlow(); toast('KYC approved in prototype'); } };
  }
  function passwordDialog(wallet) {
    const key = wallet ? 'walletPasswordSet' : 'loginPasswordSet';
    const title = `${accountStatus[key] ? 'Modify' : 'Set'} ${wallet ? 'Wallet' : 'Login'} Password`;
    shell(title, `<div class="password-form"><label class="field-label" for="password-new">Create a 6-digit numeric code</label><div class="password-field">${icon('lock')}<input id="password-new" class="custom-field" type="password" inputmode="none" autocomplete="new-password" maxlength="6" placeholder="Enter password" aria-label="Create a 6-digit numeric code"><button type="button" class="password-visibility" aria-label="Show password" data-show="password-new">Show</button></div><label class="field-label" for="password-confirm">Confirm a 6-digit numeric code</label><div class="password-field">${icon('lock')}<input id="password-confirm" class="custom-field" type="password" inputmode="none" autocomplete="new-password" maxlength="6" placeholder="Enter password" aria-label="Confirm a 6-digit numeric code"><button type="button" class="password-visibility" aria-label="Show confirmation" data-show="password-confirm">Show</button></div><div class="form-error" role="status"></div><button type="button" class="ui-btn primary password-submit" disabled>Confirm</button></div>`);
    card.querySelector('.ui-close').onclick = closeAccountFlow;
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
      accountStatus[key] = true; if (wallet) walletCode = inputs[0].value; else localStorage.fpLoginPasswordSet = 'true';
      inputs.forEach(input => { input.value = ''; });
      closeAccountFlow(); toast('Password set in prototype');
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
  function editNickname() {
    const editButton = card.querySelector('.account-name');
    const input = document.createElement('input');
    input.type = 'text'; input.hidden = true; input.maxLength = 24; input.value = name;
    input.setAttribute('aria-label', 'Nickname'); input.placeholder = 'Your name';
    stage.append(input);
    keyboard.open(input, {
      kind: 'preview-letters', container: overlay,
      onDone: value => { const next = value.trim(); if (!next) { toast('Enter a nickname'); return; } name = next; values.nickname = name; sync(); const label = card.querySelector('.account-name span'); if (label) label.textContent = name; },
      onClose: () => { input.remove(); if (editButton.isConnected) editButton.focus({preventScroll: true}); }
    });
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
  function secondary(title, backRoute = '/account') {
    closeDialog(false);
    const page = document.createElement('section'); page.className = 'secondary-page';
    page.innerHTML = `<header class="secondary-header"><button type="button" class="ui-back" aria-label="Back">${icon('back')}</button><h2></h2></header>`;
    page.querySelector('h2').textContent = title;
    page.querySelector('.ui-back').onclick = () => navigate(backRoute); stage.append(page);
  }
  // Wallet remains local-only; no production finance requests are made.
  let walletMode = 'deposit', walletChannel = 'GCash', walletAmount = null, walletQty = 1;
  let walletBonus = true, walletAccount = '', walletOrigin = false, walletResume = false;
  const walletBalance = 1000;
  const walletAmounts = {deposit: [20,50,100,300,500,1000,3000,5000,10000,30000,50000], withdraw: [100,200,500,1000,2000,5000,10000,50000]};
  const walletMoney = value => '₱' + value.toLocaleString('en-US');
  const walletFree = amount => amount < 50 ? 5 : amount < 500 ? 10 : amount < 1000 ? 50 : amount < 3000 ? 100 : 200;
  const walletImage = (amount, mode = walletMode) => {
    const key = mode === 'deposit' ? (amount <= 50 ? '07' : amount <= 300 ? 'gold' : amount <= 500 ? '08' : amount <= 1000 ? '09' : amount <= 5000 ? '10' : amount <= 30000 ? '06' : '11') : (amount <= 100 ? '07' : amount <= 500 ? 'gold' : amount <= 1000 ? '04' : amount <= 5000 ? '08' : amount <= 10000 ? '05' : '11');
    return 'assets/wallet/' + (key === 'gold' ? 'gold.png' : `bitmap-${key}.source.png`);
  };
  const walletChannelImage = channel => 'assets/wallet/' + ({GCash:'bitmap-12.source.png', QRPH:'bitmap-14.source.png', MAYA:'bitmap-13.source.png', BANK:'bank-provider-icon.source-1.svg'})[channel];
  const walletFundKey = () => ({GCash:'GCash', MAYA:'Maya', BANK:'Bank'})[walletChannel];
  const walletEntries = () => fundAccounts[walletFundKey()] || [];
  function walletCard(amount, isButton = true) {
    return `<${isButton ? 'button type="button"' : 'div'} class="wallet-amount-card" ${isButton ? `data-wallet-amount="${amount}" aria-label="${walletMode === 'deposit' ? `+${walletFree(amount)} Free ` : ''}${walletMoney(amount)}"` : ''}><img class="wallet-card-frame" src="assets/wallet/main-card-frame-hollow.source-1.svg" alt=""><img class="wallet-coins" src="${walletImage(amount)}" alt="">${walletMode === 'deposit' ? `<span class="wallet-free"><img src="assets/wallet/bonus-ribbon.source-1.png" alt=""><b>+${walletFree(amount)}Free</b></span>` : ''}<span class="wallet-price">${walletMoney(amount)}</span></${isButton ? 'button' : 'div'}>`;
  }
  function walletPage() {
    secondary('Wallet', '/');
    const page = stage.querySelector('.secondary-page'); page.classList.add('wallet-page');
    page.querySelector('header').insertAdjacentHTML('beforeend', `<div class="wallet-header-actions"><span class="wallet-balance"><img src="assets/wallet/header-coin.png" alt=""><b>${walletBalance.toFixed(2)}</b></span>${[['support','Customer Service','cs-icon.svg'],['transactions','Transactions','txs-icon.svg'],['funds','Fund Accounts','fund-icon.svg']].map(([action,label,image])=>`<button type="button" data-wallet-action="${action}" aria-label="${label}"><img src="assets/wallet/${image}" alt=""></button>`).join('')}</div>`);
    const channels = walletMode === 'deposit' ? ['GCash','QRPH','MAYA'] : ['BANK','MAYA','GCash'];
    page.insertAdjacentHTML('beforeend', `<nav class="wallet-channels" aria-label="Payment channel">${channels.map(channel=>`<button type="button" class="ui-btn ${walletChannel===channel?'primary':''}" data-wallet-channel="${channel}" aria-pressed="${walletChannel===channel}"><img src="${walletChannelImage(channel)}" alt="${channel}">${['BANK','MAYA','QRPH'].includes(channel)?`<span>${channel}</span>`:''}</button>`).join('')}</nav><div class="wallet-layout"><nav class="wallet-modes" aria-label="Wallet action">${[['deposit','Deposit'],['withdraw','Withdrawal']].map(([id,label])=>`<button type="button" class="ui-btn ${walletMode===id?'primary':''}" data-wallet-mode="${id}" aria-pressed="${walletMode===id}">${label}</button>`).join('')}</nav><div class="wallet-grid">${walletAmounts[walletMode].map(amount=>walletCard(amount)).join('')}</div></div>`);
    page.querySelectorAll('[data-wallet-mode]').forEach(button=>button.onclick=()=>{walletMode=button.dataset.walletMode; if(walletMode==='withdraw'&&walletChannel==='QRPH')walletChannel='GCash';if(walletMode==='deposit'&&walletChannel==='BANK')walletChannel='GCash';walletAmount=null;walletResume=false;navigate(`/wallet?mode=${walletMode}&channel=${walletChannel}`);});
    page.querySelectorAll('[data-wallet-channel]').forEach(button=>button.onclick=()=>{walletChannel=button.dataset.walletChannel;walletAccount='';walletAmount=null;walletResume=false;navigate(`/wallet?mode=${walletMode}&channel=${walletChannel}`);});
    page.querySelectorAll('[data-wallet-amount]').forEach(button=>button.onclick=()=>{if(!signed){walletOrigin=true;navigate('/login');return;}walletAmount=Number(button.dataset.walletAmount);walletQty=1;walletBonus=true;if(walletMode==='deposit'&&!accountStatus.kycApproved)walletDepositKyc();else walletConfirm();});
    page.querySelectorAll('[data-wallet-action]').forEach(button=>button.onclick=()=>{const action=button.dataset.walletAction;if(action==='support'){navigate('/support');return;}walletOrigin=true;accountSection=action;transactionTab=walletMode==='deposit'?'Deposit':'Withdrawal';if(walletFundKey())fundTab=walletFundKey();navigate('/account');});
  }
  function walletConfirm() {
    if (!walletAmount) return;
    const withdraw = walletMode === 'withdraw', total = walletAmount * walletQty;
    const entries=walletEntries(); if(!entries.some(entry=>entry.number===walletAccount)) walletAccount=entries[0]?.number || '';
    shell(withdraw?'Withdrawal':'Deposit', `<div class="wallet-confirm-top">${walletCard(walletAmount,false)}<div class="wallet-total"><span>Total Amount</span><strong>${walletMoney(total)}</strong>${withdraw?'':`<b class="wallet-bonus-total" ${walletBonus?'':'hidden'}>+${walletFree(total)} Free</b>`}<div class="wallet-quantity"><button type="button" aria-label="Decrease quantity" ${walletQty===1?'disabled':''}><img src="assets/wallet/quantity-minus.svg" alt=""></button><output aria-label="Quantity">${walletQty}</output><button type="button" aria-label="Increase quantity"><img src="assets/wallet/quantity-plus.svg" alt=""></button></div></div></div>${withdraw?`<div class="wallet-selected-account"><img src="${walletChannelImage(walletChannel)}" alt="${walletChannel}"><span>${walletAccount?(walletChannel==='BANK'?'':'+63 ')+walletAccount:'No account selected'}</span><button class="ui-btn primary wallet-select-account" type="button">Select</button></div>`:`<p class="wallet-turnover">Complete turnover to withdraw. Turnover clears if balance ≤ ₱10.</p><label class="sr-only" for="wallet-bonus-select">Deposit bonus</label><select class="custom-field" id="wallet-bonus-select" aria-label="Deposit bonus"><option value="yes">Deposit Bonus +${walletMoney(walletFree(total))}</option><option value="no">NOT SELECTED</option></select>`}<div class="form-error" role="status"></div><button type="button" class="ui-btn primary wallet-submit">${withdraw?walletMoney(total):'Deposit'}</button>`);
    card.classList.add('wallet-confirm');
    card.querySelector('[aria-label="Decrease quantity"]').onclick=()=>{walletQty=Math.max(1,walletQty-1);walletConfirm();};
    card.querySelector('[aria-label="Increase quantity"]').onclick=()=>{walletQty++;walletConfirm();};
    if(withdraw)card.querySelector('.wallet-select-account').onclick=walletAccountPicker;
    else {const select=card.querySelector('select');select.value=walletBonus?'yes':'no';select.onchange=()=>{walletBonus=select.value==='yes';card.querySelector('.wallet-bonus-total').hidden=!walletBonus;};}
    card.querySelector('.wallet-submit').onclick=walletCheck;
  }
  function walletAccountPicker() {
    shell('Withdrawal', `<div class="wallet-account-options">${walletEntries().map((entry,index)=>`<button class="custom-field" data-wallet-account="${index}" aria-pressed="${walletAccount===entry.number}">${walletChannel==='BANK'?(entry.bank||'Bank')+' · ':'+63 '}${entry.number}</button>`).join('')||'<p class="confirm-message">No accounts added</p>'}</div><button class="ui-btn primary wallet-add-account">Add</button>`);
    card.querySelector('.ui-close').onclick=walletConfirm;
    card.querySelectorAll('[data-wallet-account]').forEach(button=>button.onclick=()=>{walletAccount=walletEntries()[Number(button.dataset.walletAccount)].number;walletConfirm();});
    card.querySelector('.wallet-add-account').onclick=()=>{walletOrigin=true;walletResume=true;fundTab=walletFundKey();editingFund=null;Object.keys(fundDraft).forEach(key=>fundDraft[key]='');navigate(!accountStatus.kycApproved||!accountStatus.walletPasswordSet?'/account/security-requirements':'/account/add-fund');};
  }
  function walletRequirements() {
    walletOrigin=true;walletResume=true;
    const requirement=(label,done,action,image)=>`<button class="security-requirement" type="button" data-wallet-requirement="${action}" ${done?'disabled':''}>${icon(image)}<span>${label}</span>${done?'<span class="security-done">Done</span>':icon('chevron')}</button>`;
    shell('Security Requirements', `<div class="security-requirements">${requirement('Set Wallet Password',accountStatus.walletPasswordSet,'wallet-password','wallet')}${requirement('KYC Verify',accountStatus.kycApproved,'kyc','security')}</div>${accountStatus.walletPasswordSet&&accountStatus.kycApproved?'<button class="ui-btn primary wallet-continue">Continue</button>':''}`);
    card.querySelector('.ui-close').onclick=()=>{walletResume=false;navigate(`/wallet?mode=${walletMode}&channel=${walletChannel}`);};
    card.querySelectorAll('[data-wallet-requirement]:not(:disabled)').forEach(button=>button.onclick=()=>{fromSecurityRequirements=true;navigate('/account/'+button.dataset.walletRequirement);});
    const next=card.querySelector('.wallet-continue');if(next)next.onclick=()=>{walletResume=true;navigate(`/wallet?mode=${walletMode}&channel=${walletChannel}`);};
  }
  function walletDepositKyc() {
    shell('KYC Verification', `<p class="confirm-message">Complete KYC verification before making a deposit.</p><button type="button" class="ui-btn primary wallet-kyc">Verify</button>`);
    card.classList.add('wallet-kyc-notice');
    card.querySelector('.wallet-kyc').onclick=()=>{walletOrigin=true;walletResume=true;fromSecurityRequirements=false;navigate('/account/kyc');};
  }
  function walletCheck() {
    const total=walletAmount*walletQty, error=card.querySelector('.form-error');
    if(walletMode==='deposit'&&!accountStatus.kycApproved){walletDepositKyc();return;}
    if(walletMode==='withdraw'&&(!accountStatus.walletPasswordSet||!accountStatus.kycApproved)){walletRequirements();return;}
    if(total<(walletMode==='deposit'?20:100)||total>50000){error.textContent=`Amount must be between ${walletMode==='deposit'?'₱20':'₱100'} and ₱50,000.`;return;}
    if(walletMode==='withdraw'){
      if(!walletAccount){error.textContent='Please select an account.';return;}
      if(total>walletBalance){shell('Insufficient Balance',`<p class="confirm-message">Insufficient withdrawable balance.</p><button class="ui-btn primary wallet-return">Okay</button>`);card.querySelector('.ui-close').onclick=card.querySelector('.wallet-return').onclick=walletConfirm;return;}
      shell('Enter Wallet Password',`<label class="field-label" for="withdraw-password">Wallet Password</label><input id="withdraw-password" class="custom-field" type="password" inputmode="none" maxlength="6" autocomplete="off" placeholder="Enter 6-digit password"><div class="form-error" role="status"></div><button class="ui-btn primary wallet-verify">Next</button>`);
      card.querySelector('.ui-close').onclick=walletConfirm;const input=card.querySelector('input');keyboard.configure(input,'preview-numeric',{container:overlay});input.onfocus=input.onclick=()=>{if(!keyboard.restoring)keyboard.open(input,{kind:'preview-numeric',container:overlay});};
      card.querySelector('.wallet-verify').onclick=()=>{if(!/^\d{6}$/.test(input.value)){card.querySelector('.form-error').textContent='Enter your 6-digit wallet password.';return;}if(input.value!==walletCode){card.querySelector('.form-error').textContent='Incorrect wallet password.';return;}walletSubmitWithdrawal(total);};return;
    }
    walletResult('Deposit',total);
  }
  function walletSubmitWithdrawal(total) {
    const button = card.querySelector('.wallet-verify');
    if (button.disabled) return;
    button.disabled = true;
    const record = {id: 'W' + crypto.randomUUID().replaceAll('-', ''), type: 'Withdrawal', channel: walletFundKey(), amount: total, status: 'Pending', date: new Date()};
    const updated = [record, ...withdrawalRecords];
    try { localStorage.fpWithdrawalRecords = JSON.stringify(updated); }
    catch { button.disabled = false; card.querySelector('.form-error').textContent = 'Unable to save the withdrawal record. Please try again.'; return; }
    withdrawalRecords = updated;
    walletOrigin = false; walletResume = false; walletAmount = null;
    closeDialog();
    toast('Withdrawal submitted successfully');
  }
  function walletResult(title,total) {
    shell(title,`<div class="wallet-result"><strong>${walletMoney(total)}</strong><p>${walletChannel}</p><p>Payment preview ready. No real payment is created.</p></div><button class="ui-btn primary wallet-finish">Done</button>`);
    card.querySelector('.wallet-finish').onclick=()=>{walletAmount=null;closeDialog();};
  }
  let bagTab = 'available', bagTimer;
  const bagExpiry = Date.now() + (4 * 86400 + 17 * 3600 + 43 * 60) * 1000;
  function bagHistory() {
    shell('History', `<div class="bag-history-filter"><label class="sr-only" for="bag-period">History period</label><select id="bag-period" aria-label="History period"><option>Last 3 days</option><option>Last 7 days</option></select></div><div class="bag-history-results" aria-live="polite"></div><button type="button" class="ui-btn bag-dialog-action">Back</button>`);
    card.classList.add('bag-history');
    card.querySelector('.bag-dialog-action').onclick = () => closeDialog();
  }
  function bag() {
    secondary('Bag', '/');
    const page = stage.querySelector('.secondary-page'); page.classList.add('bag-page');
    page.querySelector('header').insertAdjacentHTML('beforeend', `<button class="bag-history-button" aria-label="History"><img src="assets/bag/history.png" alt=""></button>`);
    page.querySelector('.bag-history-button').onclick = () => bagHistory();
    page.insertAdjacentHTML('beforeend', `<div class="bag-layout"><nav class="bag-nav" aria-label="Reward status">${[['available','Available'],['in_use','In Use'],['ended','Ended']].map(([id,label])=>`<button type="button" class="ui-btn ${bagTab===id?'primary':''}" aria-pressed="${bagTab===id}" data-bag-tab="${id}">${label}</button>`).join('')}</nav><div class="bag-content">${bagTab==='available'?`<article class="bag-reward" aria-label="app首次登录奖励"><img class="bag-game-cover" src="assets/bag/poker-win.webp" alt="Poker Win"><div class="bag-reward-details"><div class="bag-reward-title"><h3>app首次登录奖励</h3><span>GAME</span></div><span class="bag-provider">fc</span><div class="bag-stats"><div><strong>0.50</strong><span>Single bet</span></div><div><strong>3</strong><span>Spins</span></div></div></div><div class="bag-reward-footer"><div><button class="bag-wager" aria-label="Wager 10.00"><img src="assets/bag/wager-chip.svg" alt=""><span class="bag-wager-label">Wager</span><img class="bag-wager-bolt" src="assets/bag/wager-icon.svg" alt=""><strong>10.00x</strong><img src="assets/bag/wager-arrow.svg" alt=""></button><p class="bag-time">Time Left <strong></strong></p></div><button class="ui-btn primary bag-start">Start Game</button></div></article>`:`<div class="bag-empty"><img src="assets/bag/empty.webp" alt=""><p>NO REWARDS YET</p></div>`}</div></div>`);
    page.querySelectorAll('[data-bag-tab]').forEach(b => b.onclick = () => { bagTab=b.dataset.bagTab; navigate('/bag?tab='+bagTab); });
    if (bagTab !== 'available') return;
    const countdown = () => { const seconds = Math.max(0,Math.floor((bagExpiry-Date.now())/1000)); page.querySelector('.bag-time strong').textContent = `${Math.floor(seconds/86400)}d : ${Math.floor(seconds/3600)%24}h : ${Math.floor(seconds/60)%60}m : ${seconds%60}s`; };
    countdown(); bagTimer = setInterval(countdown,1000);
    page.querySelector('.bag-wager').onclick = () => {
      shell('Wager Requirement', `<div class="bag-wager-rules"><strong>Free Spin bonus</strong><p>wagering: <span>10.00x</span></p><strong>Restricted Providers</strong><p>Provider rules are unavailable.</p></div><button class="ui-btn primary bag-dialog-action">Okay</button>`);
      card.classList.add('bag-rules-dialog'); card.querySelector('.bag-dialog-action').onclick = () => closeDialog();
    };
    page.querySelector('.bag-start').onclick = () => { sessionStorage.fpGameReturn = '/bag?tab=available'; navigate('/game/1'); };
  }
  let tourneyIndex = 0, tourneyView = 'Leaderboard', tourneyTimer;
  // Illustrative tournament configuration and standings for the local prototype.
  const tourneys = [
    {name:'MI', title:'MI Daily Tournament', pool:100000, winners:20, games:[1,2,4], bet:12500, rank:18},
    {name:'JILI', title:'JILI Weekly Tournament', pool:200000, winners:50, games:[2,3,5], bet:6400, rank:42},
    {name:'Slots', title:'Slots Championship', pool:50000, winners:10, games:[1,4,5,6], bet:3200, rank:26}
  ];
  const tourneyMoney = value => '₱ ' + value.toLocaleString('en-US');
  function tourney() {
    secondary('Tourney', '/');
    const page = stage.querySelector('.secondary-page'); page.classList.add('tourney-page');
    const t = tourneys[tourneyIndex];
    const prizes = t.winners === 20 ? [[1,1,30000],[2,2,20000],[3,3,15000],[4,10,3000],[11,20,1400]] : t.winners === 50 ? [[1,1,50000],[2,2,30000],[3,3,20000],[4,10,6000],[11,50,1450]] : [[1,1,15000],[2,2,10000],[3,3,7500],[4,10,2500]];
    const reward = rank => prizes.find(([a,b])=>rank>=a && rank<=b)?.[2] || 0;
    page.insertAdjacentHTML('beforeend', `<div class="tourney-layout"><nav class="tourney-nav" aria-label="Tournament categories">${tourneys.map((x,i)=>`<button class="tourney-category" aria-pressed="${i===tourneyIndex}" data-tourney="${i}"><strong>${x.name}</strong><span>${tourneyMoney(x.pool)}</span></button>`).join('')}</nav><div class="tourney-main"><section class="tourney-banner"><div><span class="tourney-live">LIVE</span><h3>${t.title}</h3><span class="tourney-pool-label">PRIZE POOL</span><strong class="tourney-pool">${tourneyMoney(t.pool)}</strong><span class="tourney-winners">Top ${t.winners} share the pool</span></div><div class="tourney-clock"><span>Ends in</span><strong>${tourneyIndex===1?'06d':'00d'} <b>12</b> : <b>35</b> : <b>48</b></strong><span>${tourneyIndex===1?'Weekly':'Daily'} · 00:00–23:59 (UTC+8)</span></div></section><div class="tourney-columns"><section class="tourney-board"><div class="tourney-tabs" aria-label="Tournament details">${['Leaderboard','Prizes','Rules'].map(x=>`<button data-tourney-view="${x}" aria-pressed="${x===tourneyView}">${x}</button>`).join('')}</div><div class="tourney-board-scroll" tabindex="0" aria-label="${tourneyView}"></div><div class="tourney-me"><span>My rank<strong>#${t.rank}</strong></span><span>My bets<strong>${tourneyMoney(t.bet)}</strong></span><span>Est. prize<strong>${tourneyMoney(reward(t.rank))}</strong></span></div></section><aside class="tourney-games"><h3>Eligible games <span>${t.games.length}</span></h3><div class="tourney-game-list">${t.games.map(id=>`<a href="#/game/${id}" aria-label="Open ${['Fortune Treasures','Super Ace','Gold Miner','Lucky Slots','777','Sugar Rush'][id-1]}"><img src="assets/game${id}-clean.png" alt=""><span>${['Fortune Treasures','Super Ace','Gold Miner','Lucky Slots','777','Sugar Rush'][id-1]}</span>${icon('chevron')}</a>`).join('')}</div></aside></div></div></div>`);
    const updateClock = () => {
      const now = Date.now(), day = 86400000, offset = 8 * 3600000;
      const localDay = Math.floor((now + offset) / day);
      const daysLeft = tourneyIndex === 1 ? ((7 - new Date(now + offset).getUTCDay()) % 7) + 1 : 1;
      const remaining = Math.max(0, Math.floor(((localDay + daysLeft) * day - offset - now) / 1000));
      const parts = [Math.floor(remaining / 86400), Math.floor(remaining / 3600) % 24, Math.floor(remaining / 60) % 60, remaining % 60].map(n => String(n).padStart(2, '0'));
      page.querySelector('.tourney-clock strong').innerHTML = `${parts[0]}d <b>${parts[1]}</b> : <b>${parts[2]}</b> : <b>${parts[3]}</b>`;
    };
    updateClock(); tourneyTimer = setInterval(updateClock, 1000);
    const board = page.querySelector('.tourney-board-scroll');
    if(tourneyView==='Leaderboard') board.innerHTML = `<table class="tourney-table"><thead><tr><th>Rank</th><th>Player</th><th>Total bets</th><th>Prize</th></tr></thead><tbody>${Array.from({length:Math.max(30,t.winners)},(_,i)=>{const r=i+1;return `<tr class="${r===t.rank?'is-me':''}"><td><span class="tourney-rank rank-${r}">${r}</span></td><td>${r===t.rank?'You':['ma***88','jo***21','an***07','li***63','ke***19'][i%5]}</td><td>${tourneyMoney(r===t.rank?t.bet:Math.round(t.bet*t.rank/r))}</td><td>${tourneyMoney(reward(r))}</td></tr>`;}).join('')}</tbody></table>`;
    else if(tourneyView==='Prizes') board.innerHTML = `<table class="tourney-table"><thead><tr><th>Rank</th><th>Prize / player</th><th>Share</th></tr></thead><tbody>${prizes.map(([a,b,v])=>`<tr><td>${a===b?'#'+a:'#'+a+'–'+b}</td><td>${tourneyMoney(v)}</td><td>${(v/t.pool*100).toFixed(2).replace(/\.00$/,'')}%</td></tr>`).join('')}</tbody></table>`;
    else board.innerHTML = `<ol class="tourney-rules"><li>Play the eligible games during the tournament period. Participation is automatic.</li><li>Rankings are based on total valid bets in these games, highest first. Voided bets do not count.</li><li>The top ${t.winners} players share ${tourneyMoney(t.pool)} according to the prize table.</li><li>Ties are ranked by who reached the bet total first.</li><li>Estimated prizes may change. Final results and rewards are confirmed after settlement.</li></ol>`;
    page.querySelectorAll('[data-tourney]').forEach(b=>b.onclick=()=>{tourneyIndex=Number(b.dataset.tourney);renderRoute();stage.querySelector(`[data-tourney="${tourneyIndex}"]`).focus();});
    page.querySelectorAll('[data-tourney-view]').forEach(b=>b.onclick=()=>{tourneyView=b.dataset.tourneyView;renderRoute();stage.querySelector(`[data-tourney-view="${tourneyView}"]`).focus();});
    page.querySelectorAll('.tourney-game-list a').forEach(a=>a.onclick=()=>sessionStorage.fpGameReturn='#/tourney');
  }
  let promoIndex = 0, depositIndex = 0;
  function promos() {
    stage.querySelectorAll('.secondary-page').forEach(page => page.remove());
    secondary('Promos', '/');
    const page = stage.querySelector('.secondary-page'); page.classList.add('promos-page');
    // Long first title is mock data for the three-line truncation state.
    const names = ['Highest Unlimited 15% Loss CashBack Bonus with Exclusive Daily Rewards for Every VIP Member', 'Daily 1% Rebate Bonus', 'First 3 Deposits'];
    const table = (heads, rows) => `<table class="promo-table"><thead><tr>${heads.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const deposits = [[[20,5],[50,10],[100,10],[500,50],[1000,100],['2,000+',200]],[[100,12],[300,40],[500,70],[1000,130],[3000,350],['5,000+',600]],[[300,30],[500,80],[1000,150],[3000,400],[5000,700],['10,000+',1000]]];
    const rules = promoIndex === 2 ? ['Activity ends December 31, 2027, 23:59:59.', 'Rewards are automatically credited within 1 hour after each successful deposit.', 'Bonus: 5× wagering. Deposit principal: 2× turnover. Applies to Slots and Fishing.', 'Free Spins winnings have no wagering requirement.', 'One claim per member. Duplicate or fraudulent accounts are disqualified.'] : ['Duplicate accounts are prohibited and may be disqualified.', 'Rewards may be withheld or recovered for system errors, incorrect calculations or promotional abuse.', 'All promotional data and results are subject to platform records.', 'Contact customer support if rewards are not credited.', 'All prizes are shouldered by the Gaming System Administrator.'];
    page.insertAdjacentHTML('beforeend', `<div class="promos-layout"><nav class="promos-nav" aria-label="Promotions">${names.map((n,i)=>`<button type="button" class="promo-tab" aria-pressed="${i===promoIndex}" data-promo="${i}"><span class="promo-tab-label">${n}</span>${icon('chevron')}</button>`).join('')}</nav><article class="promo-content" tabindex="0" aria-label="${names[promoIndex]}"></article></div>`);
    const content = page.querySelector('.promo-content');
    if (promoIndex < 2) {
      const art = promoIndex === 0 ? 'loss' : 'cash';
      content.innerHTML = `<div class="promo-hero ${art}" role="img" aria-label="${names[promoIndex]}"><img class="promo-backdrop" src="assets/promos/${art}-backdrop.webp" alt=""><img class="promo-character" src="assets/promos/${art}-hero.webp" alt=""><img class="promo-title-art" src="assets/promos/${art}-title.webp" alt=""></div><div class="promo-copy">${promoIndex===0 ? `<p>Loss Rebate is based on your previous day's net loss and credited automatically at <strong>5:00 AM</strong> the next day.</p>${table(['VIP','Loss Rebate Bonus'],[['Bronze','1%'],['Silver','0%'],['Gold','0%'],['Platinum','0%'],['Diamond','0%']])}` : table(['Category','Rebate Bonus'],[['Selected Slot Games','1%'],['Slot','0.5%']])}</div>`;
    } else {
      content.innerHTML = `<img class="promo-deposit-banner" src="assets/promos/deposit.webp" alt="First 3 deposits mega rewards bonus: up to ₱1,800 + 700 free spins"><div class="promo-copy"><div class="promo-deposit-tabs" aria-label="Deposit number">${['1st Deposit','2nd Deposit','3rd Deposit'].map((x,i)=>`<button class="ui-btn ${i===depositIndex?'primary':''}" aria-pressed="${i===depositIndex}" data-deposit="${i}">${x}</button>`).join('')}</div>${table(['Deposit','Bonus','FS'],deposits[depositIndex].map(([d,b])=>['₱ '+d,'₱ '+b,0]))}</div>`;
      content.querySelectorAll('[data-deposit]').forEach(b=>b.onclick=()=>{depositIndex=Number(b.dataset.deposit);promos();stage.querySelector(`[data-deposit="${depositIndex}"]`)?.focus();});
    }
    content.insertAdjacentHTML('beforeend', `<details class="promo-rules"><summary>Standard T&C ${icon('chevron')}</summary><ol>${rules.map(r=>`<li>${r}</li>`).join('')}${promoIndex<2?`<li>This promotion cannot be combined with other promotional cash incentives beyond the prescribed maximum ${promoIndex===0?'15% cashback':'1.5% cash rebate'}.</li>`:''}</ol></details>`);
    page.querySelectorAll('[data-promo]').forEach(b=>b.onclick=()=>{promoIndex=Number(b.dataset.promo);promos();stage.querySelector(`[data-promo="${promoIndex}"]`).focus();});
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
    clearInterval(tourneyTimer);
    clearInterval(bagTimer);
    document.querySelectorAll('.support-page').forEach(page => page.remove());
    stage.querySelectorAll('.secondary-page').forEach(page => page.remove());
    const route = location.hash.slice(1);
    if(walletOrigin && route.startsWith('/account') && route !== '/account/kyc') walletPage();
    if (route === '/promos') promos();
    else if (route === '/tourney') tourney();
    else if (route.split('?')[0] === '/bag') { const tab = new URLSearchParams(route.split('?')[1]).get('tab'); bagTab = ['available','in_use','ended'].includes(tab) ? tab : 'available'; bag(); }
    else if (route.split('?')[0] === '/wallet') { const params = new URLSearchParams(route.split('?')[1]); walletMode = params.get('mode') === 'withdraw' ? 'withdraw' : 'deposit'; const channels = walletMode === 'deposit' ? ['GCash','QRPH','MAYA'] : ['BANK','MAYA','GCash']; walletChannel = channels.includes(params.get('channel')) ? params.get('channel') : channels.includes(walletChannel) ? walletChannel : 'GCash'; walletOrigin = false; walletPage(); if(walletResume && walletAmount && walletAmounts[walletMode].includes(walletAmount)){walletResume=false;walletConfirm();}else walletResume=false; }
    else if (['/app'].includes(route)) secondary(({promos:'Promos', tourney:'Tourney', bag:'Bag', app:'App', wallet:'Wallet'})[route.slice(1)], '/');
    else if (route === '/support') supportPage();
    else if (route === '/account') account();
    else if (route === '/account/block-confirm') blockAccount();
    else if (route.split('?')[0] === '/account/transaction-detail') showTransactionDetail();
    else if (route === '/account/security-requirements') { if(walletOrigin) walletRequirements(); else securityRequirements(); }
    else if (route === '/account/add-fund') addFundAccount();
    else if (route === '/account/fund-verify') fundVerify();
    else if (route === '/account/remove-fund') confirmFundRemoval();
    else if (route === '/account/remove-verify') fundVerify(true);
    else if (route === '/account/kyc') kyc();
    else if (route === '/account/login-password') passwordDialog(false);
    else if (route === '/account/wallet-password') passwordDialog(true);
    else if (route === '/account/faq') faq();
    else if (route === '/account/terms') terms();
    else if (route === '/account/nickname') { accountSection = 'account'; navigate('/account'); }
    else if (route === '/account/avatar') avatars();
    else if (route === '/login') login();
    else if (route === '/logout') logout();
    else if (/^\/keyboard(?:\/(numeric|letters))?$/.test(route)) keyboardPreview(route.endsWith('/numeric'));
    else {
      const item = menuItems.find(([slug]) => route === '/account/' + slug);
      if (item) { accountSection = item[0]; account(); } else closeDialog(false);
    }
  }
  document.querySelector('.add-balance').onclick = () => { walletResume=false; navigate('/wallet?mode=deposit'); };
  guest.onclick = () => navigate('/login');
  document.querySelector('[aria-label="客服"]').onclick = () => navigate('/support');
  const profile = document.querySelector('.profile .avatar');
  profile.setAttribute('role', 'button'); profile.setAttribute('tabindex', '0'); profile.setAttribute('aria-label', 'Open user profile');
  profile.onclick = () => navigate('/account');
  profile.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate('/account'); } };
  document.querySelectorAll('.detail .back').forEach(back => { back.classList.add('ui-back'); back.innerHTML = icon('back'); });
  let backdropPress = false;
  overlay.onpointerdown = event => { backdropPress = event.target === overlay; };
  overlay.onclick = event => { if (event.target === overlay && backdropPress) { if(card?.classList.contains('wallet-flow'))card.querySelector('.ui-close').click();else dismiss(); } };
  document.addEventListener('keydown', event => {
    if (!overlay.classList.contains('open')) return;
    if (event.key === 'Escape') { event.preventDefault(); if(card?.classList.contains('wallet-flow'))card.querySelector('.ui-close').click();else dismiss(); }
    if (event.key !== 'Tab') return;
    const nodes = [...overlay.querySelectorAll('button:not(:disabled),input,a[href]')].filter(node => node.getClientRects().length);
    const first = nodes[0], last = nodes.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
})();
