"""Screenshot inventory. Add a scene here when adding a page or a distinct state."""

def scene(key, title, route, ready, *steps):
    return dict(id=key, title=title, route=route, ready=ready, steps=steps)


def tab(name):
    return f'.center-tabs [data-tab="{name}"]'


def fund(key, channel, ready, *steps):
    return scene(key, f'Fund Accounts · {channel}', '/account/funds', ready, *steps)


def transaction(key, name, ready, *steps):
    return scene(key, f'Transactions · {name}', '/account/transactions', ready,
                 tab(name.split(' / ')[0]), *steps)


field = lambda key: f'[data-kyc-field="{key}"]'
kyc_upload = (
    '#kyc-type', '[data-id-index="0"]',
    *(('file', f'[data-photo="{side}"]') for side in ('front', 'back', 'selfie')),
    '.kyc-next',
)
kyc_basic = (
    *kyc_upload,
    *(('input', field(key), value) for key, value in
      [('first', 'Demo'), ('last', 'Player'), ('birth', '01011990'), ('birthplace', 'Manila')]),
    '[data-gender]',
    ('select', field('nationality'), 1),
    '.kyc-next',
)
kyc_approval = (
    *kyc_basic, ('input', field('permanent'), 'Demo address'), '#kyc-same',
    *(('select', field(key), 1) for key in ('branch', 'income', 'work')),
    '.kyc-next', ('visible', '.account-menu'),
)
wallet_password = (
    ('route', '/account/wallet-password'),
    ('input', '#password-new', '123456'), ('input', '#password-confirm', '123456'),
    '.password-submit', ('visible', '.account-menu'),
)
verified = (('route', '/account/kyc'), *kyc_approval, *wallet_password)
withdraw = '/wallet?mode=withdraw&channel=GCash'
deposit = '/wallet?mode=deposit&channel=GCash'
amount_button = '[data-wallet-amount]'
withdraw_form = (*verified, ('route', withdraw), amount_button, '.wallet-submit')


def group(key, name, screens):
    return dict(id=key, name=name, screens=screens)


