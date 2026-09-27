// app.js
// The conductor. It wires the UI buttons to the timer, drives the cat's
// behaviour, moves the real desktop window during study mode, and schedules
// the friendly mid-study prompts.

(function () {
  const $ = (id) => document.getElementById(id);
  const hasDesktop = !!window.focusBuddy;   // true only inside Electron

  // ---- elements ----
  const cat = new CatController($('cat'), $('catStage'));
  const bubble = new Bubble($('bubble'), $('bubbleText'), $('bubbleClose'), $('bubbleActions'));
  const clock = $('clock');
  const startPauseBtn = $('startPauseBtn');
  const resetBtn = $('resetBtn');
  const customInput = $('customInput');
  const customSet = $('customSet');
  const chips = Array.from(document.querySelectorAll('.chip'));

  // ---- extra feature elements ----
  const APP = $('app');
  const streakCountEl = $('streakCount');
  const soundToggle = $('soundToggle');
  const swatches = Array.from(document.querySelectorAll('.swatch'));

  // ---- Cat Wardrobe: coat colour (persisted) ----
  function applyCoat(coat) {
    APP.classList.remove('app-coat-black', 'app-coat-orange');
    if (coat === 'black') APP.classList.add('app-coat-black');
    else if (coat === 'orange') APP.classList.add('app-coat-orange');
    swatches.forEach((s) => s.classList.toggle('active', s.dataset.coat === coat));
    try { localStorage.setItem('fb_coat', coat); } catch (e) {}
  }
  swatches.forEach((s) => s.addEventListener('click', () => applyCoat(s.dataset.coat)));
  applyCoat((function () { try { return localStorage.getItem('fb_coat') || 'gray'; } catch (e) { return 'gray'; } })());

  // ---- Focus Streaks: sessions finished today (persisted, resets daily) ----
  function todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function loadStreak() {
    try {
      const raw = JSON.parse(localStorage.getItem('fb_streak') || '{}');
      if (raw.date === todayKey()) return raw.count || 0;
    } catch (e) {}
    return 0;
  }
  let streak = loadStreak();
  streakCountEl.textContent = streak;
  function bumpStreak() {
    streak += 1;
    streakCountEl.textContent = streak;
    try { localStorage.setItem('fb_streak', JSON.stringify({ date: todayKey(), count: streak })); } catch (e) {}
  }

  // ---- Finish Chime: tiny retro (square-wave) arpeggio via Web Audio ----
  let soundOn = (function () { try { return localStorage.getItem('fb_sound') !== 'off'; } catch (e) { return true; } })();
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function playChime() {
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {  // C5 E5 G5 C6
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = f;
      const t = now + i * 0.12;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.11, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.3);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.32);
    });
  }
  function updateSoundBtn() { soundToggle.classList.toggle('on', soundOn); }
  updateSoundBtn();
  soundToggle.addEventListener('click', () => {
    soundOn = !soundOn;
    try { localStorage.setItem('fb_sound', soundOn ? 'on' : 'off'); } catch (e) {}
    updateSoundBtn();
    if (soundOn) playChime();   // preview when turning on
  });

  let mode = 'idle';   // idle | study | paused | done

  // ---- timer ----
  const timer = new StudyTimer({
    onTick: (remaining) => { clock.textContent = StudyTimer.format(remaining); },
    onFinish: () => finishSession()
  });
  timer.setMinutes(25);

  // =========================================================================
  // DESKTOP MOVEMENT CONTROLLER (autonomous "desktop pet" wandering)
  // =========================================================================
  const movement = {
    active: false,
    startBounds: null,
    timers: [],
    raf: null,

    async begin() {
      this.active = true;
      if (hasDesktop) this.startBounds = await window.focusBuddy.getBounds();
      this._schedule(700);
    },

    stop() {
      this.active = false;
      this.timers.forEach(clearTimeout);
      this.timers = [];
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
    },

    _schedule(delay) {
      if (!this.active) return;
      this.timers.push(setTimeout(() => this._act(), delay));
    },

    _act() {
      if (!this.active) return;
      // ~45% chance to walk somewhere, otherwise do an in-place behaviour.
      if (Math.random() < 0.45) this._walk();
      else this._idleBehaviour();
    },

    // Do a small in-place behaviour, then go back to idle and schedule next.
    _idleBehaviour() {
      const choices = ['sit', 'groom', 'stretch', 'look', 'walkInPlace'];
      const c = choices[Math.floor(Math.random() * choices.length)];
      let hold = 2600;

      if (c === 'look') { cat.setState('idle'); cat.lookAround(); hold = 1400; }
      else if (c === 'walkInPlace') {
        cat.setDirection(Math.random() < 0.5 ? 'left' : 'right');
        cat.setState('walk'); hold = 2000;
      } else {
        cat.setState(c);
        hold = c === 'stretch' ? 1600 : c === 'groom' ? 2600 : 3200;
      }

      this.timers.push(setTimeout(() => {
        cat.setState('idle');
        this._schedule(2000 + Math.random() * 3500);
      }, hold));
    },

    // Walk the real window toward a nearby safe point on the desktop.
    async _walk() {
      if (!hasDesktop) { this._idleBehaviour(); return; }

      const wa = await window.focusBuddy.getWorkArea();
      const b = await window.focusBuddy.getBounds();

      // Pick a nearby target; sometimes head back toward the start area.
      let tx, ty;
      if (this.startBounds && Math.random() < 0.3) {
        tx = this.startBounds.x + (Math.random() * 40 - 20);
        ty = this.startBounds.y + (Math.random() * 30 - 15);
      } else {
        tx = b.x + (Math.random() * 2 - 1) * 180;
        ty = b.y + (Math.random() * 2 - 1) * 120;
      }

      // Keep inside the usable desktop.
      tx = Math.max(wa.x, Math.min(wa.x + wa.width - b.width, tx));
      ty = Math.max(wa.y, Math.min(wa.y + wa.height - b.height, ty));

      cat.setDirection(tx >= b.x ? 'right' : 'left');
      cat.setState('walk');

      await this._animateTo(b.x, b.y, tx, ty);

      cat.setState('idle');
      this._schedule(1200 + Math.random() * 3000);
    },

    // Glide the window from (x0,y0) to (x1,y1) at a calm speed.
    _animateTo(x0, y0, x1, y1) {
      return new Promise((resolve) => {
        const speed = 1.6;                 // px per frame (~90px/sec)
        const cur = { x: x0, y: y0 };
        const step = () => {
          if (!this.active) { resolve(); return; }
          const dx = x1 - cur.x, dy = y1 - cur.y;
          const d = Math.hypot(dx, dy);
          if (d <= speed) {
            window.focusBuddy.setPosition(Math.round(x1), Math.round(y1));
            resolve();
            return;
          }
          cur.x += (dx / d) * speed;
          cur.y += (dy / d) * speed;
          window.focusBuddy.setPosition(Math.round(cur.x), Math.round(cur.y));
          this.raf = requestAnimationFrame(step);
        };
        this.raf = requestAnimationFrame(step);
      });
    }
  };

  // =========================================================================
  // MID-STUDY PROMPTS
  // =========================================================================
  const prompts = {
    timers: [],
    start(durationSec) {
      this.stop();
      if (durationSec < 60) return;            // too short to interrupt
      const first = Math.min(durationSec * 0.3, 240);   // first check-in
      this._queue(first, durationSec);
    },
    _queue(afterSec, durationSec) {
      const t = setTimeout(() => {
        if (mode !== 'study') return;
        this._show();
        const next = 300 + Math.random() * 180;        // every 5-8 min
        if (timer.remaining > 45 && next < timer.remaining - 20) this._queue(next, durationSec);
      }, afterSec * 1000);
      this.timers.push(t);
    },
    _show() {
      const p = window.FB_PROMPTS[Math.floor(Math.random() * window.FB_PROMPTS.length)];
      const actions = (p.actions || []).map((label) => ({
        label,
        onClick: () => { if (/stretch/i.test(label)) triggerStretch(); }
      }));
      bubble.show(p.text, { actions, autoHideMs: actions.length ? 0 : 14000 });
    },
    stop() { this.timers.forEach(clearTimeout); this.timers = []; }
  };

  function triggerStretch() {
    const prev = cat.state;
    cat.setState('stretch');
    setTimeout(() => { if (mode === 'study') cat.setState('idle'); else cat.setState(prev); }, 1600);
  }

  // =========================================================================
  // SESSION FLOW
  // =========================================================================
  function startSession() {
    mode = 'study';
    ensureAudio();          // unlock audio on this user gesture
    bubble.hide();
    cat.stopIdleLife();
    clock.classList.add('running');
    startPauseBtn.textContent = 'Pause';
    startPauseBtn.classList.remove('paused');
    setControlsEnabled(false);
    timer.start();
    movement.begin();
    prompts.start(timer.remaining);
  }

  function pauseSession() {
    mode = 'paused';
    timer.pause();
    movement.stop();
    prompts.stop();
    cat.setState('idle');
    cat.setDirection('right');
    clock.classList.remove('running');
    startPauseBtn.textContent = 'Resume';
    startPauseBtn.classList.add('paused');
    bubble.show(window.FB_SAY.pause, { autoHideMs: 6000 });
  }

  function resetSession() {
    mode = 'idle';
    timer.reset();
    movement.stop();
    prompts.stop();
    cat.setState('idle');
    cat.setDirection('right');
    cat.startIdleLife();
    clock.classList.remove('running');
    startPauseBtn.textContent = 'Start';
    startPauseBtn.classList.remove('paused');
    setControlsEnabled(true);
    bubble.show(window.FB_SAY.reset, { autoHideMs: 5000 });
  }

  function finishSession() {
    mode = 'done';
    const minutes = Math.round(timer.durationSec / 60);
    movement.stop();
    prompts.stop();
    cat.setDirection('right');
    cat.setState('celebrate');
    clock.classList.remove('running');
    startPauseBtn.textContent = 'Start';
    startPauseBtn.classList.remove('paused');
    setControlsEnabled(true);
    bubble.show(window.FB_SAY.doneFmt(minutes), { autoHideMs: 0 });
    bumpStreak();
    if (soundOn) playChime();

    // Celebrate for a few seconds, then settle back to idle.
    setTimeout(() => {
      if (mode === 'done') {
        cat.setState('idle');
        cat.startIdleLife();
        mode = 'idle';
        timer.reset();
      }
    }, 3800);
  }

  // =========================================================================
  // DURATION SELECTION (presets + custom 1-180)
  // =========================================================================
  function applyMinutes(min, sourceChip) {
    const m = timer.setMinutes(min);
    chips.forEach((c) => c.classList.toggle('active', sourceChip === c));
    return m;
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      if (mode === 'study') return;
      customInput.value = '';
      applyMinutes(parseInt(chip.dataset.min, 10), chip);
    });
  });

  function commitCustom() {
    if (mode === 'study') return;
    let v = parseInt(customInput.value, 10);
    if (isNaN(v)) return;
    v = Math.max(1, Math.min(180, v));
    customInput.value = v;
    applyMinutes(v, null);          // clears preset highlight
  }
  customSet.addEventListener('click', commitCustom);
  customInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') commitCustom(); });

  function setControlsEnabled(on) {
    chips.forEach((c) => { c.disabled = !on; c.style.opacity = on ? '' : '0.5'; });
    customInput.disabled = !on;
    customSet.disabled = !on;
  }

  // ---- start / pause / resume ----
  startPauseBtn.addEventListener('click', () => {
    if (mode === 'study') pauseSession();
    else startSession();      // works from idle, paused, and done
  });
  resetBtn.addEventListener('click', resetSession);

  // =========================================================================
  // DRAGGING THE CAT MOVES THE REAL WINDOW (Electron only)
  // The cat stage also uses -webkit-app-region: drag as a native fallback,
  // but we handle it manually so we can clamp to the screen.
  // =========================================================================
  if (hasDesktop) {
    const stage = $('catStage');
    let dragging = false, last = null;

    stage.addEventListener('mousedown', (e) => {
      if (e.target.closest('.no-drag')) return;   // let buttons work
      dragging = true;
      last = { x: e.screenX, y: e.screenY };
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.screenX - last.x;
      const dy = e.screenY - last.y;
      last = { x: e.screenX, y: e.screenY };
      window.focusBuddy.moveBy(dx, dy);
    });
    window.addEventListener('mouseup', () => { dragging = false; });
  }

  // ---- close button ----
  $('closeBtn').addEventListener('click', () => {
    if (hasDesktop) window.focusBuddy.quit();
  });

  // ---- boot ----
  cat.setState('idle');
  cat.startIdleLife();

  // Clean up on unload.
  window.addEventListener('beforeunload', () => {
    movement.stop();
    prompts.stop();
    cat.stopIdleLife();
  });
})();
