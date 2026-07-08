import React, { useState, useEffect } from "react";

/* ------------------------------------------------------------------ */
/* Design tokens                                                       */
/* ------------------------------------------------------------------ */
const COLORS = {
  ink: "#241F1C",
  inkSoft: "#6B6259",
  paper: "#FAF6EF",
  card: "#FFFFFF",
  border: "#E9E1D3",
  coral: "#FF5B4C",
  gold: "#D9A441",
  teal: "#2E6B5E",
  sage: "#4F9D69",
  wrong: "#C1443B",
};
const FONT_DISPLAY = "'Fraunces', serif";
const FONT_BODY = "'Inter', sans-serif";
const FONT_MONO = "'IBM Plex Mono', monospace";
const STORAGE_KEY = "brainbolt-progress";

const TIERS = ["easy", "medium", "hard"];
const TIER_LABELS = { easy: "Warm-Up", medium: "Trading Floor", hard: "Redline" };
const TIER_DESC = {
  easy: "Small numbers, no pressure.",
  medium: "Standard pace, standard stakes.",
  hard: "Bigger numbers, tighter margins.",
};
const TIER_COLORS = { easy: COLORS.sage, medium: COLORS.gold, hard: COLORS.coral };

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function choice(arr) {
  return arr[randInt(0, arr.length - 1)];
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function mkNumeric(prompt, answer, explanation, tolerance = 0) {
  return { type: "numeric", prompt, answer, explanation, tolerance };
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function computeNewStreak(lastPlayedDate, streakDays) {
  const today = todayStr();
  if (lastPlayedDate === today) return streakDays || 1;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (lastPlayedDate === yesterday) return (streakDays || 0) + 1;
  return 1;
}

/* ------------------------------------------------------------------ */
/* Question generators — Part 1: mental math tricks (difficulty-aware) */
/* ------------------------------------------------------------------ */
function genSplit(diff = "medium") {
  let tensRange, bRange, unitsPool;
  if (diff === "easy") {
    tensRange = [1, 4];
    bRange = [11, 39];
    unitsPool = [1, 2, 8, 9];
  } else if (diff === "hard") {
    tensRange = [5, 9];
    bRange = [41, 99];
    unitsPool = [3, 4, 6, 7];
  } else {
    tensRange = [1, 8];
    bRange = [11, 89];
    unitsPool = [1, 2, 3, 7, 8, 9];
  }
  const tens = randInt(tensRange[0], tensRange[1]);
  const units = choice(unitsPool);
  const a = tens * 10 + units;
  const b = randInt(bRange[0], bRange[1]);
  const answer = a * b;
  let roundedBase, diff2, op;
  if (units <= 4) {
    roundedBase = tens * 10;
    diff2 = units;
    op = "add";
  } else {
    roundedBase = (tens + 1) * 10;
    diff2 = 10 - units;
    op = "subtract";
  }
  const explanation = `Round ${a} to ${roundedBase}, then ${op} the rest. ${roundedBase}×${b} = ${roundedBase * b}. ${
    op === "add" ? "Add" : "Subtract"
  } ${diff2}×${b} = ${diff2 * b}. Total = ${answer}.`;
  return mkNumeric(`${a} × ${b}`, answer, explanation);
}

function gen11(diff = "medium") {
  let a;
  if (diff === "easy") {
    do {
      a = randInt(10, 89);
    } while (Math.floor(a / 10) + (a % 10) >= 10);
  } else if (diff === "hard") {
    do {
      a = randInt(10, 99);
    } while (Math.floor(a / 10) + (a % 10) < 10);
  } else {
    a = randInt(10, 99);
  }
  const d1 = Math.floor(a / 10);
  const d2 = a % 10;
  const sum = d1 + d2;
  const answer = a * 11;
  const explanation =
    sum < 10
      ? `${d1}_(${d1}+${d2})_${d2} → ${d1}${sum}${d2} = ${answer}.`
      : `${d1}+${d2}=${sum}, carry the 1: ${d1}(${sum})${d2} → ${d1 + 1}${sum % 10}${d2} = ${answer}.`;
  return mkNumeric(`${a} × 11`, answer, explanation);
}

function gen9(diff = "medium") {
  const range = diff === "easy" ? [10, 49] : diff === "hard" ? [100, 799] : [11, 99];
  const a = randInt(range[0], range[1]);
  const answer = a * 9;
  const explanation = `${a}×9 = ${a}×10 − ${a} = ${a * 10} − ${a} = ${answer}.`;
  return mkNumeric(`${a} × 9`, answer, explanation);
}

function gen5(diff = "medium") {
  const range = diff === "easy" ? [10, 79] : diff === "hard" ? [200, 999] : [11, 199];
  const a = randInt(range[0], range[1]);
  const answer = a * 5;
  const explanation = `${a}×5 = ${a}×10 ÷ 2 = ${a * 10} ÷ 2 = ${answer}.`;
  return mkNumeric(`${a} × 5`, answer, explanation);
}

function gen25(diff = "medium") {
  const range = diff === "easy" ? [3, 30] : diff === "hard" ? [89, 399] : [4, 88];
  const a = randInt(range[0], range[1]);
  const answer = a * 25;
  const explanation = `${a}×25 = ${a}×100 ÷ 4 = ${a * 100} ÷ 4 = ${answer}.`;
  return mkNumeric(`${a} × 25`, answer, explanation);
}

function gen15(diff = "medium") {
  const range = diff === "easy" ? [3, 30] : diff === "hard" ? [89, 399] : [6, 88];
  const a = randInt(range[0], range[1]);
  const answer = a * 15;
  const explanation = `${a}×15 = ${a}×10 + ${a}×5 = ${a * 10} + ${a * 5} = ${answer}.`;
  return mkNumeric(`${a} × 15`, answer, explanation);
}

function genSquareEndingIn5(diff = "medium") {
  let pool;
  if (diff === "easy") pool = [15, 25, 35, 45];
  else if (diff === "hard") pool = [105, 115, 125, 135, 145, 155, 165, 175, 185, 195];
  else pool = [15, 25, 35, 45, 55, 65, 75, 85, 95];
  const n = choice(pool);
  const tens = Math.floor(n / 10);
  const answer = n * n;
  const explanation = `n5² = n×(n+1) then append 25. ${tens}×${tens + 1} = ${tens * (tens + 1)} → ${answer}.`;
  return mkNumeric(`${n}²`, answer, explanation);
}

function genSquareNearRound(diff = "medium") {
  let a;
  if (diff === "easy") a = randInt(11, 29);
  else if (diff === "hard") a = randInt(101, 299);
  else a = randInt(21, 99);
  if (a % 10 === 0) a += 1;
  const nearest10 = Math.round(a / 10) * 10;
  const d = Math.abs(a - nearest10);
  const answer = a * a;
  const explanation = `a² = (a−d)(a+d) + d². With d=${d}: ${a - d}×${a + d} + ${d}² = ${(a - d) * (a + d)} + ${d * d} = ${answer}.`;
  return mkNumeric(`${a}²`, answer, explanation);
}

function genNearBase(diff = "medium") {
  let base, range;
  if (diff === "easy") {
    base = 100;
    range = [95, 99];
  } else if (diff === "hard") {
    base = 1000;
    range = [988, 999];
  } else {
    base = 100;
    range = [88, 99];
  }
  const a = randInt(range[0], range[1]);
  const b = randInt(range[0], range[1]);
  const da = base - a;
  const db = base - b;
  const answer = a * b;
  const explanation = `Deficits from ${base}: ${da} and ${db}. (${a}−${db})×${base} + (${da}×${db}) = ${(a - db) * base} + ${da * db} = ${answer}.`;
  return mkNumeric(`${a} × ${b}`, answer, explanation);
}

function genUnitsSum10(diff = "medium") {
  const tensRange = diff === "easy" ? [1, 3] : diff === "hard" ? [6, 9] : [1, 8];
  const tens = randInt(tensRange[0], tensRange[1]);
  const u1 = randInt(1, 4);
  const u2 = 10 - u1;
  const a = tens * 10 + u1;
  const b = tens * 10 + u2;
  const answer = a * b;
  const explanation = `Same tens digit ${tens}, units sum to 10. ${tens}×${tens + 1} = ${tens * (tens + 1)}, then ${u1}×${u2} = ${u1 * u2} → ${tens * (
    tens + 1
  )}|${String(u1 * u2).padStart(2, "0")} = ${answer}.`;
  return mkNumeric(`${a} × ${b}`, answer, explanation);
}

function genPercent(diff = "medium") {
  let y, pctPool, tolerance;
  if (diff === "easy") {
    y = randInt(1, 10) * 10;
    pctPool = [5, 10, 20, 25, 50];
    tolerance = 0.3;
  } else if (diff === "hard") {
    y = randInt(10, 99) * 10 + randInt(1, 9);
    pctPool = [13, 17, 23, 27, 37, 43, 63, 67, 73];
    tolerance = 1;
  } else {
    y = randInt(4, 60) * 10;
    pctPool = [5, 10, 15, 17, 20, 23, 25, 30, 33, 35, 40, 45];
    tolerance = 0.5;
  }
  const pct = choice(pctPool);
  const answer = Math.round(((y * pct) / 100) * 10) / 10;
  const explanation = `Build ${pct}% of ${y} from 10/5/1% blocks: 10% = ${y / 10}, 5% = ${y / 20}, 1% = ${y / 100}. Combine to ${answer}.`;
  return mkNumeric(`${pct}% of ${y}`, answer, explanation, tolerance);
}

const FRACTIONS = [
  { f: "1/2", label: "0.5" },
  { f: "1/3", label: "0.333…" },
  { f: "1/4", label: "0.25" },
  { f: "1/5", label: "0.2" },
  { f: "1/6", label: "0.167…" },
  { f: "1/7", label: "0.142857…" },
  { f: "1/8", label: "0.125" },
  { f: "1/9", label: "0.111…" },
  { f: "1/11", label: "0.0909…" },
  { f: "1/12", label: "0.0833…" },
  { f: "1/16", label: "0.0625" },
];
function genFractionDecimal(diff = "medium") {
  let pool;
  if (diff === "easy") pool = FRACTIONS.filter((f) => ["1/2", "1/4", "1/5", "1/8", "1/16"].includes(f.f));
  else if (diff === "hard") pool = FRACTIONS.filter((f) => ["1/3", "1/6", "1/7", "1/9", "1/11", "1/12"].includes(f.f));
  else pool = FRACTIONS;
  const correct = choice(pool);
  const distractors = shuffle(FRACTIONS.filter((f) => f.f !== correct.f)).slice(0, 3);
  const options = shuffle([correct, ...distractors]);
  const correctIndex = options.findIndex((o) => o.f === correct.f);
  return {
    type: "mcq",
    prompt: `${correct.f} = ?`,
    choices: options.map((o) => o.label),
    correctIndex,
    explanation: `${correct.f} = ${correct.label} — worth memorizing cold.`,
  };
}

function genSquareRecall(diff = "medium") {
  const range = diff === "easy" ? [2, 15] : diff === "hard" ? [2, 40] : [2, 30];
  const n = randInt(range[0], range[1]);
  return mkNumeric(`${n}²`, n * n, `${n}×${n} = ${n * n}. Memorize squares cold.`);
}
function genCubeRecall(diff = "medium") {
  const range = diff === "easy" ? [2, 8] : diff === "hard" ? [2, 20] : [2, 15];
  const n = randInt(range[0], range[1]);
  return mkNumeric(`${n}³`, n * n * n, `${n}×${n}×${n} = ${n * n * n}.`);
}
function genSqrtRecall(diff = "medium") {
  const range = diff === "easy" ? [2, 12] : diff === "hard" ? [2, 30] : [2, 20];
  const n = randInt(range[0], range[1]);
  return mkNumeric(`√${n * n}`, n, `${n}² = ${n * n}, so √${n * n} = ${n}.`);
}
function genPowerOf2Recall(diff = "medium") {
  const range = diff === "easy" ? [1, 8] : diff === "hard" ? [1, 20] : [1, 15];
  const e = randInt(range[0], range[1]);
  return mkNumeric(`2^${e}`, Math.pow(2, e), `2^${e} = ${Math.pow(2, e)}.`);
}

function genZetamac(diff = "medium") {
  if (diff === "easy") {
    const op = choice(["+", "-", "×"]);
    if (op === "+") {
      const a = randInt(2, 50), b = randInt(2, 50);
      return { prompt: `${a} + ${b}`, answer: a + b };
    }
    if (op === "-") {
      let a = randInt(2, 50), b = randInt(2, 50);
      if (b > a) [a, b] = [b, a];
      return { prompt: `${a} − ${b}`, answer: a - b };
    }
    const a = randInt(2, 9), b = randInt(2, 20);
    return { prompt: `${a} × ${b}`, answer: a * b };
  }
  if (diff === "hard") {
    const op = choice(["+", "-", "×", "÷"]);
    if (op === "+") {
      const a = randInt(50, 500), b = randInt(50, 500);
      return { prompt: `${a} + ${b}`, answer: a + b };
    }
    if (op === "-") {
      let a = randInt(50, 500), b = randInt(50, 500);
      if (b > a) [a, b] = [b, a];
      return { prompt: `${a} − ${b}`, answer: a - b };
    }
    if (op === "×") {
      const a = randInt(6, 20), b = randInt(10, 200);
      return { prompt: `${a} × ${b}`, answer: a * b };
    }
    const b = randInt(6, 20), q = randInt(10, 200);
    return { prompt: `${b * q} ÷ ${b}`, answer: q };
  }
  const op = choice(["+", "-", "×", "÷"]);
  if (op === "+") {
    const a = randInt(2, 100), b = randInt(2, 100);
    return { prompt: `${a} + ${b}`, answer: a + b };
  }
  if (op === "-") {
    let a = randInt(2, 100), b = randInt(2, 100);
    if (b > a) [a, b] = [b, a];
    return { prompt: `${a} − ${b}`, answer: a - b };
  }
  if (op === "×") {
    const a = randInt(2, 12), b = randInt(2, 100);
    return { prompt: `${a} × ${b}`, answer: a * b };
  }
  const b = randInt(2, 12), q = randInt(2, 100);
  return { prompt: `${b * q} ÷ ${b}`, answer: q };
}

/* ------------------------------------------------------------------ */
/* Question banks — Parts 2, 3 & 6: EV, probability, logic (tiered)    */
/* ------------------------------------------------------------------ */
const BANK_EV = {
  easy: [
    {
      type: "mcq",
      prompt: "You pay ₹10 to roll a die and win ₹2×(the number shown). Should you take the bet?",
      choices: ["Yes — positive EV", "No — negative EV"],
      correctIndex: 1,
      explanation: "EV of payout = 2×3.5 = ₹7 < ₹10 cost, so EV = −₹3. Skip it.",
    },
    mkNumeric(
      "A fair coin is flipped until the first head appears. What's the expected number of flips?",
      2,
      "Geometric distribution: E = 1/p = 1/0.5 = 2.",
      0
    ),
  ],
  medium: [
    mkNumeric(
      "You roll a fair die. Keep the number shown (in ₹), or reroll once more and accept the new result. Play optimally — what's your expected payoff?",
      4.25,
      "Rerolling gives EV = 3.5, so keep 4, 5, 6 and reroll on 1, 2, 3. EV = (1/2)(3.5) + (1/6)(4+5+6) = 1.75 + 2.5 = 4.25.",
      0.05
    ),
    {
      type: "mcq",
      prompt: "For a random permutation of n cards, what's the expected number of cards left in their original position — for any n?",
      choices: ["1", "n/2", "√n", "ln(n)"],
      correctIndex: 0,
      explanation: "By linearity of expectation, each card has a 1/n chance of a fixed point. Summed over n cards, that's 1 — regardless of n.",
    },
  ],
  hard: [
    mkNumeric(
      "You roll two dice and take the higher value. What's the expected value?",
      4.4722,
      "P(max = k) = (2k−1)/36. E = Σ k×(2k−1)/36 = 161/36 ≈ 4.47.",
      0.05
    ),
    mkNumeric(
      "You start with ₹3. Each round, a fair coin gives +₹1 (heads) or −₹1 (tails). You stop at ₹0 or ₹6. What's the probability you hit ₹6 first?",
      0.5,
      "For a fair random walk between 0 and N starting at k, P(reach N first) = k/N = 3/6 = 0.5.",
      0.01
    ),
  ],
};

const BANK_LOGIC = {
  easy: [
    mkNumeric(
      "You and a friend each pick a random integer from 1–10. What's the probability you pick the same number?",
      0.1,
      "By symmetry, whatever your friend picks, you match it with probability 1/10.",
      0.01
    ),
    mkNumeric(
      "A jar has 3 red and 2 blue balls. You draw 2 without replacement. What's the probability both are red?",
      0.3,
      "(3/5)×(2/4) = 6/20 = 3/10 = 0.3.",
      0.01
    ),
  ],
  medium: [
    mkNumeric(
      "100 lockers start closed. 100 students pass by; student k toggles every k-th locker. How many lockers are open at the end?",
      10,
      "A locker is toggled once per divisor it has. It ends open only with an odd number of divisors — true only for perfect squares. There are 10 perfect squares ≤ 100.",
      0
    ),
    mkNumeric(
      "3 friends draw straws for who gets the short one. By symmetry, what's the probability it's you?",
      0.333,
      "Every one of the 3 people is equally likely to draw the short straw — probability = 1/3.",
      0.01
    ),
  ],
  hard: [
    mkNumeric(
      "In a room of 5 people, what's the probability at least two share a birth month (12 months, uniform)? Answer as a decimal.",
      0.618,
      "1 − P(all different) = 1 − (12×11×10×9×8)/12⁵ ≈ 1 − 0.382 = 0.618.",
      0.01
    ),
    mkNumeric(
      "Same setup, but with only 4 people. What's the probability at least two share a birth month?",
      0.4271,
      "1 − P(all different) = 1 − (12×11×10×9)/12⁴ ≈ 1 − 0.5729 = 0.4271.",
      0.01
    ),
    mkNumeric(
      "You have 9 balls, one heavier. Using a balance scale (3 outcomes per weighing), what's the minimum number of weighings needed to guarantee finding it?",
      2,
      "Each weighing splits the possibilities into 3 groups, so log₃(9) = 2 weighings suffice and are necessary.",
      0
    ),
  ],
};

/* ------------------------------------------------------------------ */
/* Lesson & section definitions                                        */
/* ------------------------------------------------------------------ */
const SECTIONS = [
  { id: "foundations", title: "Speed Foundations", subtitle: "Multiplication, squares & percent shortcuts", color: COLORS.coral, icon: "⚡" },
  { id: "probability", title: "Probability & EV", subtitle: "The frameworks behind every \u201cshould you take this bet\u201d question", color: COLORS.teal, icon: "🎲" },
  { id: "sprint", title: "Timed Sprint", subtitle: "Zetamac-style mixed arithmetic against the clock", color: COLORS.gold, icon: "⏱" },
];

const LESSONS = [
  { id: "split", section: "foundations", title: "The Split", icon: "✂️", generator: genSplit },
  { id: "elevens-nines", section: "foundations", title: "Elevens & Nines", icon: "🔢", generator: (d) => choice([gen11, gen9])(d) },
  { id: "friendly-multipliers", section: "foundations", title: "Friendly Multipliers", icon: "✳️", generator: (d) => choice([gen5, gen25, gen15])(d) },
  { id: "squares-5", section: "foundations", title: "Squares Ending in 5", icon: "5️⃣", generator: genSquareEndingIn5 },
  { id: "near-base", section: "foundations", title: "Near a Base", icon: "🎯", generator: (d) => choice([genSquareNearRound, genNearBase, genUnitsSum10])(d) },
  { id: "percent-chunks", section: "foundations", title: "Percent in Chunks", icon: "💯", generator: genPercent },
  { id: "fraction-fluency", section: "foundations", title: "Fraction Fluency", icon: "🍰", generator: genFractionDecimal },
  { id: "recall", section: "foundations", title: "Squares, Cubes & Powers", icon: "🧠", generator: (d) => choice([genSquareRecall, genCubeRecall, genSqrtRecall, genPowerOf2Recall])(d) },
  { id: "ev-symmetry", section: "probability", title: "EV & Symmetry", icon: "🎲", bank: BANK_EV },
  { id: "counting-logic", section: "probability", title: "Counting & Logic", icon: "🔐", bank: BANK_LOGIC },
  { id: "sprint", section: "sprint", title: "Zetamac Sprint", icon: "⏱", isSprint: true },
];

const Q_COUNT = { easy: 5, medium: 6, hard: 7 };
const XP_PER_CORRECT = { easy: 8, medium: 10, hard: 13 };
const XP_PERFECT_BONUS = { easy: 15, medium: 20, hard: 25 };
const SPRINT_DURATION = { easy: 90, medium: 60, hard: 45 };
const SPRINT_XP_MULT = { easy: 1.5, medium: 2, hard: 2.5 };

/* ------------------------------------------------------------------ */
/* Small presentational components                                     */
/* ------------------------------------------------------------------ */
function Stat({ label, value }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-semibold" style={{ fontFamily: FONT_MONO, color: COLORS.ink }}>
        {value}
      </div>
      <div className="text-xs mt-1" style={{ color: COLORS.inkSoft, fontFamily: FONT_BODY }}>
        {label}
      </div>
    </div>
  );
}

function TierBadge({ tier }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
      style={{ background: TIER_COLORS[tier] + "20", color: TIER_COLORS[tier], fontFamily: FONT_BODY }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: TIER_COLORS[tier] }} />
      {TIER_LABELS[tier]}
    </span>
  );
}

