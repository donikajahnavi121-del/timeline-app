// ── WALLPAPERS ──
const WALLPAPERS = {
  ios:       'linear-gradient(135deg,#1a3a6b 0%,#2d5a9e 20%,#7b6fa0 45%,#c4826a 70%,#e8956d 100%)',
  gradient1: 'linear-gradient(160deg,#0f0c29,#302b63,#24243e)',
  gradient2: 'linear-gradient(160deg,#0d1b2a,#1b2838,#0a1628)',
  gradient3: 'linear-gradient(160deg,#0a1a0a,#0d2b1a,#0a2010)',
  gradient4: 'linear-gradient(160deg,#1a0a0a,#2b0d0d,#200a0a)',
  gradient5: '#000000',
  gradient6: 'linear-gradient(160deg,#0a1628,#0d2b4a,#0a2040)',
  gradient7: 'linear-gradient(160deg,#2b1a0a,#3d1f0d,#1a0a00)',
};

// ── SCREEN MANAGER ──
function showScreen(id) {
  document.getElementById('screen-pin').style.display    = 'none';
  document.getElementById('screen-home').style.display   = 'none';
  document.getElementById('screen-secret').style.display = 'none';
  document.getElementById(id).style.display = 'flex';
}

// ── STATE ──
let clockInterval   = null;
let targetHour      = 9;
let targetMin       = 41;
let targetAmpm      = 'AM';
let targetShowing   = false;
let homePressTimer  = null;
let isHomeLongPress = false;
let pinPressTimer   = null;
let isPinLongPress  = false;

// ── SAVE SETTINGS TO LOCALSTORAGE ──
function saveSettings() {
  const settings = {
    wallpaper:  document.getElementById('wallpaper-select').value,
    clockColor: document.getElementById('clock-color').value,
    clockSize:  document.getElementById('clock-size').value,
    direction:  document.getElementById('tap-direction').value,
    unit:       document.getElementById('tap-unit').value,
    speed:      document.getElementById('anim-speed').value,
    trigger:    document.getElementById('trigger-type').value,
  };
  localStorage.setItem('mindtrack-settings', JSON.stringify(settings));
}

// ── LOAD SETTINGS FROM LOCALSTORAGE ──
function loadSettings() {
  const saved = localStorage.getItem('mindtrack-settings');
  if (!saved) return;
  const settings = JSON.parse(saved);

  if (settings.wallpaper) {
    document.getElementById('wallpaper-select').value = settings.wallpaper;
  }
  if (settings.clockColor) {
    document.getElementById('clock-color').value = settings.clockColor;
  }
  if (settings.clockSize) {
    document.getElementById('clock-size').value = settings.clockSize;
  }
  if (settings.direction) {
    document.getElementById('tap-direction').value = settings.direction;
  }
  if (settings.unit) {
    document.getElementById('tap-unit').value = settings.unit;
  }
  if (settings.speed) {
    document.getElementById('anim-speed').value = settings.speed;
  }
  if (settings.trigger) {
    document.getElementById('trigger-type').value = settings.trigger;
  }
}

// ── APPLY SETTINGS ──
function applyWallpaper() {
  const sel        = document.getElementById('wallpaper-select').value;
  const galleryRow = document.getElementById('gallery-row');

  if (sel === 'custom') {
    galleryRow.style.display = 'flex';
  } else {
    galleryRow.style.display = 'none';
    const el = document.getElementById('wallpaper');
    el.style.background         = WALLPAPERS[sel];
    el.style.backgroundImage    = '';
    el.style.backgroundSize     = '';
    el.style.backgroundPosition = '';
  }
}

function applyClockColor() {
  const color = document.getElementById('clock-color').value;
  document.getElementById('clock-time').style.color = color;
}

function applyClockSize() {
  const size = document.getElementById('clock-size').value;
  document.getElementById('clock-time').style.fontSize = size;
}

function applyAllSettings() {
  applyWallpaper();
  applyClockColor();
  applyClockSize();
}

// ── HELPERS ──
function setDisplay(h, m) {
  document.getElementById('clock-time').textContent =
    h + ':' + String(m).padStart(2, '0');
}

function toTotal(h, m, ampm) {
  let total = (h % 12) * 60 + m;
  if (ampm === 'PM') total += 12 * 60;
  return total;
}

function fromTotal(total) {
  total = ((total % (12 * 60)) + 12 * 60) % (12 * 60);
  const ap = total >= 12 * 60 ? 'PM' : 'AM';
  const t  = total % (12 * 60);
  const h  = Math.floor(t / 60) || 12;
  const m  = t % 60;
  return { h, m, ap };
}

// ── REAL CLOCK ──
function startRealClockSaved() {
  updateRealClock();
  clockInterval = setInterval(updateRealClock, 1000);
}

function stopRealClock() {
  clearInterval(clockInterval);
  clockInterval = null;
}