GROUPS = [
    group('lobby', '大厅', [
        scene('home', '大厅', '/', '.profile'),
        scene('guest', '访客大厅', '/', '.guest-login', ('storage', 'fpSigned', 'false')),
    ]),
    group('login', '登录', [
        scene('responsible-welcome', '登录前 · Responsible Gaming', '/', '.welcome-scroll',
              ('storage', 'fpSigned', 'false')),
        scene('otp', 'OTP 登录', '/login', '#field-otp'),
        scene('password', '密码登录', '/login', '#field-password', '.login-tabs [data-mode="Password"]'),
        scene('notice', '登录后 · Notice', '/login', '.login-notice',
              ('input', '#field-phone', '09123456789'), ('input', '#field-otp', '123456'),
              '#submit-login'),
        scene('ndrp', 'NDRP · Access Restricted', '/login', '.ndrp-message',
              ('input', '#field-phone', '1'), ('input', '#field-otp', '123456'),
              '#submit-login'),
        scene('phone-keyboard', '手机号键盘', '/login', '.fp-keyboard-overlay', '#field-phone'),
        scene('otp-keyboard', '验证码键盘', '/login', '.fp-keyboard-overlay', '#field-otp'),
        scene('password-keyboard', '密码键盘', '/login', '.fp-keyboard-overlay',
              '.login-tabs [data-mode="Password"]', '#field-password'),
    ]),
    group('account', '个人中心', [
        scene('overview', 'My Account', '/account', '.account-identity'),
        scene('avatar', 'My Account · 选择头像', '/account/avatar', '.avatar-options'),
        scene('nickname', 'My Account · 修改昵称', '/account', '.fp-keyboard-overlay', '.account-name'),
        scene('login-password', 'My Account · 登录密码', '/account/login-password', '#password-new'),
        scene('wallet-password', 'My Account · 钱包密码', '/account/wallet-password', '#password-new'),
        scene('kyc-upload', 'KYC · 上传证件', '/account/kyc', '[aria-label="Step 1 of 3"]'),
        scene('kyc-types', 'KYC · 证件类型', '/account/kyc', '.kyc-picker', '#kyc-type'),
        scene('kyc-basic', 'KYC · 基本资料', '/account/kyc', '[aria-label="Step 2 of 3"]', *kyc_upload),
        scene('kyc-address', 'KYC · 地址及收入', '/account/kyc', '[aria-label="Step 3 of 3"]', *kyc_basic),
        *(fund(channel.lower(), channel, tab(channel) + '[aria-selected="true"]', tab(channel))
          for channel in ('GCash', 'Bank', 'Maya')),
        scene('fund-requirements', 'Fund Accounts · 安全要求', '/account/funds',
              '.security-requirements', '#add-fund-account'),
        *(scene('add-' + channel.lower(), 'Fund Accounts · 添加 ' + channel,
                '/account/funds', '#fund-number', *verified, ('route', '/account/funds'),
                tab(channel), '#add-fund-account') for channel in ('GCash', 'Bank', 'Maya')),
        scene('fund-password', 'Fund Accounts · 验证钱包密码', '/account/fund-verify', '#fund-password'),
        scene('fund-remove', 'Fund Accounts · 删除确认', '/account/funds',
              '#confirm-remove', '.fund-account-row button'),
        scene('fund-remove-verify', 'Fund Accounts · 删除验证', '/account/funds',
              '#fund-password', '.fund-account-row button', '#confirm-remove'),
        *(transaction(name.lower(), name, tab(name) + '[aria-selected="true"]')
          for name in ('Deposit', 'Withdrawal', 'Game', 'Reward')),
        transaction('deposit-detail', 'Deposit / 详情', '.transaction-detail', '[data-record-index="0"]'),
        transaction('withdrawal-detail', 'Withdrawal / 详情', '.transaction-detail', '[data-record-index="0"]'),
        scene('responsible', 'Responsible Gaming', '/account/responsible', '.gaming-list'),
        scene('gaming-schedule', 'Responsible Gaming · 时段设置', '/account/responsible',
              '.time-picker', '[data-gaming-toggle="scheduleEnabled"] + span', '[data-time-trigger]'),
        scene('block', 'Responsible Gaming · 停用账号', '/account/block-confirm', '.block-scroll'),
        scene('settings', 'Settings & Help', '/account/settings', '.center-content'),
        scene('faq', 'Settings & Help · FAQ', '/account/faq', '.ui-overlay.open'),
        scene('terms', 'Settings & Help · Terms & Privacy', '/account/terms', '.ui-overlay.open'),
        scene('logout', '退出登录', '/logout', '#confirm-out'),
    ]),
    group('catalog', '游戏目录', [
        *(scene(key, title, '/category/' + key, '.category-track .game-entry') for key, title in
          [('slot', 'Slots'), ('casino', 'Casino'), ('poker', 'Poker'), ('arcade', 'Arcade'),
           ('bingo', 'Bingo'), ('fishing', 'Fishing')]),
        scene('history-empty', '游戏历史 · 空状态', '/category/slot?view=history', '.history-empty'),
        scene('history', '游戏历史 · 有记录', '/category/slot?view=history', '.category-track .game-entry',
              ('storage', 'fpPlayedGames', '["slot-0-0"]')),
        scene('search', '搜索游戏', '/category/slot/search', '.game-search-form'),
        scene('search-results', '搜索结果', '/category/slot/search?q=Gold', '.search-results .game-entry'),
        scene('search-empty', '搜索 · 无结果', '/category/slot/search?q=demo', '.search-empty'),
        scene('search-keyboard', '搜索键盘', '/category/slot/search', '.fp-keyboard-overlay', '.game-search-form input'),
    ]),
    group('games', '游戏', [
        scene('loading', '加载游戏', '/game/1', '.game-loading'),
        *(scene(f'game-{index}', name, f'/game/{index}', '.game-page:not(.is-loading) .game-screen')
          for index, name in enumerate(
              ['Fortune Treasures', 'Super Ace', 'Gold Miner', 'Lucky Slots', '777', 'Sugar Rush'], 1)),
        scene('menu', '游戏内快捷菜单', '/game/1', '.game-menu-dialog',
              ('visible', '.game-page:not(.is-loading) .game-screen'), '.game-menu-button'),
    ]),
    group('promos', 'Promos', [
        scene('cashback', 'Loss Cashback', '/promos', '[data-promo="0"][aria-pressed="true"]'),
        scene('rebate', 'Daily Rebate', '/promos', '[data-promo="1"][aria-pressed="true"]', '[data-promo="1"]'),
        *(scene(f'deposit-{i+1}', title, '/promos', f'[data-deposit="{i}"].primary',
                 '[data-promo="2"]', f'[data-deposit="{i}"]')
          for i, title in enumerate(['1st Deposit', '2nd Deposit', '3rd Deposit'])),
        scene('terms', 'Standard T&C', '/promos', '.promo-rules[open]', '.promo-rules summary'),
    ]),
    group('tourney', 'Tourney', [
        *(scene(f'{key}-{view.lower()}', f'{key} · {view}', '/tourney',
                 f'[data-tourney-view="{view}"][aria-pressed="true"]',
                 f'[data-tourney="{index}"]', f'[data-tourney-view="{view}"]')
          for index, key in enumerate(['MI', 'JILI', 'Slots']) for view in ['Leaderboard', 'Prizes', 'Rules']),
    ]),
    group('bag', 'Bag', [
        *(scene(key, title, '/bag?tab=' + key, f'[data-bag-tab="{key}"][aria-pressed="true"]')
          for key, title in [('available', 'Available'), ('in_use', 'In Use'), ('ended', 'Ended')]),
        scene('history', 'History', '/bag', '.bag-history', '.bag-history-button'),
        scene('wager', 'Wager Requirement', '/bag', '.bag-rules-dialog', '.bag-wager'),
    ]),
    group('app', 'App', [scene('home', 'App', '/app', '.secondary-page')]),
    group('wallet', 'Wallet', [
        *(scene(f'{mode}-{channel.lower()}', f'{title} · {channel}',
                 f'/wallet?mode={mode}&channel={channel}', f'[data-wallet-channel="{channel}"][aria-pressed="true"]')
          for mode, title, channels in [('deposit', 'Deposit', ('GCash', 'QRPH', 'MAYA')),
                                        ('withdraw', 'Withdrawal', ('BANK', 'MAYA', 'GCash'))]
          for channel in channels),
        scene('deposit-kyc', 'Deposit · KYC 提示', deposit, '.wallet-kyc-notice', amount_button),
        scene('deposit-confirm', 'Deposit · 确认', deposit, '.wallet-confirm',
              *verified, ('route', deposit), amount_button),
        scene('deposit-result', 'Deposit · 支付预览', deposit, '.wallet-result',
              *verified, ('route', deposit), amount_button, '.wallet-submit'),
        scene('withdraw-confirm', 'Withdrawal · 确认', withdraw, '.wallet-confirm', amount_button),
        scene('withdraw-accounts', 'Withdrawal · 选择账户', withdraw, '.wallet-account-options',
              amount_button, '.wallet-select-account'),
        scene('withdraw-requirements', 'Withdrawal · 安全要求', withdraw, '.security-requirements',
              amount_button, '.wallet-submit'),
        scene('withdraw-password', 'Withdrawal · 验证密码', withdraw, '#withdraw-password', *withdraw_form),
        scene('withdraw-success', 'Withdrawal · 提交成功', withdraw, '.toast', *withdraw_form,
              ('input', '#withdraw-password', '123456'), '.wallet-verify'),
    ]),
    group('support', '客服', [
        scene('chat', 'Customer Service', '/support', '.support-page'),
        scene('keyboard', 'Customer Service · 聊天键盘', '/support', '.support-keyboard-slot .fp-keyboard',
              '.support-composer input'),
    ]),
    group('keyboard', '键盘组件', [
        scene('numeric', '弹窗式数字键盘', '/keyboard/numeric', '.fp-keyboard'),
        scene('letters', '弹窗式字母键盘', '/keyboard/letters', '.fp-keyboard'),
    ]),
]
