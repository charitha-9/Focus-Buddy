// cat.js
// Controls the pixel cat's animation STATE and which way it FACES.
// It only adds/removes CSS classes - all the actual motion lives in style.css.

(function () {
  const STATES = ['idle', 'walk', 'sit', 'sleep', 'groom', 'stretch', 'celebrate'];

  class CatController {
    constructor(catEl, stageEl) {
      this.cat = catEl;
      this.stage = stageEl;
      this.state = 'idle';
      this.dir = 'right';          // 'right' or 'left'
      this._lookTimer = null;
      this._apply();
    }

    // Swap the current animation state (idle / walk / sit / ...).
    setState(name) {
      if (!STATES.includes(name)) return;
      this.state = name;
      this._apply();
    }

    // Face left or right. Left is just a horizontal mirror of the sprite.
    setDirection(dir) {
      this.dir = dir === 'left' ? 'left' : 'right';
      this._apply();
    }

    // Rebuild the class list from state + direction.
    _apply() {
      const cls = ['cat', 'state-' + this.state];
      if (this.dir === 'left') cls.push('face-left');
      this.cat.className = cls.join(' ');
      this.stage.dataset.state = this.state;
    }

    // In idle mode, occasionally glance around (adds a temporary class).
    lookAround() {
      this.cat.classList.add('looking');
      clearTimeout(this._lookTimer);
      this._lookTimer = setTimeout(() => this.cat.classList.remove('looking'), 1200);
    }

    // Random "living" idle ticks (a look-around every so often).
    startIdleLife() {
      this.stopIdleLife();
      const tick = () => {
        if (this.state === 'idle' && Math.random() < 0.5) this.lookAround();
        this._idleTimer = setTimeout(tick, 4000 + Math.random() * 5000);
      };
      this._idleTimer = setTimeout(tick, 4000 + Math.random() * 5000);
    }
    stopIdleLife() {
      clearTimeout(this._idleTimer);
      clearTimeout(this._lookTimer);
      this.cat.classList.remove('looking');
    }
  }

  window.CatController = CatController;
})();