function SectionHeader({ section, masteredCount, total }) {
  return (
    <div className="rounded-3xl p-6 mb-2 shadow-sm" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: section.color + "20" }}>
          {section.icon}
        </div>
        <div>
          <h2 className="text-xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.ink }}>
            {section.title}
          </h2>
          <p className="text-sm" style={{ color: COLORS.inkSoft, fontFamily: FONT_BODY }}>
            {section.subtitle}
          </p>
        </div>
      </div>
      <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: "#F0EAE0" }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(masteredCount / total) * 100}%`, background: section.color }} />
      </div>
      <p className="mt-1 text-xs" style={{ color: COLORS.inkSoft, fontFamily: FONT_MONO }}>
        {masteredCount}/{total} mastered
      </p>
    </div>
  );
}

function LessonNode({ lesson, index, tiersDone, color, onClick }) {
  const offset = Math.round(Math.sin(index * 0.9) * 56);
  const mastered = tiersDone === 3;
  const started = tiersDone > 0;
  const bg = mastered ? COLORS.gold : started ? color : COLORS.card;
  const fg = mastered || started ? "#fff" : color;
  return (
    <div style={{ transform: `translateX(${offset}px)` }} className="flex flex-col items-center my-4 w-24 mx-auto">
      <button
        onClick={onClick}
        className="relative w-20 h-20 rounded-full flex items-center justify-center shadow-md transition-transform duration-200 hover:scale-105 active:scale-95"
        style={{ background: bg, color: fg, border: started ? "none" : `2px solid ${color}` }}
      >
        <span className="text-2xl">{mastered ? "✓" : lesson.icon}</span>
      </button>
      {started && !mastered && (
        <div className="flex gap-1 mt-1.5">
          {TIERS.map((t, i) => (
            <span key={t} className="w-1.5 h-1.5 rounded-full" style={{ background: i < tiersDone ? color : COLORS.border }} />
          ))}
        </div>
      )}
      <span className="mt-1.5 text-xs text-center font-medium leading-tight" style={{ color: COLORS.inkSoft, fontFamily: FONT_BODY }}>
        {lesson.title}
      </span>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.paper, color: COLORS.inkSoft, fontFamily: FONT_BODY }}>
      Loading…
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main app                                                             */
/* ------------------------------------------------------------------ */
export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [xp, setXp] = useState(0);
  const [completedTiers, setCompletedTiers] = useState(new Set());
  const [bestSprint, setBestSprint] = useState({ easy: 0, medium: 0, hard: 0 });
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [lastPlayedDate, setLastPlayedDate] = useState(null);

  const [mode, setMode] = useState("home");
  const [pendingLessonId, setPendingLessonId] = useState(null);
  const [currentLessonId, setCurrentLessonId] = useState(null);
  const [currentTier, setCurrentTier] = useState("easy");
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [hearts, setHearts] = useState(5);
  const [lessonCorrectCount, setLessonCorrectCount] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [mcqSelected, setMcqSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [lastEarned, setLastEarned] = useState(0);

  const [sprintTier, setSprintTier] = useState("medium");
  const [sprintTimeLeft, setSprintTimeLeft] = useState(60);
  const [sprintScore, setSprintScore] = useState(0);
  const [sprintQuestion, setSprintQuestion] = useState(null);
  const [sprintInput, setSprintInput] = useState("");

  /* ---- load persisted progress (browser localStorage) ---- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setXp(data.xp || 0);
        setCompletedTiers(new Set(data.completedTiers || []));
        setBestSprint(data.bestSprint || { easy: 0, medium: 0, hard: 0 });
        setTotalAnswered(data.totalAnswered || 0);
        setTotalCorrect(data.totalCorrect || 0);
        setStreakDays(data.streakDays || 0);
        setLastPlayedDate(data.lastPlayedDate || null);
      }
    } catch (e) {
      // no saved progress yet — start fresh
    }
    setLoaded(true);
  }, []);

  function saveProgress(next) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error("save failed", e);
    }
  }

  /* ---- sprint timer ---- */
  useEffect(() => {
    if (mode !== "sprintPlay") return;
    if (sprintTimeLeft <= 0) {
      endSprint();
      return;
    }
    const t = setTimeout(() => setSprintTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sprintTimeLeft]);

  /* ---- tier gating (per lesson only — no cross-lesson locks) ---- */
  function isTierUnlocked(lessonId, tier) {
    if (tier === "easy") return true;
    if (tier === "medium") return completedTiers.has(`${lessonId}:easy`);
    return completedTiers.has(`${lessonId}:medium`);
  }

  /* ---- lesson flow ---- */
  function startLesson(lesson, tier) {
    let qs;
    if (lesson.bank) {
      qs = shuffle(lesson.bank[tier]);
    } else {
      qs = Array.from({ length: Q_COUNT[tier] }, () => lesson.generator(tier));
    }
    setQuestions(qs);
    setCurrentLessonId(lesson.id);
    setCurrentTier(tier);
    setQIndex(0);
    setHearts(5);
    setLessonCorrectCount(0);
    setInputValue("");
    setMcqSelected(null);
    setFeedback(null);
    setMode("lesson");
  }

  function checkCurrentAnswer() {
    const q = questions[qIndex];
    let correct;
    if (q.type === "numeric") {
      const val = parseFloat(inputValue);
      correct = !isNaN(val) && Math.abs(val - q.answer) <= (q.tolerance || 0) + 1e-9;
    } else {
      correct = mcqSelected === q.correctIndex;
    }
    setFeedback(correct ? "correct" : "wrong");
    setTotalAnswered((t) => t + 1);
    if (correct) {
      setLessonCorrectCount((c) => c + 1);
      setTotalCorrect((t) => t + 1);
    } else {
      setHearts((h) => h - 1);
    }
  }

  function goNext() {
    if (hearts <= 0) {
      setMode("failed");
      return;
    }
    if (qIndex + 1 >= questions.length) {
      finishLesson();
    } else {
      setQIndex((i) => i + 1);
      setInputValue("");
      setMcqSelected(null);
      setFeedback(null);
    }
  }

  function finishLesson() {
    const perfect = lessonCorrectCount === questions.length;
    const earned = lessonCorrectCount * XP_PER_CORRECT[currentTier] + (perfect ? XP_PERFECT_BONUS[currentTier] : 0);
    const newXp = xp + earned;
    const newCompletedTiers = new Set(completedTiers);
    newCompletedTiers.add(`${currentLessonId}:${currentTier}`);
    const newStreak = computeNewStreak(lastPlayedDate, streakDays);
    const newLastPlayed = todayStr();
    setXp(newXp);
    setCompletedTiers(newCompletedTiers);
    setStreakDays(newStreak);
    setLastPlayedDate(newLastPlayed);
    setLastEarned(earned);
    setMode("summary");
    saveProgress({
      xp: newXp,
      completedTiers: [...newCompletedTiers],
      bestSprint,
      totalAnswered,
      totalCorrect,
      streakDays: newStreak,
      lastPlayedDate: newLastPlayed,
    });
  }

  /* ---- sprint flow ---- */
  function startSprint(tier) {
    setSprintTier(tier);
    setSprintScore(0);
    setSprintTimeLeft(SPRINT_DURATION[tier]);
    setSprintQuestion(genZetamac(tier));
    setSprintInput("");
    setMode("sprintPlay");
  }

  function submitSprintAnswer() {
    const val = parseFloat(sprintInput);
    if (!isNaN(val) && val === sprintQuestion.answer) {
      setSprintScore((s) => s + 1);
    }
    setSprintQuestion(genZetamac(sprintTier));
    setSprintInput("");
  }

  function endSprint() {
    const finalScore = sprintScore;
    const earned = Math.round(finalScore * SPRINT_XP_MULT[sprintTier]);
    const newBestSprint = { ...bestSprint, [sprintTier]: Math.max(bestSprint[sprintTier] || 0, finalScore) };
    const newStreak = computeNewStreak(lastPlayedDate, streakDays);
    const newLastPlayed = todayStr();
    const newCompletedTiers = new Set(completedTiers);
    newCompletedTiers.add(`sprint:${sprintTier}`);
    const newXp = xp + earned;
    setBestSprint(newBestSprint);
    setStreakDays(newStreak);
    setLastPlayedDate(newLastPlayed);
    setCompletedTiers(newCompletedTiers);
    setXp(newXp);
    setLastEarned(earned);
    setMode("sprintSummary");
    saveProgress({
      xp: newXp,
      completedTiers: [...newCompletedTiers],
      bestSprint: newBestSprint,
      totalAnswered,
      totalCorrect,
      streakDays: newStreak,
      lastPlayedDate: newLastPlayed,
    });
  }

  /* ---- derived data ---- */
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;
  const overallBestSprint = Math.max(bestSprint.easy || 0, bestSprint.medium || 0, bestSprint.hard || 0);
  const currentLesson = LESSONS.find((l) => l.id === currentLessonId);
  const currentSection = currentLesson ? SECTIONS.find((s) => s.id === currentLesson.section) : null;
  const pendingLesson = LESSONS.find((l) => l.id === pendingLessonId);

  function handleNodeClick(lesson) {
    setPendingLessonId(lesson.id);
    setMode("tierSelect");
  }

  function formatAnswer(q) {
    return q.type === "numeric" ? `${q.answer}` : `${q.choices[q.correctIndex]}`;
  }

  /* ---- screens ---- */
  function HomeScreen() {
    return (
      <div>
        <div className="sticky top-0 z-20 px-4 pt-4 pb-2" style={{ background: COLORS.paper }}>
          <div className="max-w-md mx-auto rounded-3xl px-5 py-3 flex items-center justify-between shadow-sm" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <div className="flex items-center gap-1.5">
              <span className="text-lg">🔥</span>
              <span className="font-semibold" style={{ fontFamily: FONT_MONO, color: COLORS.ink }}>
                {streakDays}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg">⚡</span>
              <span className="font-semibold" style={{ fontFamily: FONT_MONO, color: COLORS.ink }}>
                {xp}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg">🎯</span>
              <span className="font-semibold" style={{ fontFamily: FONT_MONO, color: COLORS.ink }}>
                {accuracy !== null ? `${accuracy}%` : "—"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg">⏱</span>
              <span className="font-semibold" style={{ fontFamily: FONT_MONO, color: COLORS.ink }}>
                {overallBestSprint}
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-6 pt-6 pb-4 text-center">
          <h1 className="text-3xl font-semibold leading-tight" style={{ fontFamily: FONT_DISPLAY, color: COLORS.ink }}>
            BrainBolt
          </h1>
          <p className="mt-2 text-sm" style={{ color: COLORS.inkSoft, fontFamily: FONT_BODY }}>
            Every lesson is open. Pick your pace — Warm-Up, Trading Floor, or Redline.
          </p>
        </div>

        <div className="max-w-md mx-auto px-6 pb-16">
          {SECTIONS.map((section) => {
            const secLessons = LESSONS.filter((l) => l.section === section.id);
            const masteredCount = secLessons.filter((l) => TIERS.every((t) => completedTiers.has(`${l.id}:${t}`))).length;
            return (
              <div key={section.id} className="mb-8">
                <SectionHeader section={section} masteredCount={masteredCount} total={secLessons.length} />
                <div className="relative py-4">
                  {secLessons.map((lesson) => {
                    const idx = LESSONS.findIndex((l) => l.id === lesson.id);
                    const tiersDone = TIERS.filter((t) => completedTiers.has(`${lesson.id}:${t}`)).length;
                    return <LessonNode key={lesson.id} lesson={lesson} index={idx} tiersDone={tiersDone} color={section.color} onClick={() => handleNodeClick(lesson)} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function TierSelectScreen() {
    if (!pendingLesson) return null;
    const section = SECTIONS.find((s) => s.id === pendingLesson.section);
    return (
      <div className="min-h-screen flex flex-col items-center px-6 py-10" style={{ background: COLORS.paper }}>
        <button onClick={() => setMode("home")} className="self-start text-2xl mb-6 leading-none" style={{ color: COLORS.inkSoft }} aria-label="Back">
          ×
        </button>
        <div className="text-5xl mb-3">{pendingLesson.icon}</div>
        <h2 className="text-2xl font-semibold mb-1 text-center" style={{ fontFamily: FONT_DISPLAY, color: COLORS.ink }}>
          {pendingLesson.title}
        </h2>
        <p className="text-sm mb-8 text-center max-w-xs" style={{ color: COLORS.inkSoft, fontFamily: FONT_BODY }}>
          Choose your pace.
        </p>
        <div className="w-full max-w-md flex flex-col gap-4">
          {TIERS.map((t) => {
            const unlocked = pendingLesson.isSprint ? true : isTierUnlocked(pendingLesson.id, t);
            const done = completedTiers.has(`${pendingLesson.id}:${t}`);
            const best = pendingLesson.isSprint ? bestSprint[t] || 0 : null;
            return (
              <button
                key={t}
                disabled={!unlocked}
                onClick={() => (unlocked ? (pendingLesson.isSprint ? startSprint(t) : startLesson(pendingLesson, t)) : null)}
                className={`flex items-center justify-between px-6 py-5 rounded-3xl shadow-sm text-left transition-transform duration-150 ${
                  unlocked ? "hover:scale-[1.02] active:scale-[0.99] cursor-pointer" : "opacity-50 cursor-not-allowed"
                }`}
                style={{ background: COLORS.card, border: `2px solid ${done ? TIER_COLORS[t] : COLORS.border}` }}
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: TIER_COLORS[t] }} />
                    <span className="font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.ink }}>
                      {TIER_LABELS[t]}
                    </span>
                    {done && (
                      <span className="text-xs font-semibold" style={{ color: TIER_COLORS[t], fontFamily: FONT_BODY }}>
                        ✓ mastered
                      </span>
                    )}
                    {pendingLesson.isSprint && best > 0 && (
                      <span className="text-xs" style={{ color: COLORS.inkSoft, fontFamily: FONT_MONO }}>
                        best {best}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-1" style={{ color: COLORS.inkSoft, fontFamily: FONT_BODY }}>
                    {unlocked ? TIER_DESC[t] : "Clear the previous pace to unlock."}
                  </p>
                </div>
                <span className="text-xl flex-shrink-0" style={{ color: COLORS.inkSoft }}>
                  {unlocked ? "→" : "🔒"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function LessonScreen() {
    const q = questions[qIndex];
    if (!q) return null;
    const progressPct = (qIndex / questions.length) * 100;
    return (
      <div className="min-h-screen flex flex-col" style={{ background: COLORS.paper }}>
        <div className="flex items-center gap-3 px-4 py-4 max-w-md mx-auto w-full">
          <button onClick={() => setMode("home")} className="text-2xl leading-none" style={{ color: COLORS.inkSoft }} aria-label="Exit lesson">
            ×
          </button>
          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "#F0EAE0" }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressPct}%`, background: currentSection ? currentSection.color : COLORS.coral }} />
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="text-lg">
                {i < hearts ? "❤️" : "🤍"}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-md rounded-3xl p-8 shadow-lg" style={{ background: COLORS.card }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: COLORS.inkSoft, fontFamily: FONT_BODY }}>
                {currentLesson ? currentLesson.title : ""}
              </p>
              <TierBadge tier={currentTier} />
            </div>
            <p
              className="mb-8 text-center leading-snug"
              style={{ fontFamily: q.type === "numeric" ? FONT_MONO : FONT_DISPLAY, color: COLORS.ink, fontSize: q.type === "numeric" ? "2rem" : "1.35rem" }}
            >
              {q.prompt}
            </p>

            {q.type === "numeric" ? (
              <input
                type="text"
                inputMode="decimal"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (feedback) goNext();
                    else if (inputValue.trim() !== "") checkCurrentAnswer();
                  }
                }}
                disabled={!!feedback}
                autoFocus
                placeholder="Your answer"
                className="w-full text-center text-2xl rounded-2xl px-4 py-3 outline-none"
                style={{
                  fontFamily: FONT_MONO,
                  border: `2px solid ${feedback === "correct" ? COLORS.sage : feedback === "wrong" ? COLORS.wrong : COLORS.border}`,
                  background: COLORS.paper,
                  color: COLORS.ink,
                }}
              />
            ) : (
              <div className="flex flex-col gap-3">
                {q.choices.map((c, i) => (
                  <button
                    key={i}
                    disabled={!!feedback}
                    onClick={() => setMcqSelected(i)}
                    className="text-left px-4 py-3 rounded-2xl transition-colors duration-150"
                    style={{
                      fontFamily: FONT_MONO,
                      border: `2px solid ${mcqSelected === i ? COLORS.coral : COLORS.border}`,
                      background: feedback && i === q.correctIndex ? COLORS.sage + "20" : feedback === "wrong" && mcqSelected === i ? COLORS.wrong + "20" : COLORS.card,
                      color: COLORS.ink,
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {!feedback && (
              <button
                onClick={checkCurrentAnswer}
                disabled={q.type === "numeric" ? inputValue.trim() === "" : mcqSelected === null}
                className="mt-6 w-full py-3 rounded-2xl font-semibold text-white disabled:opacity-40 transition-opacity duration-150"
                style={{ background: COLORS.ink, fontFamily: FONT_BODY }}
              >
                Check
              </button>
            )}
          </div>
        </div>

        {feedback && (
          <div className="px-6 py-6" style={{ background: feedback === "correct" ? "#EAF4EC" : "#FBEAEA" }}>
            <div className="max-w-md mx-auto">
              <p className="font-semibold mb-1" style={{ color: feedback === "correct" ? COLORS.sage : COLORS.wrong, fontFamily: FONT_DISPLAY }}>
                {feedback === "correct" ? `Correct — +${XP_PER_CORRECT[currentTier]} XP` : `Not quite — it's ${formatAnswer(q)}`}
              </p>
              <p className="text-sm mb-4" style={{ color: COLORS.inkSoft, fontFamily: FONT_BODY }}>
                {q.explanation}
              </p>
              <button onClick={goNext} className="w-full py-3 rounded-2xl font-semibold text-white" style={{ background: feedback === "correct" ? COLORS.sage : COLORS.wrong }}>
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function SummaryScreen() {
    const perfect = lessonCorrectCount === questions.length;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: COLORS.paper }}>
        <div className="text-6xl mb-4">{perfect ? "🏆" : "👍"}</div>
        <h2 className="text-2xl font-semibold mb-1" style={{ fontFamily: FONT_DISPLAY, color: COLORS.ink }}>
          {perfect ? "Perfect lesson" : "Lesson complete"}
        </h2>
        <div className="flex items-center gap-2 mb-8">
          <p style={{ color: COLORS.inkSoft, fontFamily: FONT_BODY }}>{currentLesson ? currentLesson.title : ""}</p>
          <TierBadge tier={currentTier} />
        </div>
        <div className="flex gap-10 mb-10">
          <Stat label="Correct" value={`${lessonCorrectCount}/${questions.length}`} />
          <Stat label="XP earned" value={`+${lastEarned}`} />
        </div>
        <button onClick={() => setMode("home")} className="px-10 py-3 rounded-2xl font-semibold text-white" style={{ background: COLORS.coral, fontFamily: FONT_BODY }}>
          Continue
        </button>
      </div>
    );
  }

  function FailedScreen() {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: COLORS.paper }}>
        <div className="text-6xl mb-4">💔</div>
        <h2 className="text-2xl font-semibold mb-2" style={{ fontFamily: FONT_DISPLAY, color: COLORS.ink }}>
          Out of hearts
        </h2>
        <p className="mb-8 max-w-xs" style={{ color: COLORS.inkSoft, fontFamily: FONT_BODY }}>
          Review the tricks and try {currentLesson ? currentLesson.title : "this lesson"} again — or drop down to Warm-Up to rebuild momentum.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <button onClick={() => setMode("home")} className="px-6 py-3 rounded-2xl font-semibold" style={{ border: `2px solid ${COLORS.border}`, color: COLORS.ink, fontFamily: FONT_BODY }}>
            Exit
          </button>
          {currentTier !== "easy" && (
            <button onClick={() => startLesson(currentLesson, "easy")} className="px-6 py-3 rounded-2xl font-semibold" style={{ border: `2px solid ${TIER_COLORS.easy}`, color: TIER_COLORS.easy, fontFamily: FONT_BODY }}>
              Try Warm-Up
            </button>
          )}
          <button onClick={() => startLesson(currentLesson, currentTier)} className="px-6 py-3 rounded-2xl font-semibold text-white" style={{ background: COLORS.coral, fontFamily: FONT_BODY }}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  function SprintPlayScreen() {
    if (!sprintQuestion) return null;
    return (
      <div className="min-h-screen flex flex-col" style={{ background: COLORS.ink }}>
        <div className="flex justify-between items-center px-6 py-5 max-w-md mx-auto w-full">
          <button onClick={() => setMode("home")} className="text-2xl leading-none" style={{ color: "#fff" }} aria-label="Exit sprint">
            ×
          </button>
          <div className="text-xl font-semibold" style={{ fontFamily: FONT_MONO, color: sprintTimeLeft <= 10 ? COLORS.coral : "#fff" }}>
            {sprintTimeLeft}s
          </div>
          <div className="text-sm font-semibold" style={{ fontFamily: FONT_MONO, color: COLORS.gold }}>
            Score {sprintScore}
          </div>
        </div>
        <div className="text-center -mt-2 mb-2">
          <TierBadge tier={sprintTier} />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <p className="text-5xl mb-8" style={{ fontFamily: FONT_MONO, color: "#fff" }}>
            {sprintQuestion.prompt}
          </p>
          <input
            autoFocus
            type="text"
            inputMode="decimal"
            value={sprintInput}
            onChange={(e) => setSprintInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitSprintAnswer();
            }}
            className="w-64 text-center text-2xl rounded-2xl px-4 py-3 outline-none"
            style={{ fontFamily: FONT_MONO, border: "none", background: "#332C25", color: "#fff" }}
          />
        </div>
      </div>
    );
  }

  function SprintSummaryScreen() {
    const tierBest = bestSprint[sprintTier] || 0;
    const isNewBest = sprintScore >= tierBest && sprintScore > 0;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: COLORS.paper }}>
        <div className="text-6xl mb-4">{isNewBest ? "🔥" : "⏱"}</div>
        <h2 className="text-2xl font-semibold mb-1" style={{ fontFamily: FONT_DISPLAY, color: COLORS.ink }}>
          {isNewBest ? "New best!" : "Sprint complete"}
        </h2>
        <div className="mb-6">
          <TierBadge tier={sprintTier} />
        </div>
        <div className="flex gap-8 mb-10">
          <Stat label="Score" value={sprintScore} />
          <Stat label="Best" value={tierBest} />
          <Stat label="XP earned" value={`+${lastEarned}`} />
        </div>
        <div className="flex gap-3">
          <button onClick={() => setMode("home")} className="px-6 py-3 rounded-2xl font-semibold" style={{ border: `2px solid ${COLORS.border}`, color: COLORS.ink, fontFamily: FONT_BODY }}>
            Home
          </button>
          <button onClick={() => startSprint(sprintTier)} className="px-6 py-3 rounded-2xl font-semibold text-white" style={{ background: COLORS.gold, fontFamily: FONT_BODY }}>
            Run again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: COLORS.paper, fontFamily: FONT_BODY }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');`}</style>
      {!loaded ? (
        <LoadingScreen />
      ) : mode === "home" ? (
        <HomeScreen />
      ) : mode === "tierSelect" ? (
        <TierSelectScreen />
      ) : mode === "lesson" ? (
        <LessonScreen />
      ) : mode === "failed" ? (
        <FailedScreen />
      ) : mode === "summary" ? (
        <SummaryScreen />
      ) : mode === "sprintPlay" ? (
        <SprintPlayScreen />
      ) : mode === "sprintSummary" ? (
        <SprintSummaryScreen />
      ) : null}
    </div>
  );
}