function updateRealClock() {
  const now = new Date();
  let   h   = now.getHours();
  const m   = now.getMinutes();
  h = h % 12 || 12;

  document.getElementById('clock-time').textContent =
    h + ':' + String(m).padStart(2, '0');

  const days = [
    'Sunday','Monday','Tuesday','Wednesday',
    'Thursday','Friday','Saturday'
  ];
  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  document.getElementById('clock-date').textContent =
    days[now.getDay()] + ', ' +
    months[now.getMonth()] + ' ' +
    now.getDate();
}

// ── ROLL BACK ANIMATION ──
function rollBackToIST() {
  const now       = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow    = new Date(now.getTime() + istOffset);

  let realH  = istNow.getUTCHours();
  let realM  = istNow.getUTCMinutes();
  let realAp = realH >= 12 ? 'PM' : 'AM';
  realH = realH % 12 || 12;

  const curTotal = toTotal(targetHour, targetMin, targetAmpm);
  const endTotal = toTotal(realH, realM, realAp);

  // get speed
  const speedSetting = document.getElementById('anim-speed').value;
  const stepDelay    = speedSetting === 'slow' ? 1500
                     : speedSetting === 'fast' ? 400
                     : 1000;

  // detect direction and roll opposite way back to IST
  const direction = document.getElementById('tap-direction').value;
  let diff          = 0;
  let rollDirection = 1;

  if (direction === 'forward') {
    // time was moved forward so roll backward to IST
    diff          = curTotal - endTotal;
    if (diff < 0) diff += 12 * 60;
    rollDirection = -1;
  } else {
    // time was moved backward so roll forward to IST
    diff          = endTotal - curTotal;
    if (diff < 0) diff += 12 * 60;
    rollDirection = 1;
  }

  if (diff === 0) {
    startRealClockSaved();
    return;
  }

  let step      = 0;
  const clockEl = document.getElementById('clock-time');

  const anim = setInterval(() => {
    step++;

    if (step >= diff) {
      clearInterval(anim);
      setDisplay(realH, realM);
      setTimeout(() => {
        startRealClockSaved();
      }, 600);
      return;
    }

    let newTotal = curTotal + (step * rollDirection);
    if (newTotal >= 12 * 60) newTotal -= 12 * 60;
    if (newTotal < 0)        newTotal += 12 * 60;

    const { h, m } = fromTotal(newTotal);
    setDisplay(h, m);

    clockEl.style.opacity = '0.4';
    setTimeout(() => {
      clockEl.style.opacity = '1';
    }, stepDelay / 2);

  }, stepDelay);
}

