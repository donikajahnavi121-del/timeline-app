// ==============================================
// WALLPAPER DEFINITIONS
// ==============================================

const SPACE_BG = [
  'radial-gradient(ellipse 130px 150px at 53% 26%,',
  '  rgba(200,230,255,.95) 0%, rgba(100,170,255,.85) 18%,',
  '  rgba(40,100,220,.65) 40%, rgba(10,50,160,.3) 65%, transparent 80%),',
  'radial-gradient(ellipse 220px 240px at 53% 26%,',
  '  rgba(60,120,255,.35) 30%, rgba(20,60,180,.2) 60%, transparent 80%),',
  'radial-gradient(ellipse 500px 300px at 70% 18%,',
  '  rgba(30,50,120,.5) 0%, rgba(10,20,80,.25) 50%, transparent 75%),',
  'radial-gradient(ellipse 400px 200px at 50% 78%,',
  '  rgba(10,40,100,.6) 0%, rgba(5,20,60,.3) 55%, transparent 80%),',
  'linear-gradient(180deg,#000008 0%,#000520 18%,',
  '  #000e35 35%,#001245 48%,#000e30 62%,#000820 78%,#000210 92%,#000008 100%)'
].join('');

const WALLPAPERS = {
  ios:       SPACE_BG,
  gradient1: 'linear-gradient(160deg,#0f0c29,#302b63,#24243e)',
  gradient2: 'linear-gradient(160deg,#0d1b2a,#1b2838,#0a1628)',
  gradient3: 'linear-gradient(160deg,#0a1a0a,#0d2b1a,#0a2010)',
  gradient4: 'linear-gradient(160deg,#1a0a0a,#2b0d0d,#200a0a)',
  gradient5: '#000000',
  gradient6: 'linear-gradient(160deg,#0a1628,#0d2b4a,#0a2040)',
  gradient7: 'linear-gradient(160deg,#2b1a0a,#3d1f0d,#1a0a00)',
  sunset:    'linear-gradient(135deg,#1a3a6b 0%,#2d5a9e 20%,#7b6fa0 45%,#c4826a 70%,#e8956d 100%)',
};

// The darkest EDGE color of each wallpaper.
// This is what fills the iPhone safe-area zones.
// Must match the very bottom/top-left of the gradient.
const WALLPAPER_EDGE = {
  ios:       '#000008',
  gradient1: '#0f0c29',
  gradient2: '#0d1b2a',
  gradient3: '#0a1a0a',
  gradient4: '#1a0a0a',
  gradient5: '#000000',
  gradient6: '#0a1628',
  gradient7: '#2b1a0a',
  sunset:    '#1a3a6b',
};

// ==============================================
// SAFE AREA SYNC
// KEY INSIGHT: On iOS, ONLY the <html> element’s
// background color fills the safe area zones.
// Setting it here is the definitive, only fix.
// ==============================================
function syncBodyBackground(sel) {
  let bg = '#000000';
  if (sel === 'custom') {
    const savedCustomWp = localStorage.getItem('mindtrack-custom-wallpaper');
    bg = savedCustomWp ? `url(${savedCustomWp})` : '#000000';
  } else {
    bg = WALLPAPERS[sel] || '#000000';
  }

  // 1. html background — set to the actual wallpaper (gradient or image)
  document.documentElement.style.background = bg;
  document.documentElement.style.backgroundSize = 'cover';
  document.documentElement.style.backgroundPosition = 'center';
  document.documentElement.style.backgroundAttachment = 'fixed';

  // 2. body — transparent so html bg shows through
  document.body.style.background = 'transparent';

  // 3. theme-color meta — affects browser chrome on Android / PWA
  const edgeColor = WALLPAPER_EDGE[sel] || '#000000';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', edgeColor);
}

// ── SCREEN MANAGER ──
function showScreen(id) {
  document.getElementById('screen-pin').style.display    = 'none';
  document.getElementById('screen-home').style.display   = 'none';
  document.getElementById('screen-secret').style.display = 'none';
  document.getElementById(id).style.display = 'flex';
}

// ── STATE ──
let clockInterval        = null;
let offsetClockInterval  = null;
let targetHour           = 9;
let targetMin            = 41;
let targetAmpm           = 'AM';
let targetShowing        = false;
let homePressTimer       = null;
let isHomeLongPress      = false;
let pinPressTimer        = null;
let isPinLongPress       = false;
let activeOffsetMinutes  = 0;

// ── SAVE SETTINGS ──
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

