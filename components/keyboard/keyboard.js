/* Filplay global keyboard. No network calls or value persistence.
 * fpKeyboard.open(input, {type: 'numeric' | 'letters', decimal: false,
 *   container, title, onChange(value, input), onDone(value), onClose(reason)})
 * Declarative use: <input data-fp-keyboard="numeric" maxlength="11">
 */
(() => {
  const scriptBase = new URL('.', document.currentScript.src);
  class FilplayKeyboard {
    constructor(host) {
      this.host = host;
      this.input = null;
      this.panel = document.createElement('section');
      this.panel.className = 'fp-keyboard';
      this.panel.hidden = true;
      this.panel.setAttribute('role', 'group');
      this.panel.setAttribute('aria-label', 'On-screen keyboard');
      this.panel.addEventListener('pointerdown', event => {
        if (event.target.closest('button')) event.preventDefault();
      });
      this.panel.addEventListener('click', event => {
        const button = event.target.closest('button[data-key]');
        if (button && !button.disabled) this.press(button.dataset.key);
      });
      document.addEventListener('keydown', event => this.onKeydown(event), true);
      document.addEventListener('paste', event => {
        if (this.input && event.target === this.input) {
          event.preventDefault();
          this.insert(event.clipboardData.getData('text'));
        }
      });
      document.addEventListener('selectionchange', () => {
        if (this.input && document.activeElement === this.input) this.updateKeys();
      });
      // Delegation also supports fields added after the component is initialized.
      const activate = event => {
        const input = event.target.closest('input[data-fp-keyboard], textarea[data-fp-keyboard]');
        if (input && !this.restoring && input !== this.input) this.open(input, {
          type: input.dataset.fpKeyboard,
          decimal: input.dataset.decimal === 'true'
        });
      };
      document.addEventListener('focusin', activate);
      document.addEventListener('click', activate);
      window.addEventListener('hashchange', () => this.close('navigation', false));
      this.observer = new MutationObserver(() => {
        if (this.input && !this.input.isConnected) this.close('removed', false);
      });
      this.observer.observe(host, {childList: true, subtree: true});
    }

    get isOpen() { return !!this.input; }

    open(input, options = {}) {
      if (!input || input.disabled || this.restoring) return;
      if (input === this.input) return;
      this.close('switch', false);
      this.input = input;
      this.options = options;
      this.layout = options.type === 'numeric' ? 'numeric' : 'letters';
      this.shift = 0;
      this.original = {readOnly: input.readOnly, inputmode: input.getAttribute('inputmode')};
      input.readOnly = true;
      input.setAttribute('inputmode', 'none');
      input.setAttribute('aria-expanded', 'true');
      input.classList.add('fp-keyboard-target');
      const container = options.container || input.closest('[role="dialog"]')?.parentElement || this.host;
      container.append(this.panel);
      this.panel.hidden = false;
      this.render();
      input.focus({preventScroll: true});
      this.host.classList.add('fp-keyboard-open');
    }

    close(reason = 'dismiss', restoreFocus = true) {
      if (!this.input) return;
      const input = this.input;
      const options = this.options;
      this.input = null;
      this.panel.hidden = true;
      input.readOnly = this.original.readOnly;
      if (this.original.inputmode === null) input.removeAttribute('inputmode');
      else input.setAttribute('inputmode', this.original.inputmode);
      input.removeAttribute('aria-expanded');
      input.classList.remove('fp-keyboard-target');
      this.host.classList.remove('fp-keyboard-open');
      if (restoreFocus && input.isConnected) {
        this.restoring = true;
        input.focus({preventScroll: true});
        queueMicrotask(() => { this.restoring = false; });
      }
      input.dispatchEvent(new Event('change', {bubbles: true}));
      options.onClose?.(reason);
    }

    icon(name) {
      const image = document.createElement('img');
      image.src = new URL(`icons/${name}.svg`, scriptBase).href;
      image.alt = '';
      image.draggable = false;
      return image;
    }

    button(key, label, className = '', icon) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `fp-key ${className}`;
      button.dataset.key = key;
      button.setAttribute('aria-label', label);
      if (icon) button.append(this.icon(icon));
      if (!icon || key === 'done') {
        const text = document.createElement('span');
        text.textContent = label;
        button.append(text);
      }
      if (key === 'shift') {
        button.setAttribute('aria-pressed', String(this.shift > 0));
        button.classList.toggle('is-caps', this.shift === 2);
      }
      return button;
    }

    render() {
      const focusedKey = this.panel.contains(document.activeElement) ? document.activeElement.dataset.key : null;
      this.panel.replaceChildren();
      this.panel.dataset.layout = this.layout;
      const header = document.createElement('header');
      header.className = 'fp-keyboard-header';
      const title = document.createElement('span');
      title.textContent = this.options.title || (this.options.type === 'numeric' ? 'Number pad' : 'Keyboard');
      header.append(title, this.button('hide', 'Hide keyboard', 'fp-hide', 'hide'));
      const body = document.createElement('div');
      body.className = 'fp-keyboard-body';
      this.panel.append(header, body);
      if (this.layout === 'numeric') {
        body.classList.add('fp-numpad');
        for (const value of '123456789') body.append(this.button(value, value));
        body.append(this.button('.', '.', 'fp-decimal'), this.button('0', '0'), this.button('00', '00'));
        body.append(this.button('backspace', 'Delete', 'fp-function fp-num-delete', 'backspace'));
        body.append(this.button('clear', 'Clear', 'fp-function fp-num-clear'));
        body.append(this.button('done', 'Done', 'fp-done fp-num-done', 'check'));
      } else {
        const rows = this.layout === 'symbols'
          ? ['1234567890', '@#$%&*()-_', ['shift', ...'!"\':;/?', 'backspace']]
          : ['qwertyuiop', 'asdfghjkl', ['shift', ...'zxcvbnm', 'backspace']];
        rows.forEach((keys, rowIndex) => {
          const row = document.createElement('div');
          row.className = `fp-key-row fp-row-${rowIndex}`;
          [...keys].forEach(key => {
            if (key === 'shift') {
              row.append(this.layout === 'symbols'
                ? this.button('symbols-more', '#+=', 'fp-function fp-wide')
                : this.button('shift', this.shift === 2 ? 'Caps lock' : 'Shift', 'fp-function fp-wide', 'shift'));
            } else if (key === 'backspace') row.append(this.button(key, 'Delete', 'fp-function fp-wide', 'backspace'));
            else row.append(this.button(this.shift && this.layout === 'letters' ? key.toUpperCase() : key, this.shift && this.layout === 'letters' ? key.toUpperCase() : key));
          });
          body.append(row);
        });
        const row = document.createElement('div');
        row.className = 'fp-key-row fp-bottom-row';
        row.append(this.button('mode', this.layout === 'symbols' ? 'ABC' : '123', 'fp-function fp-wide'),
          this.button('@', '@'), this.button(' ', 'Space', 'fp-space'), this.button('.', '.'), this.button('done', 'Done', 'fp-done', 'check'));
        body.append(row);
      }
      this.updateKeys();
      if (focusedKey) Array.from(this.panel.querySelectorAll('button')).find(b => b.dataset.key === focusedKey)?.focus();
    }

    updateKeys() {
      const empty = !this.input.value;
      this.panel.querySelectorAll('[data-key="backspace"], [data-key="clear"]').forEach(button => { button.disabled = empty; });
      const decimal = this.panel.querySelector('.fp-decimal');
      if (decimal) {
        const {start, end} = this.selection();
        const remaining = this.input.value.slice(0, start) + this.input.value.slice(end);
        decimal.disabled = !this.options.decimal || remaining.includes('.');
      }
    }

    selection() {
      return {start: this.input.selectionStart ?? this.input.value.length, end: this.input.selectionEnd ?? this.input.value.length};
    }

    replace(text, start, end, inputType) {
      const input = this.input;
      const before = new InputEvent('beforeinput', {bubbles: true, cancelable: true, inputType, data: text || null});
      if (!input.dispatchEvent(before)) return;
      input.setRangeText(text, start, end, 'end');
      input.dispatchEvent(new InputEvent('input', {bubbles: true, inputType, data: text || null}));
      if (this.input === input) {
        this.options.onChange?.(input.value, input);
        if (this.input === input) this.updateKeys();
      }
    }

    insert(text) {
      if (!this.input) return;
      const {start, end} = this.selection();
      if (this.options.type === 'numeric') {
        text = text.replace(this.options.decimal ? /[^0-9.]/g : /\D/g, '');
        let hasDot = (this.input.value.slice(0, start) + this.input.value.slice(end)).includes('.');
        text = [...text].filter(char => {
          if (char !== '.') return true;
          if (hasDot) return false;
          hasDot = true;
          return true;
        }).join('');
      }
      text = text.replace(/[\r\n]/g, '');
      const limit = this.options.maxLength ?? (this.input.maxLength >= 0 ? this.input.maxLength : Infinity);
      text = text.slice(0, Math.max(0, limit - this.input.value.length + end - start));
      if (!text) return;
      this.replace(text, start, end, 'insertText');
      if (this.shift === 1) { this.shift = 0; this.render(); }
    }

    press(key) {
      if (!this.input) return;
      if (key === 'done') {
        const value = this.input.value, done = this.options.onDone;
        this.close('done');
        done?.(value);
      } else if (key === 'hide') this.close('dismiss');
      else if (key === 'shift') { this.shift = (this.shift + 1) % 3; this.render(); }
      else if (key === 'mode') { this.layout = this.layout === 'letters' ? 'symbols' : 'letters'; this.shift = 0; this.render(); }
      else if (key === 'symbols-more') {
        // A compact second symbol set preserves the same key positions.
        const row = this.panel.querySelector('.fp-row-1');
        const expanded = row.dataset.expanded !== 'true';
        row.dataset.expanded = String(expanded);
        row.replaceChildren(...[...(expanded ? '[]{}<>+=\\|' : '@#$%&*()-_')].map(char => this.button(char, char)));
      } else if (key === 'clear') this.replace('', 0, this.input.value.length, 'deleteContentBackward');
      else if (key === 'backspace' || key === 'delete') {
        let {start, end} = this.selection();
        if (start === end) {
          if (key === 'backspace') start -= [...this.input.value.slice(0, start)].pop()?.length || 0;
          else end += [...this.input.value.slice(end)][0]?.length || 0;
        }
        this.replace('', start, end, key === 'backspace' ? 'deleteContentBackward' : 'deleteContentForward');
      } else this.insert(key);
    }

    onKeydown(event) {
      if (!this.input) return;
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopImmediatePropagation(); this.close('escape'); return;
      }
      if (event.target !== this.input || event.altKey || event.isComposing) return;
      if (event.ctrlKey || event.metaKey) {
        if (event.key.toLowerCase() === 'a') {
          event.preventDefault(); this.input.select();
        }
        return;
      }
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const {start, end} = this.selection();
        const backward = this.input.selectionDirection === 'backward';
        const anchor = backward ? end : start;
        const current = backward ? start : end;
        const target = event.key === 'Home' ? 0 : event.key === 'End' ? this.input.value.length :
          event.key === 'ArrowLeft' ? (event.shiftKey ? current - 1 : start === end ? start - 1 : start) :
          (event.shiftKey ? current + 1 : start === end ? end + 1 : end);
        const position = Math.max(0, Math.min(this.input.value.length, target));
        if (event.shiftKey) this.input.setSelectionRange(Math.min(anchor, position), Math.max(anchor, position), position < anchor ? 'backward' : 'forward');
        else this.input.setSelectionRange(position, position);
        this.updateKeys(); return;
      }
      if (event.key === 'Enter') { event.preventDefault(); this.press('done'); }
      else if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); this.press(event.key === 'Delete' ? 'delete' : 'backspace'); }
      else if (event.key.length === 1) { event.preventDefault(); this.insert(event.key); }
    }
  }
  window.FilplayKeyboard = FilplayKeyboard;
  window.fpKeyboard = new FilplayKeyboard(document.querySelector('.stage') || document.body);
})();