// ── APP START ──
document.addEventListener('DOMContentLoaded', () => {

  // show pin screen
  showScreen('screen-pin');
  document.getElementById('screen-pin').style.opacity = '1';

  // after 1 second fade pin pad
  setTimeout(() => {
    document.getElementById('screen-pin').style.opacity = '0.15';
  }, 1000);

  // load saved settings then apply
  loadSettings();
  applyAllSettings();

  // ── PIN BUTTONS ──
  document.querySelectorAll('.pin-btn[data-num]').forEach(btn => {
    btn.addEventListener('click', () => {

      const num       = parseInt(btn.getAttribute('data-num'));
      const direction = document.getElementById('tap-direction').value;
      const unit      = document.getElementById('tap-unit').value;

      // get real IST
      const now       = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istTime   = new Date(now.getTime() + istOffset);
      let totalMinutes =
        istTime.getUTCHours() * 60 + istTime.getUTCMinutes();

      // apply direction
      if (unit === 'minutes') {
        totalMinutes = direction === 'forward'
          ? totalMinutes + num
          : totalMinutes - num;
      } else {
        totalMinutes = direction === 'forward'
          ? totalMinutes + (num * 60)
          : totalMinutes - (num * 60);
      }

      // overflow fix
      if (totalMinutes >= 24 * 60) totalMinutes -= 24 * 60;
      if (totalMinutes < 0)        totalMinutes += 24 * 60;

      // convert to 12hr
      let h  = Math.floor(totalMinutes / 60);
      let m  = totalMinutes % 60;
      let ap = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;

      targetHour = h;
      targetMin  = m;
      targetAmpm = ap;

      // vibrate if set
      const triggerType = document.getElementById('trigger-type').value;
      if (triggerType === 'tap-vibrate') {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      }

      // stop real clock
      stopRealClock();

      // show adjusted time
      setDisplay(targetHour, targetMin);

      // update date
      const now2   = new Date();
      const days   = [
        'Sunday','Monday','Tuesday','Wednesday',
        'Thursday','Friday','Saturday'
      ];
      const months = [
        'January','February','March','April','May','June',
        'July','August','September','October','November','December'
      ];
      document.getElementById('clock-date').textContent =
        days[now2.getDay()] + ', ' +
        months[now2.getMonth()] + ' ' +
        now2.getDate();

      targetShowing = true;

      // apply all settings before showing home
      applyAllSettings();

      // reset pin opacity
      document.getElementById('screen-pin').style.opacity = '1';

      // show home screen
      showScreen('screen-home');

      // update status text
      document.getElementById('status-text').textContent =
        '✦ IST ' + (direction === 'forward' ? '+' : '-') +
        num + ' ' + unit +
        ' → ' + h + ':' +
        String(m).padStart(2, '0') + ' ' + ap;
    });
  });

  // ── LONG PRESS PIN → SETTINGS ──
  document.getElementById('screen-pin')
    .addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('pin-btn')) return;
      isPinLongPress = false;
      pinPressTimer  = setTimeout(() => {
        isPinLongPress = true;
        showScreen('screen-secret');
      }, 1500);
    });
  document.getElementById('screen-pin')
    .addEventListener('mouseup', () => {
      if (!isPinLongPress) clearTimeout(pinPressTimer);
    });
  document.getElementById('screen-pin')
    .addEventListener('touchstart', (e) => {
      if (e.target.classList.contains('pin-btn')) return;
      isPinLongPress = false;
      pinPressTimer  = setTimeout(() => {
        isPinLongPress = true;
        showScreen('screen-secret');
      }, 1500);
    }, { passive: true });
  document.getElementById('screen-pin')
    .addEventListener('touchend', () => {
      if (!isPinLongPress) clearTimeout(pinPressTimer);
    });

  // ── LONG PRESS HOME → SETTINGS ──
  document.getElementById('screen-home')
    .addEventListener('mousedown', () => {
      isHomeLongPress = false;
      homePressTimer  = setTimeout(() => {
        isHomeLongPress = true;
        showScreen('screen-secret');
      }, 1500);
    });
  document.getElementById('screen-home')
    .addEventListener('mouseup', () => {
      if (!isHomeLongPress) {
        clearTimeout(homePressTimer);
        if (!targetShowing) return;
        targetShowing = false;
        rollBackToIST();
      }
    });
  document.getElementById('screen-home')
    .addEventListener('mousemove', () => {
      clearTimeout(homePressTimer);
    });
  document.getElementById('screen-home')
    .addEventListener('touchstart', () => {
      isHomeLongPress = false;
      homePressTimer  = setTimeout(() => {
        isHomeLongPress = true;
        showScreen('screen-secret');
      }, 1500);
    }, { passive: true });
  document.getElementById('screen-home')
    .addEventListener('touchend', () => {
      if (!isHomeLongPress) {
        clearTimeout(homePressTimer);
        if (!targetShowing) return;
        targetShowing = false;
        rollBackToIST();
      }
    });
  document.getElementById('screen-home')
    .addEventListener('touchmove', () => {
      clearTimeout(homePressTimer);
    }, { passive: true });

  // ── CLOSE SETTINGS ──
  document.getElementById('close-secret-btn')
    .addEventListener('click', () => {
      applyAllSettings();
      saveSettings();
      if (targetShowing || clockInterval) {
        showScreen('screen-home');
      } else {
        showScreen('screen-pin');
        document.getElementById('screen-pin').style.opacity = '0.15';
      }
    });

  // ── LIVE SETTINGS CHANGE + SAVE ──
  document.getElementById('wallpaper-select')
    .addEventListener('change', () => {
      applyWallpaper();
      saveSettings();
    });
  document.getElementById('clock-color')
    .addEventListener('change', () => {
      applyClockColor();
      saveSettings();
    });
  document.getElementById('clock-size')
    .addEventListener('change', () => {
      applyClockSize();
      saveSettings();
    });
  document.getElementById('tap-direction')
    .addEventListener('change', saveSettings);
  document.getElementById('tap-unit')
    .addEventListener('change', saveSettings);
  document.getElementById('anim-speed')
    .addEventListener('change', saveSettings);
  document.getElementById('trigger-type')
    .addEventListener('change', saveSettings);

  // ── GALLERY PICKER ──
  document.getElementById('gallery-btn')
    .addEventListener('click', () => {
      document.getElementById('gallery-input').click();
    });

  document.getElementById('gallery-input')
    .addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = event.target.result;
        const el  = document.getElementById('wallpaper');
        el.style.background         = 'none';
        el.style.backgroundImage    = 'url(' + img + ')';
        el.style.backgroundSize     = 'cover';
        el.style.backgroundPosition = 'center';
        // save custom image to localstorage
        localStorage.setItem('mindtrack-custom-wallpaper', img);
      };
      reader.readAsDataURL(file);
    });

  // load custom wallpaper if saved
  const savedCustomWp = localStorage.getItem('mindtrack-custom-wallpaper');
  const savedSettings = localStorage.getItem('mindtrack-settings');
  if (savedCustomWp && savedSettings) {
    const s = JSON.parse(savedSettings);
    if (s.wallpaper === 'custom') {
      const el = document.getElementById('wallpaper');
      el.style.background         = 'none';
      el.style.backgroundImage    = 'url(' + savedCustomWp + ')';
      el.style.backgroundSize     = 'cover';
      el.style.backgroundPosition = 'center';
    }
  }

});