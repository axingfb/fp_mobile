/* Selection controls for a real, readonly input backed by the custom keyboard. */
(() => {
  class FilplayPreviewEditor {
    constructor(input, shade, keyboard) {
      this.input = input; this.shade = shade; this.keyboard = keyboard;
      this.abort = new AbortController();
      const on = (node, type, handler, options = {}) => node.addEventListener(type, handler, {...options, signal:this.abort.signal});
      this.wrap = document.createElement('div');
      this.wrap.className = 'fp-preview-editor';
      input.before(this.wrap); this.wrap.append(input);
      this.paint = document.createElement('div'); this.paint.className = 'fp-preview-selection'; this.paint.setAttribute('aria-hidden','true');
      this.caret = document.createElement('div'); this.caret.className = 'fp-preview-caret'; this.caret.setAttribute('aria-hidden','true');
      this.wrap.append(this.paint, this.caret);
      this.handles = ['start','end'].map(edge => {
        const handle = document.createElement('button'); handle.type = 'button';
        handle.className = 'fp-preview-handle'; handle.dataset.edge = edge;
        handle.setAttribute('aria-label', edge === 'start' ? 'Move selection start' : 'Move selection end');
        this.wrap.append(handle); return handle;
      });
      this.menu = document.createElement('div'); this.menu.className = 'fp-edit-menu'; this.menu.hidden = true;
      this.menu.setAttribute('role','toolbar'); this.menu.setAttribute('aria-label','Text editing');
      for (const [action, label] of [['all','Select all'],['copy','Copy'],['cut','Cut'],['paste','Paste']]) {
        const button = document.createElement('button'); button.type = 'button';
        button.dataset.action = action; button.textContent = label;
        this.menu.append(button);
      }
      this.status = document.createElement('div'); this.status.className = 'fp-edit-status';
      this.status.setAttribute('role','status'); this.menu.append(this.status); shade.append(this.menu);
      this.canvas = document.createElement('canvas'); this.context = this.canvas.getContext('2d');
      on(input,'pointerdown',event => this.down(event));
      on(input,'pointermove',event => this.move(event));
      on(input,'pointerup',event => this.up(event));
      on(input,'pointercancel',() => this.cancel());
      on(input,'lostpointercapture',() => this.cancel());
      on(input,'contextmenu',event => event.preventDefault());
      on(input,'keydown',event => { if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') { event.preventDefault(); this.showMenu(); this.menu.querySelector('button:not(:disabled)')?.focus(); } });
      on(input,'dblclick',event => { event.preventDefault(); this.selectWord(this.indexAt(event.clientX)); this.showMenu(); });
      for (const handle of this.handles) {
        on(handle,'pointerdown',event => this.down(event, handle.dataset.edge));
        on(handle,'pointermove',event => this.move(event));
        on(handle,'pointerup',event => this.up(event));
        on(handle,'pointercancel',() => this.cancel());
        on(handle,'lostpointercapture',() => this.cancel());
        on(handle,'keydown',event => {
          if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
          event.preventDefault(); event.stopPropagation();
          const edge = handle.dataset.edge;
          const current = edge === 'start' ? input.selectionStart : input.selectionEnd;
          const point = this.neighbor(current, event.key === 'ArrowLeft' ? -1 : 1);
          const anchor = edge === 'start' ? input.selectionEnd : input.selectionStart;
          input.setSelectionRange(Math.min(point,anchor),Math.max(point,anchor)); this.update();
        });
      }
      on(document,'selectionchange',() => this.update());
      for (const action of ['copy','cut']) on(document,action,event => {
        if (document.activeElement !== input || input.type === 'password') return;
        const start = input.selectionStart, end = input.selectionEnd;
        if (start === end || !event.clipboardData) return;
        event.preventDefault(); event.clipboardData.setData('text/plain',input.value.slice(start,end));
        if (action === 'cut') keyboard.replace('',start,end,'deleteByCut');
      });
      on(input,'input',() => { this.menu.hidden = true; this.update(true); });
      on(input,'scroll',() => this.update());
      on(shade,'scroll',() => this.update(), {capture:true});
      on(shade,'pointerdown',event => { if (!this.wrap.contains(event.target) && !this.menu.contains(event.target)) this.menu.hidden = true; });
      on(this.menu,'pointerdown',event => event.preventDefault());
      on(this.menu,'click',event => {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (action) this.action(action);
      });
      this.resize = new ResizeObserver(() => this.update()); this.resize.observe(input);
      document.fonts.ready.then(() => { if (!this.destroyed) this.update(true); });
      this.update(true);
    }
    metrics() {
      const input = this.input, style = getComputedStyle(input);
      this.context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      this.points = [0]; let index = 0;
      for (const char of input.value) { index += char.length; this.points.push(index); }
      const display = input.type === 'password' ? '•'.repeat(input.value.length) : input.value;
      const spacing = parseFloat(style.letterSpacing) || 0;
      this.widths = this.points.map(point => this.context.measureText(display.slice(0,point)).width + point * spacing);
      this.inset = parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth);
      this.available = input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      this.height = parseFloat(style.fontSize) * 1.25;
    }
    widthAt(index) {
      const position = this.points.indexOf(index);
      return this.widths[position < 0 ? this.widths.length - 1 : position];
    }
    indexAt(clientX) {
      this.metrics();
      const rect = this.input.getBoundingClientRect(), scale = rect.width / this.input.offsetWidth;
      const x = (clientX - rect.left) / scale - this.inset + this.input.scrollLeft;
      let best = 0;
      for (let i = 1; i < this.widths.length; i++) if (Math.abs(this.widths[i]-x) < Math.abs(this.widths[best]-x)) best = i;
      return this.points[best];
    }
    neighbor(index, direction) {
      this.metrics();
      return direction < 0 ? [...this.points].reverse().find(point => point < index) ?? 0 : this.points.find(point => point > index) ?? this.input.value.length;
    }
    update(reveal = false) {
      if (this.destroyed || !this.input.isConnected) return;
      this.metrics();
      const start = this.input.selectionStart || 0, end = this.input.selectionEnd || 0;
      if (reveal) {
        const current = this.input.selectionDirection === 'backward' ? start : end;
        const width = this.widthAt(current);
        this.input.scrollLeft = Math.max(0, Math.min(this.input.scrollLeft, width - 8));
        if (width > this.input.scrollLeft + this.available - 6) this.input.scrollLeft = width - this.available + 6;
      }
      const limit = x => Math.max(this.inset, Math.min(this.inset + this.available, this.inset + this.widthAt(x) - this.input.scrollLeft));
      const left = limit(start), right = limit(end), top = (this.input.offsetHeight - this.height) / 2;
      this.paint.hidden = start === end;
      Object.assign(this.paint.style,{left:`${left}px`,top:`${top}px`,width:`${right-left}px`,height:`${this.height}px`});
      this.caret.hidden = start !== end;
      Object.assign(this.caret.style,{left:`${left}px`,top:`${top}px`,height:`${this.height}px`});
      this.handles.forEach((handle,i) => {
        handle.hidden = i === 0 && start === end;
        handle.setAttribute('aria-label', start === end ? 'Move cursor' : i === 0 ? 'Move selection start' : 'Move selection end');
        handle.style.left = `${i === 0 ? left : right}px`;
        handle.style.top = `${top + this.height - 8}px`;
      });
      const selected = start !== end, secret = this.input.type === 'password';
      this.menu.querySelector('[data-action="all"]').disabled = !this.input.value;
      this.menu.querySelector('[data-action="copy"]').disabled = !selected || secret;
      this.menu.querySelector('[data-action="cut"]').disabled = !selected || secret;
      if (!this.menu.hidden) this.positionMenu();
    }
    select(start,end = start) { this.input.setSelectionRange(start,end); this.update(true); }
    down(event, edge) {
      if (event.button !== 0) return;
      event.preventDefault(); event.stopPropagation();
      this.cancel(); this.menu.hidden = true; this.status.textContent = '';
      this.input.focus({preventScroll:true});
      const index = this.indexAt(event.clientX);
      if (edge && this.input.selectionStart !== this.input.selectionEnd) {
        const rect = this.input.getBoundingClientRect(), scale = rect.width / this.input.offsetWidth;
        const x = (event.clientX-rect.left)/scale - this.inset + this.input.scrollLeft;
        edge = Math.abs(x-this.widthAt(this.input.selectionStart)) < Math.abs(x-this.widthAt(this.input.selectionEnd)) ? 'start' : 'end';
      }
      this.gesture = {id:event.pointerId,target:event.currentTarget,x:event.clientX,y:event.clientY,index,edge,
        anchor: edge === 'start' ? this.input.selectionEnd : this.input.selectionStart, range:this.input.selectionStart !== this.input.selectionEnd};
      if (!edge) {
        this.select(index);
        this.timer = setTimeout(() => { if (this.gesture) this.gesture.long = true; },500);
      }
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    move(event) {
      const g = this.gesture;
      if (!g || event.pointerId !== g.id) return;
      event.preventDefault();
      if (!g.edge && !g.moved && Math.hypot(event.clientX-g.x,event.clientY-g.y) < 8) return;
      g.moved = true; clearTimeout(this.timer); g.long = false;
      const rect = this.input.getBoundingClientRect();
      if (event.clientX < rect.left + 18) this.input.scrollLeft = Math.max(0,this.input.scrollLeft-12);
      if (event.clientX > rect.right-18) this.input.scrollLeft += 12;
      const index = this.indexAt(event.clientX);
      if (g.edge && g.range) {
        this.input.setSelectionRange(Math.min(index,g.anchor),Math.max(index,g.anchor), index < g.anchor ? 'backward' : 'forward');
        this.update(true);
      } else this.select(index);
    }
    up(event) {
      const g = this.gesture;
      if (!g || g.id !== event.pointerId) return;
      event.preventDefault();
      if (g.long && !g.moved) { this.selectWord(g.index); this.showMenu(); }
      else if (g.edge && this.input.selectionStart !== this.input.selectionEnd) this.showMenu();
      this.cancel();
    }
    cancel() {
      clearTimeout(this.timer);
      const g = this.gesture; this.gesture = null;
      if (g?.target.hasPointerCapture(g.id)) g.target.releasePointerCapture(g.id);
    }
    selectWord(index) {
      const text = this.input.value;
      const segments = typeof Intl.Segmenter === 'function'
        ? [...new Intl.Segmenter(undefined,{granularity:'word'}).segment(text)].filter(part => part.isWordLike).map(part => ({start:part.index,end:part.index+part.segment.length}))
        : [...text.matchAll(/[\p{L}\p{N}_]+/gu)].map(match => ({start:match.index,end:match.index+match[0].length}));
      const word = segments.find(part => index >= part.start && index < part.end) || segments.find(part => index === part.end);
      if (word) this.select(word.start,word.end);
    }
    showMenu() { this.menu.hidden = false; this.update(); }
    positionMenu() {
      const frame = this.shade.getBoundingClientRect(), field = this.input.getBoundingClientRect();
      const sx = frame.width / this.shade.offsetWidth, sy = frame.height / this.shade.offsetHeight;
      const width = this.menu.offsetWidth, height = this.menu.offsetHeight;
      const center = this.inset + (this.widthAt(this.input.selectionStart || 0) + this.widthAt(this.input.selectionEnd || 0)) / 2 - this.input.scrollLeft;
      this.menu.style.left = `${Math.max(8,Math.min(this.shade.offsetWidth-width-8,(field.left-frame.left)/sx + Math.max(0,Math.min(field.width/sx,center))-width/2))}px`;
      this.menu.style.top = `${Math.max(8,(field.top-frame.top)/sy-height-8)}px`;
    }
    async action(action) {
      if (this.destroyed || this.keyboard.input !== this.input) return;
      const {selectionStart:start,selectionEnd:end,value} = this.input;
      if (action === 'all') { this.select(0,value.length); this.showMenu(); return; }
      try {
        if (action === 'paste') {
          this.status.textContent = 'Allow clipboard access in your browser to paste.'; this.positionMenu();
          const text = await navigator.clipboard.readText();
          if (this.destroyed || this.keyboard.input !== this.input || this.input.value !== value) return;
          this.select(start,end); this.keyboard.insert(text);
        } else {
          if (start === end || this.input.type === 'password') return;
          await navigator.clipboard.writeText(value.slice(start,end));
          if (this.destroyed || this.keyboard.input !== this.input || this.input.value !== value) return;
          if (action === 'cut') { this.select(start,end); this.keyboard.replace('',start,end,'deleteByCut'); }
        }
        this.menu.hidden = true; this.input.focus({preventScroll:true}); this.update(true);
      } catch {
        if (!this.destroyed) { this.status.textContent = 'Clipboard unavailable. Use the system Copy or Paste shortcut.'; this.positionMenu(); }
      }
    }
    destroy() {
      this.destroyed = true; this.cancel(); this.abort.abort(); this.resize.disconnect(); this.menu.remove();
    }
  }
  window.FilplayPreviewEditor = FilplayPreviewEditor;
})();