// ── LOAD SETTINGS ──
function loadSettings() {
  const saved = localStorage.getItem('mindtrack-settings');
  if (!saved) return;
  const s = JSON.parse(saved);
  if (s.wallpaper)  document.getElementById('wallpaper-select').value = s.wallpaper;
  if (s.clockColor) document.getElementById('clock-color').value      = s.clockColor;
  if (s.clockSize)  document.getElementById('clock-size').value       = s.clockSize;
  if (s.direction)  document.getElementById('tap-direction').value    = s.direction;
  if (s.unit)       document.getElementById('tap-unit').value         = s.unit;
  if (s.speed)      document.getElementById('anim-speed').value       = s.speed;
  if (s.trigger)    document.getElementById('trigger-type').value     = s.trigger;
}

// ── APPLY SETTINGS ──
function applyWallpaper() {
  const sel        = document.getElementById('wallpaper-select').value;
  const galleryRow = document.getElementById('gallery-row');
  const el         = document.getElementById('wallpaper');

  if (sel === 'custom') {
    galleryRow.style.display = 'flex';
    const savedCustomWp = localStorage.getItem('mindtrack-custom-wallpaper');
    if (savedCustomWp) {
      el.style.background = 'none';
      el.style.backgroundImage = 'url(' + savedCustomWp + ')';
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
    } else {
      el.style.background = '#000000';
    }
    syncBodyBackground('custom');
  } else {
    galleryRow.style.display = 'none';
    // Reset any previous image wallpaper first
    el.style.backgroundImage    = 'none';
    el.style.backgroundSize     = 'cover';
    el.style.backgroundPosition = 'center';
    // Apply the CSS gradient (must set via cssText or direct property)
    el.style.background = WALLPAPERS[sel];
    // Sync <html> bg to match wallpaper darkest edge — fills safe areas
    syncBodyBackground(sel);
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
  clearInterval(offsetClockInterval);
  clockInterval       = null;
  offsetClockInterval = null;
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

// ── OFFSET CLOCK — ticks with offset applied ──
function startOffsetClock(offsetMinutes) {
  clearInterval(offsetClockInterval);
  clearInterval(clockInterval);
  clockInterval = null;

  function tickOffset() {
    const now       = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow    = new Date(now.getTime() + istOffset);

    let totalMinutes =
      istNow.getUTCHours() * 60 + istNow.getUTCMinutes();

    // apply offset
    totalMinutes += offsetMinutes;

    // overflow fix
    if (totalMinutes >= 24 * 60) totalMinutes -= 24 * 60;
    if (totalMinutes < 0)        totalMinutes += 24 * 60;

    let h  = Math.floor(totalMinutes / 60);
    let m  = totalMinutes % 60;
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;

    // update target so rollback always knows current position
    targetHour = h;
    targetMin  = m;
    targetAmpm = ap;

    setDisplay(h, m);
  }

  // tick immediately then every second
  tickOffset();
  offsetClockInterval = setInterval(tickOffset, 1000);
}

function stopOffsetClock() {
  clearInterval(offsetClockInterval);
  offsetClockInterval = null;
}

// ── ROLL BACK ANIMATION ──
function rollBackToIST() {

  // stop offset clock first
  stopOffsetClock();

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
    diff = curTotal - endTotal;
    if (diff < 0) diff += 12 * 60;
    rollDirection = -1;
  } else {
    // time was moved backward so roll forward to IST
    diff = endTotal - curTotal;
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
        activeOffsetMinutes = 0;
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

  // ── PIN BUTTONS ──
  document.querySelectorAll('.pin-btn[data-num]').forEach(btn => {
    btn.addEventListener('click', () => {

      const num       = parseInt(btn.getAttribute('data-num'));
      const direction = document.getElementById('tap-direction').value;
      const unit      = document.getElementById('tap-unit').value;

      // calculate offset in minutes
      let offsetMinutes = unit === 'hours' ? num * 60 : num;
      if (direction === 'backward') offsetMinutes = -offsetMinutes;

      // save active offset
      activeOffsetMinutes = offsetMinutes;

      // vibrate if set
      const triggerType = document.getElementById('trigger-type').value;
      if (triggerType === 'tap-vibrate') {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      }

      // stop any running clock
      stopRealClock();

      // update date display
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

      // start offset clock — keeps ticking with offset
      startOffsetClock(activeOffsetMinutes);

      // update status text
      document.getElementById('status-text').textContent =
        '✦ IST ' + (direction === 'forward' ? '+' : '-') +
        num + ' ' + unit;
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
        setTimeout(() => {
          rollBackToIST();
        }, 3000);
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
        setTimeout(() => {
          rollBackToIST();
        }, 3000);
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
        localStorage.setItem('mindtrack-custom-wallpaper', img);
      };
      reader.readAsDataURL(file);
    });

});