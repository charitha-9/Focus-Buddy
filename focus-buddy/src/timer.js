// timer.js
// A tiny countdown timer. Knows nothing about the cat or the window - it just
// counts seconds down and calls back on every tick and when it finishes.

(function () {
  class StudyTimer {
    constructor({ onTick, onFinish }) {
      this.onTick = onTick || function () {};
      this.onFinish = onFinish || function () {};
      this.durationSec = 25 * 60;   // chosen duration
      this.remaining = this.durationSec;
      this.interval = null;
      this.running = false;
    }

    // Pick a new duration (in minutes). Only allowed when not running.
    setMinutes(min) {
      const m = Math.max(1, Math.min(180, Math.round(min)));
      this.durationSec = m * 60;
      this.remaining = this.durationSec;
      this.onTick(this.remaining, this.durationSec);
      return m;
    }

    start() {
      if (this.running) return;
      if (this.remaining <= 0) this.remaining = this.durationSec;
      this.running = true;
      this.interval = setInterval(() => {
        this.remaining -= 1;
        if (this.remaining <= 0) {
          this.remaining = 0;
          this.onTick(0, this.durationSec);
          this._stopInterval();
          this.running = false;
          this.onFinish(this.durationSec);
          return;
        }
        this.onTick(this.remaining, this.durationSec);
      }, 1000);
    }

    pause() {
      this._stopInterval();
      this.running = false;
    }

    reset() {
      this._stopInterval();
      this.running = false;
      this.remaining = this.durationSec;
      this.onTick(this.remaining, this.durationSec);
    }

    _stopInterval() {
      if (this.interval) { clearInterval(this.interval); this.interval = null; }
    }

    elapsedMinutes() {
      return Math.round((this.durationSec - this.remaining) / 60);
    }

    static format(sec) {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }
  }

  window.StudyTimer = StudyTimer;
})();
