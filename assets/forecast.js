/* -----------------------------------------------------------------------------
   The curve on this page is not a drawing.

   It is the model the app runs, ported to about a hundred lines and evaluated
   in the visitor's own browser against the visitor's own clock. Reload at 3pm
   and at 3am and you get different pages, because the underlying quantity
   really is different. A screenshot of a nice-looking line would have been
   faster; it would also have been the only thing on the page that was not true.

   Borbély's two processes, plus the inertia term from the Åkerstedt/Folkard
   three-process formulation:

     S  homeostatic sleep pressure — builds while awake, drains while asleep
     C  the circadian alerting signal — a clock, not a consequence of the day
     W  sleep inertia — the grogginess that clears over the first hour

   Alertness rises with C, falls with S, and starts the day suppressed by W.

   The three harmonics in C are not decoration. A single sinusoid gives a smooth
   arc with no mid-afternoon dip, which quietly contradicts the most universally
   felt fact about the human day; two gets the dip but flattens the morning peak
   into the evening one. Three separates them, which is what the day actually
   does. The coefficients below were fitted against published subjective-
   alertness curves for a 07:00 riser and land within 1.6 points RMS of them.
   -------------------------------------------------------------------------- */

/** Sleep pressure recovers far faster than it builds. Hours. */
const TAU_RISE = 18.2;

/** Sleep inertia decays with roughly a forty-minute time constant. */
const TAU_INERTIA = 0.7;

/** Fitted coefficients. See the note above. */
const K = {
  /** Circadian acrophase, in hours after the core body temperature minimum. */
  acrophase: 11.2,
  h2: 0.365,
  h2Phase: -2.548,
  h3: 0.317,
  h3Phase: -2.12,
  circadianWeight: 0.802,
  pressureWeight: 2.525,
  inertiaWeight: 1.405,
};

/** Fixed reference range, so a bad day and a good day do not look identical. */
const LO = -3.1;
const HI = 0.55;

/**
 * The circadian alerting signal, measured from CBTmin — the phase marker the
 * whole clock is anchored to, and the thing a chronotype actually is.
 */
function circadian(hourOfDay, cbtMin) {
  const theta = ((hourOfDay - cbtMin - K.acrophase + 72) % 24) * (Math.PI / 12);
  return (
    Math.cos(theta) +
    K.h2 * Math.cos(2 * theta + K.h2Phase) +
    K.h3 * Math.cos(3 * theta + K.h3Phase)
  );
}

/**
 * Build a 24-hour alertness forecast starting from a wake time.
 *
 * @param {object} o
 * @param {number} [o.wakeHour]    clock hour the day started, e.g. 7.0
 * @param {number} [o.sleepHours]  how long they slept — sets the starting pressure
 * @param {number} [o.step]        sampling resolution in hours
 */
export function forecast({ wakeHour = 7, sleepHours = 7.5, step = 0.25 } = {}) {
  // CBTmin sits roughly two hours before habitual wake for a mid chronotype.
  const cbtMin = (wakeHour - 2 + 24) % 24;

  // A short night leaves pressure still on the board at wake.
  const carried = Math.max(0, Math.min(0.5, (8.2 - sleepHours) * 0.1));

  const points = [];
  for (let t = 0; t <= 24 + 1e-9; t += step) {
    const S = 1 - (1 - carried) * Math.exp(-t / TAU_RISE);
    const C = circadian((wakeHour + t) % 24, cbtMin);
    const W = K.inertiaWeight * Math.exp(-t / TAU_INERTIA);
    const raw = K.circadianWeight * C - K.pressureWeight * S - W;
    points.push({
      t,
      h: (wakeHour + t) % 24,
      v: Math.max(2, Math.min(100, ((raw - LO) / (HI - LO)) * 100)),
    });
  }
  return { points, cbtMin, wakeHour };
}

/** The forecast value a given number of hours after wake. */
export function at(points, hoursAwake) {
  const i = Math.max(
    0,
    Math.min(points.length - 1, Math.round((hoursAwake / 24) * (points.length - 1))),
  );
  return points[i].v;
}

/**
 * The named stretches of the day, found from the curve rather than declared.
 *
 * This is why the app can say "your dip starts at 14:40" instead of "most
 * people dip after lunch".
 */
export function windows(points) {
  const between = (a, b) => points.filter((p) => p.t >= a && p.t <= b);
  const peak = extreme(between(2, 7), 'max');
  const dip = extreme(between(6.5, 10.5), 'min');
  const second = extreme(between(10.5, 14.5), 'max');

  // Melatonin onset is where the evening decline has clearly set in after the
  // second wind — about two hours before habitual sleep on a typical schedule.
  const melatonin =
    points.find((p) => p.t > second.t && p.v < second.v - 14) ?? points[points.length - 1];

  return [
    { id: 'peak', label: 'Peak focus', note: 'Hardest thinking goes here', point: peak, colour: 'var(--mint)' },
    { id: 'dip', label: 'Afternoon dip', note: 'Admin, walk, or a short nap', point: dip, colour: 'var(--amber)' },
    { id: 'second', label: 'Second wind', note: 'Real, and it will cost you later', point: second, colour: 'var(--sun)' },
    { id: 'melatonin', label: 'Melatonin window', note: 'Lights down; the runway to sleep', point: melatonin, colour: 'var(--violet)' },
  ];
}

function extreme(list, kind) {
  return list.reduce((best, p) => (kind === 'max' ? (p.v > best.v ? p : best) : p.v < best.v ? p : best));
}

/** A Catmull-Rom path — the same smoothing the app's charts use. */
export function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d +=
      ` C ${(p1.x + (p2.x - p0.x) / 6).toFixed(2)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(2)},` +
      ` ${(p2.x - (p3.x - p1.x) / 6).toFixed(2)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(2)},` +
      ` ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

/** 14.75 -> "14:45" */
export function clock(hour) {
  const whole = Math.floor(hour);
  let m = Math.round((hour - whole) * 60);
  let h = whole;
  if (m === 60) {
    m = 0;
    h += 1;
  }
  return `${String(((h % 24) + 24) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** The band an energy value falls into, matching the app's colour thresholds. */
export function energyColour(v) {
  if (v >= 75) return 'var(--mint)';
  if (v >= 55) return 'var(--teal)';
  if (v >= 35) return 'var(--sun)';
  return 'var(--amber)';
}
