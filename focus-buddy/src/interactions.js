// interactions.js
// The speech bubble + the friendly mid-study prompts. All messages are LOCAL
// (no AI, no network). Bubbles are always dismissible.

(function () {
  // Simple one-line encouragements shown on pause/reset/finish.
  const SAY = {
    pause:  'Taking a tiny break 🐾',
    reset:  'Ready when you are!',
    doneFmt: (min) => `Study session complete! 🎉\nYou studied for ${min} minutes!`
  };

  // Mid-study check-ins. Some have quick action buttons.
  const PROMPTS = [
    { text: "You've been studying for a while 🐾 Stretch?", actions: ['Stretch', 'Keep going'] },
    { text: 'What did you just learn?' },
    { text: 'Quick memory check: explain this topic in one sentence.' },
    { text: 'Water break? 💧', actions: ['On it', 'Later'] },
    { text: 'Still with me? 🐱' },
    { text: 'Pick one: stretch or keep going?', actions: ['Stretch', 'Keep going'] }
  ];

  class Bubble {
    constructor(el, textEl, closeEl, actionsEl) {
      this.el = el;
      this.textEl = textEl;
      this.actionsEl = actionsEl;
      this._hideTimer = null;
      closeEl.addEventListener('click', () => this.hide());
    }

    // Show a message. opts.actions = [{label, onClick}] or [labelString].
    show(text, opts = {}) {
      clearTimeout(this._hideTimer);
      this.textEl.textContent = text;
      this.actionsEl.innerHTML = '';

      (opts.actions || []).forEach((a) => {
        const label = typeof a === 'string' ? a : a.label;
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.setAttribute('data-testid', 'bubble-action-' + label.toLowerCase().replace(/\s+/g, '-'));
        btn.addEventListener('click', () => {
          if (typeof a === 'object' && a.onClick) a.onClick();
          this.hide();
        });
        this.actionsEl.appendChild(btn);
      });

      this.el.classList.remove('hidden');
      // restart pop animation
      this.el.style.animation = 'none';
      // eslint-disable-next-line no-unused-expressions
      this.el.offsetHeight;
      this.el.style.animation = '';

      if (opts.autoHideMs) {
        this._hideTimer = setTimeout(() => this.hide(), opts.autoHideMs);
      }
    }

    hide() {
      clearTimeout(this._hideTimer);
      this.el.classList.add('hidden');
    }
  }

  window.FB_SAY = SAY;
  window.FB_PROMPTS = PROMPTS;
  window.Bubble = Bubble;
})();
