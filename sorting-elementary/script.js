'use strict';

/* ==========================================================================
   Steps
   Every algorithm runs once, up front, and records a snapshot ("step") at
   each comparison and each movement. The player only moves between them.
   Some steps carry a practice question (see practice.js).

   Each generator takes the code to run: by default the correct code, or a
   version with one fragment replaced (complete-the-code practice). Steps
   that make claims only true of the correct code ("final position", "sorted
   so far") are only marked when the code is the correct one.
   ========================================================================== */

function range(start, end) {
  const out = [];
  for (let k = start; k < end; k++) { out.push(k); }
  return out;
}

function sum(terms) {
  return terms.reduce((total, term) => total + term, 0);
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function isAscending(values) {
  return values.every((value, k) => k === 0 || values[k - 1] <= value);
}

function sameCode(code, reference) {
  return Object.keys(reference).every(key => code[key] === reference[key]);
}

// (n - 1) + (n - 2) + ... + 1: the most comparisons any of these sorts makes.
function maxComparisons(n) {
  return n * (n - 1) / 2;
}

const RELATIONS = {
  '>': { test: (x, y) => x > y, words: 'greater than', yes: '>', no: '≤' },
  '>=': { test: (x, y) => x >= y, words: 'greater than or equal to', yes: '≥', no: '<' },
  '<': { test: (x, y) => x < y, words: 'smaller than', yes: '<', no: '≥' },
  '<=': { test: (x, y) => x <= y, words: 'smaller than or equal to', yes: '≤', no: '>' }
};

const OUT_OF_BOUNDS = 'Using an index outside the array is undefined behaviour in C++: ' +
                      'the program may crash or silently use garbage.';

class Recorder {
  constructor(values) {
    this.original = values.slice();
    this.a = values.slice();
    this.ids = values.map((value, k) => k);   // which original value sits where
    this.steps = [];
    this.pass = 0;
    this.comparisons = 0;
    this.moves = 0;
  }

  has(k) {
    return k >= 0 && k < this.a.length;
  }

  swap(x, y) {
    [this.a[x], this.a[y]] = [this.a[y], this.a[x]];
    [this.ids[x], this.ids[y]] = [this.ids[y], this.ids[x]];
  }

  copy(from, to) {
    this.a[to] = this.a[from];
    this.ids[to] = this.ids[from];
  }

  put(k, value, id) {
    this.a[k] = value;
    this.ids[k] = id;
  }

  add(fields) {
    this.steps.push({
      array: this.a.slice(),
      compare: [],      // indices being compared
      moved: [],        // indices that just changed
      same: [],         // indices compared and left alone
      current: -1,      // current minimum or value being placed
      final: [],        // indices in their final position
      sorted: [],       // sorted among themselves, may still shift
      pointers: {},     // index variables drawn under the cells
      vars: {},         // every variable shown next to the code
      held: null,       // value held aside (insertion sort key)
      lines: [],        // C++ lines executed in this step
      phase: '',
      text: '',
      question: null,   // practice question, built with Practice.*
      endOfPass: false,
      done: false,
      pass: this.pass,
      comparisons: this.comparisons,
      moves: this.moves,
      ...fields
    });
  }

  // Last step of a run. ids tell which original value ended where.
  finish(fields) {
    this.add({ phase: 'Done', done: true, ids: this.ids.slice(), ...fields });
    return this.steps;
  }

  // Last step of a run that used an index outside the array.
  crash(fields) {
    this.add({ phase: 'Out of bounds', done: true, crash: true, ids: this.ids.slice(), ...fields });
    return this.steps;
  }

  // Sorted, with the same values it started with.
  isSorted() {
    const byValue = values => [...values].sort((x, y) => x - y).join();
    return isAscending(this.a) && byValue(this.a) === byValue(this.original);
  }

  // Last step of a run with modified code: no claims about the cost.
  finishVariant(moveWord) {
    return this.finish({
      final: this.isSorted() ? range(0, this.a.length) : [],
      text: `Finished with ${plural(this.comparisons, 'comparison')} and ${plural(this.moves, moveWord)}.`
    });
  }
}

/* Cost -------------------------------------------------------------------- */

// Asked on the first step, checked on the last one.
function comparisonPrediction({ name, n, total, bestCase }) {
  const options = [...new Set([n - 1, total, maxComparisons(n), n * n])].sort((x, y) => x - y);
  return Practice.prediction({
    prompt: `Before you start: how many comparisons will ${name} make on this array?`,
    options,
    answer: total,
    praise: `Your prediction was right: ${total} comparisons.`,
    explain: guess => `You predicted ${guess}; it made ${total}. ${predictionHint(guess, n, bestCase)}`
  });
}

function predictionHint(guess, n, bestCase) {
  const most = maxComparisons(n);
  if (guess === n * n) {
    return `n² = ${n * n} would mean comparing every value with every value. None of these ` +
           `sorts makes more than (n − 1) + (n − 2) + … + 1 = n(n − 1)/2 = ${most} comparisons.`;
  }
  if (guess === n - 1) { return bestCase; }
  return `n(n − 1)/2 = ${most} is the most it can make, and this array needed less work.`;
}

/* Bubble sort ------------------------------------------------------------- */

// Which value travels to the end of the unsorted part in this pass?
function bubbleTravelQuestion(a, pass, last) {
  const values = a.slice();
  let top = 0;
  for (let k = 1; k <= last; k++) {
    if (values[k] >= values[top]) { top = k; }
  }
  const max = values[top];
  const copies = values.slice(0, last + 1).filter(value => value === max).length;

  return Practice.pickCell({
    prompt: `Pass ${pass + 1}: which value will end up at index ${last}? Click it.`,
    candidates: range(0, last + 1),
    answer: top,
    praise: (top === last
      ? `Right. ${max} is the largest value left and it is already at index ${last}, so it stays there.`
      : `Right. ${max} is the largest value left: once the comparisons reach it, each one carries it ` +
        `one place right until it reaches index ${last}.`) +
      (copies > 1 ? ' Equal values never swap, so the copy furthest to the right is the one that ends there.' : ''),
    explain: k => (values[k] === max
      ? `Close. ${max} is the largest value, but equal values never swap (${max} > ${max} is false), ` +
        `so the copy furthest to the right is the one that ends at index ${last}.`
      : `Not quite. ${values[k]} is not the largest value left, so a larger value will get past it. ` +
        `Each comparison leaves the larger neighbour on the right, so the largest value left, ${max}, ` +
        `is the one carried to index ${last}.`)
  });
}

function bubbleCompareQuestion(left, right, j) {
  return Practice.swapOrKeep({
    prompt: `${left} and ${right}: click them to swap, or keep them.`,
    pair: [j, j + 1],
    answer: left > right,
    praise: 'Correct.',
    explain: swap => {
      if (!swap) { return `Not quite. ${left} > ${right}: the larger value is on the left, so they must swap.`; }
      return left === right
        ? `Not quite. ${left} and ${right} are equal, and the code only swaps when a[j] > a[j + 1]. ` +
          'Equal values stay in place.'
        : `Not quite. ${left} < ${right}, so they are already in order and stay in place.`;
    }
  });
}

function bubbleCost(n, passTerms) {
  const total = sum(passTerms);
  const most = maxComparisons(n);
  if (passTerms.length === 1) {
    return `One pass of ${total} comparisons found nothing to swap, so it stopped early. ` +
           `The most it could make is n(n − 1)/2 = ${most}.`;
  }
  const breakdown = `${passTerms.join(' + ')} = ${total}`;
  return total === most
    ? `Pass by pass: ${breakdown}, which is n(n − 1)/2 = ${n}·${n - 1}/2, the most bubble sort can make.`
    : `Pass by pass: ${breakdown}. The last pass made no swaps, so it stopped early; ` +
      `the most it could make is n(n − 1)/2 = ${most}.`;
}

// The correct code; a challenge replaces one of these fragments.
const BUBBLE_CODE = { init: 'true', bound: 'n - 1 - i', cond: 'a[j] > a[j + 1]' };

const BUBBLE_CONDITIONS = { 'a[j] > a[j + 1]': '>', 'a[j] >= a[j + 1]': '>=', 'a[j] < a[j + 1]': '<' };

function bubbleSteps(values, code = BUBBLE_CODE) {
  const exact = sameCode(code, BUBBLE_CODE);
  const r = new Recorder(values);
  const a = r.a;
  const n = a.length;
  const bounds = { 'n - 1 - i': i => n - 1 - i, 'n - i': i => n - i, 'n - 1': () => n - 1, 'n - 2 - i': i => n - 2 - i };
  const limit = bounds[code.bound];
  const rel = RELATIONS[BUBBLE_CONDITIONS[code.cond]];
  const passTerms = [];

  let swapped = code.init === 'true';

  r.add({
    lines: [2, 3], phase: 'Start', vars: { n, swapped },
    text: 'Bubble sort walks the array again and again, swapping neighbours that are out of order.'
  });

  if (!swapped) {
    r.add({
      lines: [4], phase: 'Loop condition', vars: { n, i: 0, swapped },
      text: 'swapped is false, so i < n - 1 && swapped is false before the first pass: the loop body never runs.'
    });
  }

  for (let i = 0; i < n - 1 && swapped; i++) {
    r.pass = i + 1;
    swapped = false;
    const last = limit(i);
    const final = exact ? range(last + 1, n) : [];
    passTerms.push(last);

    r.add({
      lines: [4, 5], phase: `Pass ${i + 1} begins`, final,
      vars: { n, i, swapped },
      text: exact
        ? `Compare neighbours from index 0 to ${last}. The largest value left will end up at index ${last}.`
        : (last > 0
          ? `Compare neighbours while j < ${code.bound}, that is, j from 0 to ${last - 1}.`
          : `j < ${code.bound} is false from the start, so this pass compares nothing.`),
      question: exact ? bubbleTravelQuestion(a, i, last) : null
    });

    for (let j = 0; j < last; j++) {
      const pointers = { j, 'j + 1': j + 1 };

      if (!r.has(j + 1)) {
        return r.crash({
          lines: [6, 7], compare: [j], final, pointers, vars: { n, i, j, swapped },
          text: `j is ${j}, so a[j + 1] is a[${j + 1}], but the last index is ${n - 1}. ${OUT_OF_BOUNDS}`
        });
      }

      r.comparisons++;
      const left = a[j];
      const right = a[j + 1];

      r.add({
        lines: [6, 7], phase: 'Comparing', compare: [j, j + 1], final, pointers,
        vars: { n, i, j, swapped },
        text: `Is ${left} ${rel.words} ${right}?`,
        question: exact ? bubbleCompareQuestion(left, right, j) : null
      });

      if (rel.test(left, right)) {
        r.swap(j, j + 1);
        r.moves++;
        swapped = true;
        r.add({
          lines: [8, 9], phase: 'Swapped', moved: [j, j + 1], final, pointers,
          vars: { n, i, j, swapped },
          text: `Yes. ${left} ${rel.yes} ${right}, so they trade places.`
        });
      } else {
        r.add({
          lines: [7], phase: 'No change', same: [j, j + 1], final, pointers,
          vars: { n, i, j, swapped },
          text: `No. ${left} ${rel.no} ${right}, so nothing moves.`
        });
      }
    }

    // The outer loop now increments i and re-checks i < n - 1 && swapped.
    const next = i + 1;
    if (!swapped) {
      r.add({
        lines: [4], phase: `End of pass ${i + 1}`, final: exact ? range(0, n) : [], endOfPass: true,
        vars: { n, i: next, swapped },
        text: 'No swaps in this pass, so swapped is false and the loop condition fails.' +
              (exact ? ' The array is already sorted: stop early.' : '')
      });
    } else {
      const loop = next < n - 1 ? 'There were swaps, so the loop continues.'
                                : `i is now ${next}, so i < n - 1 fails and the loop ends.`;
      r.add({
        lines: [4], phase: `End of pass ${i + 1}`, final: exact ? range(last, n) : [], endOfPass: true,
        vars: { n, i: next, swapped },
        text: exact
          ? `${a[last]} reached index ${last}. ${i + 1} value(s) are final and will not be looked at again. ${loop}`
          : loop
      });
    }
  }

  if (!exact) { return r.finishVariant('swap'); }

  r.finish({
    final: range(0, n),
    text: `Sorted with ${plural(r.comparisons, 'comparison')} and ${plural(r.moves, 'swap')}. ` +
          bubbleCost(n, passTerms)
  });

  r.steps[0].question = comparisonPrediction({
    name: 'bubble sort', n, total: r.comparisons,
    bestCase: `n − 1 = ${n - 1} is the best case: a single pass with no swaps, ` +
              'which only happens when the array is already sorted.'
  });
  return r.steps;
}

/* Selection sort ---------------------------------------------------------- */

// Which value will be selected for index `pass`?
function selectionPickQuestion(a, pass) {
  const values = a.slice();
  const n = values.length;
  let m = pass;
  for (let k = pass + 1; k < n; k++) {
    if (values[k] < values[m]) { m = k; }
  }
  const min = values[m];
  const copies = values.slice(pass).filter(value => value === min).length;

  return Practice.pickCell({
    prompt: `Pass ${pass + 1}: which value will be placed at index ${pass}? Click it.`,
    candidates: range(pass, n),
    answer: m,
    praise: `Right. ${min} is the smallest value left` +
      (m === pass ? `, and it is already at index ${pass}.` : `, so it will swap into index ${pass}.`) +
      (copies > 1 ? ' Of the equal copies, the scan keeps the first one, because minIndex only ' +
                    'changes when a value is strictly smaller.' : ''),
    explain: k => (values[k] === min
      ? `Close. ${min} is the smallest value, but the scan keeps the first copy it finds, at index ${m}: ` +
        'minIndex only changes when a[j] < a[minIndex], and equal is not smaller.'
      : `Not quite. ${values[k]} is not the smallest value left: ${min} is smaller. ` +
        'Selection sort checks every value left and picks the minimum.')
  });
}

function selectionCost(n) {
  const terms = range(1, n).reverse();
  return `Every pass compares all the values left: ${terms.join(' + ')} = ${maxComparisons(n)}, ` +
         `which is n(n − 1)/2 = ${n}·${n - 1}/2. Selection sort always makes this many comparisons, ` +
         `whatever the order, and never more than n − 1 = ${n - 1} swaps.`;
}

const SELECTION_CODE = { start: 'i + 1', cond: 'a[j] < a[minIndex]', swap: 'std::swap(a[i], a[minIndex]);' };

// Each condition compares a[j] with a[minIndex] or a[i].
const SELECTION_CONDITIONS = {
  'a[j] < a[minIndex]': { rel: '<', against: 'minIndex' },
  'a[j] <= a[minIndex]': { rel: '<=', against: 'minIndex' },
  'a[j] < a[i]': { rel: '<', against: 'i' },
  'a[j] > a[minIndex]': { rel: '>', against: 'minIndex' }
};

function selectionSteps(values, code = SELECTION_CODE) {
  const exact = sameCode(code, SELECTION_CODE);
  const r = new Recorder(values);
  const a = r.a;
  const n = a.length;
  const starts = { 'i + 1': i => i + 1, 'i': i => i, '0': () => 0 };
  const condition = SELECTION_CONDITIONS[code.cond];
  const rel = RELATIONS[condition.rel];

  r.add({
    lines: [2], phase: 'Start', vars: { n },
    text: 'Selection sort finds the smallest remaining value and puts it in place, one position at a time.'
  });

  for (let i = 0; i < n - 1; i++) {
    r.pass = i + 1;
    let minIndex = i;
    const final = exact ? range(0, i) : [];

    r.add({
      lines: [3, 4], phase: `Pass ${i + 1} begins`, current: minIndex, final,
      pointers: { i, minIndex }, vars: { n, i, minIndex },
      text: exact ? `Assume ${a[i]} at index ${i} is the smallest of what is left.` : `minIndex starts at ${i}.`,
      question: exact ? selectionPickQuestion(a, i) : null
    });

    for (let j = starts[code.start](i); j < n; j++) {
      r.comparisons++;
      const against = condition.against === 'i' ? i : minIndex;
      const seen = a[j];
      const other = a[against];

      r.add({
        lines: [5, 6], phase: 'Comparing', compare: [j], current: minIndex, final,
        pointers: { i, j, minIndex }, vars: { n, i, minIndex, j },
        text: exact ? `Is ${seen} smaller than ${other}?`
                    : `Is a[j] = ${seen} ${rel.words} a[${condition.against}] = ${other}?`
      });

      if (rel.test(seen, other)) {
        minIndex = j;
        r.add({
          lines: [7], phase: 'New minimum', current: minIndex, final,
          pointers: { i, j, minIndex }, vars: { n, i, minIndex, j },
          text: `Yes. minIndex is now ${j}. Nothing has moved in the array yet.`
        });
      } else {
        r.add({
          lines: [6], phase: 'No change', same: [j], current: minIndex, final,
          pointers: { i, j, minIndex }, vars: { n, i, minIndex, j },
          text: exact ? `No. ${other} is still the smallest. Nothing moves.` : `No. minIndex stays ${minIndex}.`
        });
      }
    }

    if (minIndex === i) {
      r.add({
        lines: [10], phase: 'No swap needed', final: exact ? range(0, i + 1) : [],
        endOfPass: true, pointers: { i, minIndex }, vars: { n, i, minIndex },
        text: exact ? `${a[i]} is already at index ${i}. No swap.` : `minIndex is still ${i}, so nothing is swapped.`
      });
    } else if (code.swap === SELECTION_CODE.swap) {
      const mover = a[minIndex];
      r.swap(i, minIndex);
      r.moves++;
      r.add({
        lines: [10, 11], phase: 'One swap', moved: [i, minIndex], final: exact ? range(0, i + 1) : [],
        endOfPass: true, pointers: { i, minIndex }, vars: { n, i, minIndex },
        text: exact ? `${mover} moves into index ${i}. That is the only swap of this pass.`
                    : `${mover} and ${a[minIndex]} trade places.`
      });
    } else {
      const [from, to] = code.swap === 'a[i] = a[minIndex];' ? [minIndex, i] : [i, minIndex];
      const lost = a[to];
      r.copy(from, to);
      r.moves++;
      r.add({
        lines: [10, 11], phase: 'Copy', moved: [to], endOfPass: true,
        pointers: { i, minIndex }, vars: { n, i, minIndex },
        text: `${code.swap.slice(0, -1)} copies ${a[to]} into index ${to}, overwriting ${lost}.`
      });
    }
  }

  if (!exact) { return r.finishVariant('swap'); }

  r.finish({
    final: range(0, n),
    text: `Sorted with ${plural(r.comparisons, 'comparison')} and ${plural(r.moves, 'swap')}. ` +
          selectionCost(n)
  });

  r.steps[0].question = comparisonPrediction({
    name: 'selection sort', n, total: r.comparisons,
    bestCase: `n − 1 = ${n - 1} would be one comparison per pass, but selection sort has to ` +
              'check every value left to be sure it has the minimum.'
  });
  return r.steps;
}

/* Insertion sort ---------------------------------------------------------- */

// Where will a[i] be inserted? Gap k means it ends at index k.
function insertionGapQuestion(a, i) {
  const values = a.slice();
  const key = values[i];
  let p = i;
  while (p > 0 && values[p - 1] > key) { p--; }

  const shifted = i - p;

  return Practice.pickGap({
    prompt: `Pass ${i}: where will key = ${key} be inserted? Click the gap where it belongs.`,
    candidates: range(0, i + 1),
    answer: p,
    praise: shifted === 0
      ? `Right. ${values[i - 1]} is not greater than key (${key}), so key stays where it is: ` +
        'one comparison, no shifts.'
      : `Right. key (${key}) ends up at index ${p}: ` +
        (shifted === 1 ? 'the value greater than it shifts' : `the ${shifted} values greater than it each shift`) +
        ' one place right to make room.',
    explain: k => {
      if (k > p) {
        return `Not quite. ${values[k - 1]} at index ${k - 1} is greater than key (${key}), so it shifts ` +
               'right and key has to go further left.';
      }
      return values[p - 1] === key
        ? `Not quite. ${values[p - 1]} at index ${p - 1} is equal to key (${key}). The loop only shifts ` +
          `values greater than key, so key stops right after it, at index ${p}.`
        : `Not quite. ${values[p - 1]} at index ${p - 1} is smaller than key (${key}), so the shifting ` +
          `stops there and key goes right after it, at index ${p}.`;
    }
  });
}

function insertionCost(n, valueTerms) {
  return `Value by value: ${valueTerms.join(' + ')} = ${sum(valueTerms)}. Each value is compared until ` +
         `it finds its place, so the total goes from n − 1 = ${n - 1} (already sorted) up to ` +
         `n(n − 1)/2 = ${maxComparisons(n)} (reversed).`;
}

const INSERTION_CODE = { cond: 'j >= 0 && a[j] > key', shift: 'a[j + 1] = a[j];', place: 'a[j + 1] = key;' };

// guard: whether j is checked before or after a[j] is read; lowest: smallest j the guard allows.
const INSERTION_CONDITIONS = {
  'j >= 0 && a[j] > key': { guard: 'before', lowest: 0, rel: '>' },
  'a[j] > key && j >= 0': { guard: 'after', lowest: 0, rel: '>' },
  'j > 0 && a[j] > key': { guard: 'before', lowest: 1, rel: '>' },
  'j >= 0 && a[j] >= key': { guard: 'before', lowest: 0, rel: '>=' }
};

function insertionSteps(values, code = INSERTION_CODE) {
  const exact = sameCode(code, INSERTION_CODE);
  const r = new Recorder(values);
  const a = r.a;
  const n = a.length;
  const condition = INSERTION_CONDITIONS[code.cond];
  const rel = RELATIONS[condition.rel];
  const valueTerms = [];

  r.add({
    lines: [2], phase: 'Start', sorted: exact ? [0] : [], vars: { n },
    text: 'Insertion sort takes one value at a time and inserts it into the sorted part on its left.'
  });

  for (let i = 1; i < n; i++) {
    r.pass = i;
    const key = a[i];
    const keyId = r.ids[i];
    let j = i - 1;
    let stopped = false;
    const sorted = exact ? range(0, i) : [];
    const before = r.comparisons;

    r.add({
      lines: [3, 4, 5], phase: `Pass ${i}: taking ${key}`, current: i, held: key, sorted,
      pointers: { i, j }, vars: { n, i, key, j },
      text: exact
        ? `Hold ${key} aside as key. The first ${i} value(s) are sorted among themselves, ` +
          `and ${key} will be inserted among them.`
        : `Hold ${key} aside as key.`,
      question: exact ? insertionGapQuestion(a, i) : null
    });

    while (!(condition.guard === 'before' && j < condition.lowest)) {
      if (!r.has(j)) {
        return r.crash({
          lines: [6], held: key, sorted, pointers: { i, j }, vars: { n, i, key, j },
          text: `j is ${j}, and the condition reads a[j] before checking j >= 0: a[${j}] is outside the array. ` +
                OUT_OF_BOUNDS
        });
      }

      r.comparisons++;
      const here = a[j];

      r.add({
        lines: [6], phase: 'Comparing', compare: [j], held: key, sorted,
        pointers: { i, j }, vars: { n, i, key, j },
        text: `Is ${here} ${rel.words} ${key}?`
      });

      if (!rel.test(here, key)) {
        r.add({
          lines: [6], phase: 'Stop', same: [j], held: key, sorted,
          pointers: { i, j }, vars: { n, i, key, j },
          text: `No. ${here} ${rel.no} ${key}, so the loop stops.`
        });
        stopped = true;
        break;
      }

      if (code.shift === INSERTION_CODE.shift) {
        r.copy(j, j + 1);
        r.moves++;
        j--;
        r.add({
          lines: [7, 8], phase: 'Shift right', moved: [j + 2], held: key, sorted,
          pointers: { i, j }, vars: { n, i, key, j },
          text: `Yes. ${here} slides from index ${j + 1} to ${j + 2}. j is now ${j}.`
        });
      } else {
        r.copy(j + 1, j);
        r.moves++;
        j--;
        r.add({
          lines: [7, 8], phase: 'Copy', moved: [j + 1], held: key, sorted,
          pointers: { i, j }, vars: { n, i, key, j },
          text: `Yes. a[j] = a[j + 1] copies ${a[j + 1]} into index ${j + 1}, overwriting ${here}. j is now ${j}.`
        });
      }
    }

    if (!stopped) {
      r.add({
        lines: [6], phase: 'Left end', held: key, sorted,
        pointers: { i, j }, vars: { n, i, key, j },
        text: exact
          ? `j is -1, so the loop stops: ${key} is smaller than everything sorted so far.`
          : (j < 0 ? 'j is -1, so j >= 0 is false and the loop stops.'
                   : `j is ${j}, so j > 0 is false and the loop stops without comparing a[0].`)
      });
    }

    if (code.place === INSERTION_CODE.place) {
      r.put(j + 1, key, keyId);
      valueTerms.push(r.comparisons - before);
      r.add({
        lines: [10], phase: 'Placed', moved: [j + 1], sorted: exact ? range(0, i + 1) : [], endOfPass: true,
        pointers: { i, j }, vars: { n, i, key, j },
        text: exact
          ? `${key} drops into index ${j + 1}. The first ${i + 1} values are sorted among ` +
            'themselves, but any of them may still shift later.'
          : `${key} is written into index ${j + 1}.`
      });
    } else {
      const target = code.place === 'a[j] = key;' ? j : i;
      if (!r.has(target)) {
        return r.crash({
          lines: [10], held: key, pointers: { i, j }, vars: { n, i, key, j },
          text: `j is ${j}, so a[j] = key writes to a[${j}], outside the array. ${OUT_OF_BOUNDS}`
        });
      }
      const lost = a[target];
      r.put(target, key, keyId);
      r.add({
        lines: [10], phase: 'Placed', moved: [target], endOfPass: true,
        pointers: { i, j }, vars: { n, i, key, j },
        text: `${code.place.slice(0, -1)} writes ${key} into index ${target}` +
              (lost === key ? '.' : `, overwriting ${lost}.`)
      });
    }
  }

  if (!exact) { return r.finishVariant('shift'); }

  r.finish({
    final: range(0, n),
    text: `Sorted with ${plural(r.comparisons, 'comparison')} and ${plural(r.moves, 'shift')}. ` +
          insertionCost(n, valueTerms)
  });

  r.steps[0].question = comparisonPrediction({
    name: 'insertion sort', n, total: r.comparisons,
    bestCase: `n − 1 = ${n - 1} is the best case: one comparison per value, ` +
              'which only happens when the array is already sorted.'
  });
  return r.steps;
}

/* ==========================================================================
   Algorithms
   To add an algorithm: write its step generator and register it here.
   In the code, {name} marks a fragment that a complete-the-code challenge
   can replace; `defaults` holds the correct fragments. Each challenge offers
   the correct fragment and typical mistakes. `breaks` marks a mistake that can
   give a wrong result (otherwise it only costs extra work), and `tryWith`
   names a preset array that exposes the mistake.
   ========================================================================== */

const ALGORITHMS = {
  bubble: {
    movesLabel: 'Swaps',
    buildSteps: bubbleSteps,
    defaults: BUBBLE_CODE,
    legend: ['compare', 'moved', 'same', 'final'],
    code: [
      'void bubbleSort(std::vector<int>& a) {',
      '    int n = a.size();',
      '    bool swapped = {init};',
      '    for (int i = 0; i < n - 1 && swapped; i++) {',
      '        swapped = false;',
      '        for (int j = 0; j < {bound}; j++) {',
      '            if ({cond}) {',
      '                std::swap(a[j], a[j + 1]);',
      '                swapped = true;',
      '            }',
      '        }',
      '    }',
      '}'
    ],
    challenges: [
      {
        blank: 'bound',
        options: [
          { code: 'n - i', breaks: true, tryWith: 'reversed',
            explain: 'j can reach n - 1 - i, so in the first pass a[j + 1] is a[n], one place past the end of the array.' },
          { code: 'n - 1 - i',
            explain: 'j + 1 must stay inside the unsorted part. After pass i, the last i values are final, ' +
                     'so j stops before n - 1 - i.' },
          { code: 'n - 1', tryWith: 'reversed',
            explain: 'It sorts, but every pass also compares the values that are already final at the end. ' +
                     'Those comparisons can never swap anything, so they are wasted work.' },
          { code: 'n - 2 - i', breaks: true, tryWith: 'reversed',
            explain: 'The loop stops one pair too early: the last pair of each pass is never compared, ' +
                     'so the value at the end of the array never moves.' }
        ]
      },
      {
        blank: 'cond',
        options: [
          { code: 'a[j] >= a[j + 1]', tryWith: 'with duplicates',
            explain: 'It also swaps equal neighbours: extra swaps, equal values change order, and a pass ' +
                     'with equal neighbours always sets swapped, so the early stop may never come.' },
          { code: 'a[j] > a[j + 1]',
            explain: 'Only neighbours that are out of order swap. Equal values stay in place, so their order is kept.' },
          { code: 'a[j] < a[j + 1]', breaks: true, tryWith: 'already sorted',
            explain: 'This swaps pairs that are already in order, so each pass carries the smallest value ' +
                     'to the end instead of the largest.' }
        ]
      },
      {
        blank: 'init',
        options: [
          { code: 'false', breaks: true, tryWith: 'reversed',
            explain: 'The loop condition is i < n - 1 && swapped. With swapped = false it is already false ' +
                     'before the first pass, so the loop never runs.' },
          { code: 'true',
            explain: 'swapped starts true only so that the first pass can begin. Each pass resets it to false, ' +
                     'and only a swap sets it back to true.' }
        ]
      }
    ]
  },
  selection: {
    movesLabel: 'Swaps',
    buildSteps: selectionSteps,
    defaults: SELECTION_CODE,
    legend: ['compare', 'moved', 'same', 'current', 'final'],
    currentLabel: 'current minimum',
    code: [
      'void selectionSort(std::vector<int>& a) {',
      '    int n = a.size();',
      '    for (int i = 0; i < n - 1; i++) {',
      '        int minIndex = i;',
      '        for (int j = {start}; j < n; j++) {',
      '            if ({cond}) {',
      '                minIndex = j;',
      '            }',
      '        }',
      '        if (minIndex != i) {',
      '            {swap}',
      '        }',
      '    }',
      '}'
    ],
    challenges: [
      {
        blank: 'start',
        options: [
          { code: 'i', tryWith: 'reversed',
            explain: 'It sorts, but minIndex starts at i, so each pass first compares a[i] with itself: ' +
                     'one wasted comparison per pass.' },
          { code: 'i + 1',
            explain: 'minIndex already starts at i, so the scan only needs the values after it.' },
          { code: '0', breaks: true, tryWith: 'reversed',
            explain: 'The scan also looks at the values already placed at the front. They are never larger, ' +
                     'so minIndex can point back into the sorted part and the swap pulls a placed value out of position.' }
        ]
      },
      {
        blank: 'cond',
        options: [
          { code: 'a[j] < a[i]', breaks: true, tryWith: 'with duplicates',
            explain: 'This compares each value with a[i], the value at the start of the pass, not with the ' +
                     'smallest found so far. minIndex ends at the last value smaller than a[i], ' +
                     'which is not always the minimum.' },
          { code: 'a[j] <= a[minIndex]', tryWith: 'with duplicates',
            explain: 'Among equal values it picks the last copy instead of the first, so minIndex changes ' +
                     'more often and equal values can end up in a different order.' },
          { code: 'a[j] < a[minIndex]',
            explain: 'Each value is compared with the smallest found so far, and only a strictly smaller one replaces it.' },
          { code: 'a[j] > a[minIndex]', breaks: true, tryWith: 'already sorted',
            explain: 'This looks for the largest value instead of the smallest, so each pass puts the ' +
                     'largest value left at index i.' }
        ]
      },
      {
        blank: 'swap',
        options: [
          { code: 'a[i] = a[minIndex];', breaks: true, tryWith: 'reversed',
            explain: 'This copies the minimum into index i but never puts the old a[i] anywhere else, ' +
                     'so that value is lost and the minimum is duplicated instead of moved.' },
          { code: 'std::swap(a[i], a[minIndex]);',
            explain: 'The two values trade places, so nothing is lost: the minimum moves to index i ' +
                     'and the old a[i] takes its place.' },
          { code: 'a[minIndex] = a[i];', breaks: true, tryWith: 'reversed',
            explain: 'This copies a[i] over the minimum, so the minimum is lost and a[i] is duplicated instead of moved.' }
        ]
      }
    ]
  },
  insertion: {
    movesLabel: 'Shifts',
    buildSteps: insertionSteps,
    defaults: INSERTION_CODE,
    legend: ['compare', 'moved', 'same', 'current', 'sorted', 'final'],
    currentLabel: 'value being placed (key)',
    code: [
      'void insertionSort(std::vector<int>& a) {',
      '    int n = a.size();',
      '    for (int i = 1; i < n; i++) {',
      '        int key = a[i];',
      '        int j = i - 1;',
      '        while ({cond}) {',
      '            {shift}',
      '            j--;',
      '        }',
      '        {place}',
      '    }',
      '}'
    ],
    challenges: [
      {
        blank: 'cond',
        options: [
          { code: 'a[j] > key && j >= 0', breaks: true, tryWith: 'reversed',
            explain: 'Same test, wrong order. && checks its left side first, so when j reaches -1, a[-1] is ' +
                     'read before j >= 0 is checked. That happens whenever key is smaller than everything to its left.' },
          { code: 'j >= 0 && a[j] > key',
            explain: 'j >= 0 comes first, and && stops at the first false part, so a[j] is only read while j ' +
                     'is a valid index. Values equal to key are not shifted, so their order is kept.' },
          { code: 'j > 0 && a[j] > key', breaks: true, tryWith: 'reversed',
            explain: 'j > 0 stops the loop before a[0] is ever compared, so a value smaller than a[0] ' +
                     'is placed after it.' },
          { code: 'j >= 0 && a[j] >= key', tryWith: 'with duplicates',
            explain: 'It also shifts values equal to key: extra shifts, and key moves in front of its equal ' +
                     'copies, so equal values change order.' }
        ]
      },
      {
        blank: 'shift',
        options: [
          { code: 'a[j + 1] = a[j];',
            explain: 'Each greater value is copied one place right, into the gap. key was saved before the ' +
                     'loop, so its old position can be overwritten.' },
          { code: 'a[j] = a[j + 1];', breaks: true, tryWith: 'reversed',
            explain: 'This copies in the wrong direction: the value on the right overwrites the greater ' +
                     'value on the left, so values are lost.' }
        ]
      },
      {
        blank: 'place',
        options: [
          { code: 'a[j] = key;', breaks: true, tryWith: 'reversed',
            explain: 'When the loop stops, j points at the value that stopped it, or at -1, not at the gap. ' +
                     'Writing there overwrites a value, or writes to a[-1], outside the array.' },
          { code: 'a[i] = key;', breaks: true, tryWith: 'reversed',
            explain: 'This puts key back where it started instead of into the gap at j + 1, so the shifted ' +
                     'values leave a copy behind in the gap.' },
          { code: 'a[j + 1] = key;',
            explain: 'When the loop stops, j is the index of the first value not greater than key, or -1, ' +
                     'so the gap is right after it, at j + 1.' }
        ]
      }
    ]
  }
};

function fillCode(line, code) {
  return line.replace(/\{(\w+)\}/g, (match, name) => code[name]);
}

/* ==========================================================================
   Input
   ========================================================================== */

const DEFAULT_ARRAY = '42, 17, 5, 30, 8, 29, 3, 15';
const MIN_LENGTH = 3;
const MAX_LENGTH = 12;
const MAX_ABS_VALUE = 999;

function parseArray(text) {
  const pieces = text.split(/[\s,]+/).filter(Boolean);
  const values = [];

  for (const piece of pieces) {
    if (!/^-?\d+$/.test(piece)) {
      return { error: `"${piece}" is not a whole number.` };
    }
    const value = Number(piece);
    if (Math.abs(value) > MAX_ABS_VALUE) {
      return { error: `Use numbers between -${MAX_ABS_VALUE} and ${MAX_ABS_VALUE}.` };
    }
    values.push(value);
  }

  if (values.length < MIN_LENGTH) { return { error: `Give at least ${MIN_LENGTH} numbers.` }; }
  if (values.length > MAX_LENGTH) { return { error: `Use ${MAX_LENGTH} numbers at most, so they fit on screen.` }; }
  return { values };
}

/* ==========================================================================
   Player
   Moves through the steps of the selected algorithm. It knows nothing about
   sorting: only steps, passes and the three modes. Questions and scoring
   are delegated to Practice, code challenges to Challenge.
   ========================================================================== */

const state = {
  algorithm: 'bubble',
  mode: 'explore',      // explore, play (play the algorithm) or code (complete the code)
  values: parseArray(DEFAULT_ARRAY).values,
  challenge: 0,         // index of the code challenge
  choice: null,         // option chosen for the blank, or null
  steps: [],
  at: 0,
  practice: Practice.createSession(),
  feedback: null
};

function currentStep() {
  return state.steps[state.at];
}

function currentChallenge() {
  return ALGORITHMS[state.algorithm].challenges[state.challenge];
}

function chosenOption() {
  return state.mode === 'code' && state.choice !== null ? currentChallenge().options[state.choice] : null;
}

// The code that runs: the correct code, with the chosen fragment in code mode.
function currentCode() {
  const algorithm = ALGORITHMS[state.algorithm];
  const option = chosenOption();
  return option ? { ...algorithm.defaults, [currentChallenge().blank]: option.code } : algorithm.defaults;
}

function isLast(index) {
  return index === state.steps.length - 1;
}

function isBlocked(index) {
  if (state.mode === 'play') { return Practice.isOpen(state.practice, state.steps[index], index); }
  if (state.mode === 'code') { return state.choice === null; }
  return false;
}

function resetPractice() {
  state.practice = Practice.createSession();
  state.feedback = null;
}

function rebuild() {
  state.steps = ALGORITHMS[state.algorithm].buildSteps(state.values, currentCode());
  state.at = 0;
  resetPractice();
  renderCode();
  renderLegend();
  render();
}

function codeVerdict() {
  const algorithm = ALGORITHMS[state.algorithm];
  const option = chosenOption();
  const reference = algorithm.buildSteps(state.values, algorithm.defaults);
  return Challenge.verdict({
    option,
    correct: option.code === algorithm.defaults[currentChallenge().blank],
    original: state.values,
    run: currentStep(),
    reference: reference[reference.length - 1],
    moveWord: algorithm.movesLabel.toLowerCase().slice(0, -1)
  });
}

function go(index, feedback = null) {
  state.at = Math.max(0, Math.min(state.steps.length - 1, index));
  state.feedback = feedback;
  if (currentStep().done && state.mode === 'play') {
    state.feedback = Practice.settle(state.practice) || feedback;
  }
  if (currentStep().done && chosenOption()) {
    state.feedback = codeVerdict();
  }
  render();
}

function next() {
  if (isLast(state.at) || isBlocked(state.at)) { return; }
  go(state.at + 1);
}

function back() {
  go(state.at - 1);
}

function finishPass() {
  if (isLast(state.at) || isBlocked(state.at)) { return; }
  let k = state.at + 1;
  while (!isLast(k) && !state.steps[k].endOfPass && !isBlocked(k)) { k++; }
  go(k);
}

function reset() {
  resetPractice();
  go(0);
}

function answer(value) {
  if (!isBlocked(state.at)) { return; }
  const result = Practice.submit(state.practice, currentStep(), state.at, value);
  if (result.advance) {
    go(state.at + 1, result.feedback);
  } else {
    state.feedback = result.feedback;
    render();
  }
}

function runningNote() {
  return { good: null, text: `Running the code with ${chosenOption().code}. Step through it to see what happens.` };
}

function choose(index) {
  state.choice = index;
  rebuild();
  state.feedback = runningNote();
  render();
}

function retry() {
  state.choice = null;
  rebuild();
}

function moveChallenge(offset) {
  const count = ALGORITHMS[state.algorithm].challenges.length;
  state.challenge = (state.challenge + offset + count) % count;
  state.choice = null;
  rebuild();
}

function setAlgorithm(name) {
  if (name === state.algorithm) { return; }
  state.algorithm = name;
  state.challenge = 0;
  state.choice = null;
  rebuild();
}

function setMode(mode) {
  if (mode === state.mode) { return; }
  state.mode = mode;
  state.challenge = 0;
  state.choice = null;
  rebuild();
}

function applyInput(text) {
  const result = parseArray(text);
  ui.inputError.textContent = result.error || '';
  if (result.error) { return; }
  state.values = result.values;
  rebuild();
  if (chosenOption()) {
    state.feedback = runningNote();
    render();
  }
}

/* ==========================================================================
   Render
   ========================================================================== */

const ui = {
  tabs: document.querySelectorAll('[data-algorithm]'),
  modeSelect: document.getElementById('modeSelect'),
  challengeBar: document.getElementById('challenge'),
  challengeTitle: document.getElementById('challengeTitle'),
  challengePrev: document.getElementById('challengePrev'),
  challengeNext: document.getElementById('challengeNext'),
  retryButton: document.getElementById('retryButton'),
  form: document.getElementById('arrayForm'),
  input: document.getElementById('arrayInput'),
  inputError: document.getElementById('inputError'),
  defaultButton: document.getElementById('defaultButton'),
  presets: document.querySelectorAll('[data-preset]'),
  held: document.getElementById('held'),
  heldValue: document.getElementById('heldValue'),
  array: document.getElementById('array'),
  pointers: document.getElementById('pointers'),
  phase: document.getElementById('phase'),
  status: document.getElementById('status'),
  question: document.getElementById('question'),
  questionPrompt: document.getElementById('questionPrompt'),
  questionActions: document.getElementById('questionActions'),
  questionCode: document.getElementById('questionCode'),
  feedback: document.getElementById('feedback'),
  passValue: document.getElementById('passValue'),
  comparisonsValue: document.getElementById('comparisonsValue'),
  movesLabel: document.getElementById('movesLabel'),
  movesValue: document.getElementById('movesValue'),
  score: document.getElementById('score'),
  correctValue: document.getElementById('correctValue'),
  mistakesValue: document.getElementById('mistakesValue'),
  backButton: document.getElementById('backButton'),
  nextButton: document.getElementById('nextButton'),
  passButton: document.getElementById('passButton'),
  resetButton: document.getElementById('resetButton'),
  code: document.getElementById('code'),
  variables: document.getElementById('variables'),
  legendItems: document.querySelectorAll('[data-legend]')
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) { node.className = className; }
  if (text !== undefined) { node.textContent = text; }
  return node;
}

const TOKEN = /(std::\w+|\b(?:void|int|bool|for|if|while|break|true|false)\b|\b\d+\b)/;

function highlightLine(line) {
  const fragment = document.createDocumentFragment();
  line.split(TOKEN).forEach((piece, index) => {
    if (!piece) { return; }
    if (index % 2 === 0) {
      fragment.append(piece);
    } else if (piece.startsWith('std::')) {
      fragment.append(element('span', 'tok-library', piece));
    } else if (/^\d/.test(piece)) {
      fragment.append(element('span', 'tok-number', piece));
    } else {
      fragment.append(element('span', 'tok-keyword', piece));
    }
  });
  return fragment;
}

function renderLegend() {
  const algorithm = ALGORITHMS[state.algorithm];
  ui.legendItems.forEach(item => {
    const key = item.dataset.legend;
    item.hidden = !algorithm.legend.includes(key);
    if (key === 'current' && algorithm.currentLabel) {
      item.querySelector('.legend-label').textContent = algorithm.currentLabel;
    }
  });
}

// In code mode the challenge's fragment is drawn as a blank, or as the chosen option.
function renderCode() {
  const code = currentCode();
  const blank = state.mode === 'code' ? currentChallenge().blank : null;
  ui.code.replaceChildren();

  ALGORITHMS[state.algorithm].code.forEach((line, index) => {
    const row = element('span', 'line');
    row.dataset.line = String(index + 1);
    line.split(/\{(\w+)\}/).forEach((piece, k) => {
      if (k % 2 === 0) {
        row.append(highlightLine(piece));
      } else if (piece === blank) {
        const chip = element('span', 'blank');
        if (state.choice === null) {
          chip.textContent = '____';
        } else {
          chip.classList.add('is-filled');
          chip.append(highlightLine(code[piece]));
        }
        row.append(chip);
      } else {
        row.append(highlightLine(code[piece]));
      }
    });
    row.append('\n');
    ui.code.append(row);
  });
}

function blankLine() {
  const blank = `{${currentChallenge().blank}}`;
  return ALGORITHMS[state.algorithm].code.findIndex(line => line.includes(blank)) + 1;
}

// The line with the blank, shown in the question so it is visible without scrolling.
function blankPreview() {
  const algorithm = ALGORITHMS[state.algorithm];
  const line = algorithm.code[blankLine() - 1].trim();
  const [before, after] = line.split(`{${currentChallenge().blank}}`);
  const preview = document.createDocumentFragment();
  preview.append(highlightLine(fillCode(before, algorithm.defaults)), element('span', 'blank', '____'),
                 highlightLine(fillCode(after, algorithm.defaults)));
  return preview;
}

function renderChallenge() {
  const count = ALGORITHMS[state.algorithm].challenges.length;
  ui.challengeBar.hidden = state.mode !== 'code';
  ui.challengeTitle.textContent = `Complete the code · ${state.challenge + 1} of ${count}`;
  ui.retryButton.hidden = state.choice === null;
}

function renderArray(step) {
  const n = step.array.length;
  const chars = Math.max(2, ...step.array.map(value => String(value).length));
  for (const row of [ui.array, ui.pointers]) {
    row.style.setProperty('--count', n);
    row.style.setProperty('--chars', chars);
  }

  const cells = step.array.map((value, k) => {
    const cell = element('div', 'cell');
    cell.classList.toggle('final', step.final.includes(k));
    cell.classList.toggle('sorted', step.sorted.includes(k));
    cell.classList.toggle('current', step.current === k);
    cell.classList.toggle('same', step.same.includes(k));
    cell.classList.toggle('moved', step.moved.includes(k));
    cell.classList.toggle('compare', step.compare.includes(k));
    cell.append(element('span', 'index', String(k)), element('span', 'value', String(value)));
    return cell;
  });
  ui.array.replaceChildren(...cells);

  const slots = step.array.map(() => element('div', 'slot'));
  for (const [name, index] of Object.entries(step.pointers)) {
    if (index >= 0 && index < n) {
      slots[index].append(element('span', 'pointer', name));
    }
  }
  ui.pointers.replaceChildren(...slots);
}

function renderVariables(step) {
  const items = Object.entries(step.vars).map(([name, value]) => {
    const item = element('div', 'variable');
    item.append(element('dt', '', name), element('dd', '', String(value)));
    return item;
  });
  ui.variables.replaceChildren(...items);
}

function render() {
  const step = currentStep();
  const blocked = isBlocked(state.at);

  ui.tabs.forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.algorithm === state.algorithm)));
  ui.modeSelect.value = state.mode;
  renderChallenge();

  ui.held.hidden = state.algorithm !== 'insertion';
  ui.held.classList.toggle('is-empty', step.held === null);
  ui.heldValue.textContent = step.held === null ? '' : String(step.held);

  renderArray(step);

  ui.phase.textContent = step.phase;
  ui.status.textContent = step.text;
  ui.status.className = 'status';
  if (step.compare.length) { ui.status.classList.add('is-compare'); }
  if (step.moved.length) { ui.status.classList.add('is-moved'); }
  if (step.same.length) { ui.status.classList.add('is-same'); }
  if (step.endOfPass || (step.done && step.final.length)) { ui.status.classList.add('is-pass'); }
  if (step.done && !step.final.length) { ui.status.classList.add(step.crash ? 'is-crash' : 'is-same'); }
  ui.status.hidden = blocked;

  ui.question.hidden = !blocked;
  ui.array.classList.remove('is-pair');
  if (blocked && state.mode === 'play') {
    ui.questionPrompt.textContent = step.question.prompt;
    Practice.attach(step.question, { array: ui.array, actions: ui.questionActions }, answer);
  }
  ui.questionCode.hidden = !(blocked && state.mode === 'code');
  if (blocked && state.mode === 'code') {
    ui.questionPrompt.textContent = `Line ${blankLine()} has a blank. Which code completes it?`;
    ui.questionCode.replaceChildren(blankPreview());
    Challenge.attach(currentChallenge(), ui.questionActions, choose);
  }

  ui.feedback.hidden = state.feedback === null;
  ui.feedback.textContent = state.feedback ? state.feedback.text : '';
  ui.feedback.className = 'feedback' +
    (state.feedback && state.feedback.good === false ? ' is-wrong' : '') +
    (state.feedback && state.feedback.good === null ? ' is-note' : '');

  ui.passValue.textContent = String(step.pass);
  ui.comparisonsValue.textContent = String(step.comparisons);
  ui.movesLabel.textContent = ALGORITHMS[state.algorithm].movesLabel;
  ui.movesValue.textContent = String(step.moves);
  ui.score.hidden = state.mode !== 'play';
  ui.correctValue.textContent = String(state.practice.correct);
  ui.mistakesValue.textContent = String(state.practice.mistakes);

  ui.code.querySelectorAll('.line').forEach(row => {
    row.classList.toggle('active', step.lines.includes(Number(row.dataset.line)));
  });
  renderVariables(step);

  ui.backButton.disabled = state.at === 0;
  ui.nextButton.disabled = isLast(state.at) || blocked;
  ui.passButton.disabled = isLast(state.at) || blocked;
}

/* ==========================================================================
   Events
   ========================================================================== */

ui.tabs.forEach(tab => tab.addEventListener('click', () => setAlgorithm(tab.dataset.algorithm)));
ui.modeSelect.addEventListener('change', () => setMode(ui.modeSelect.value));
ui.challengePrev.addEventListener('click', () => moveChallenge(-1));
ui.challengeNext.addEventListener('click', () => moveChallenge(1));
ui.retryButton.addEventListener('click', retry);

ui.form.addEventListener('submit', event => {
  event.preventDefault();
  applyInput(ui.input.value);
});

ui.defaultButton.addEventListener('click', () => {
  ui.input.value = DEFAULT_ARRAY;
  applyInput(DEFAULT_ARRAY);
});

ui.presets.forEach(preset => preset.addEventListener('click', () => {
  ui.input.value = preset.dataset.preset;
  applyInput(preset.dataset.preset);
}));

ui.backButton.addEventListener('click', back);
ui.nextButton.addEventListener('click', next);
ui.passButton.addEventListener('click', finishPass);
ui.resetButton.addEventListener('click', reset);

const KEYS = {
  ArrowRight: next,
  ' ': next,
  ArrowLeft: back,
  Enter: finishPass
};

document.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey) { return; }
  if (event.target.closest('input')) { return; }
  if (event.target.closest('button, [role="button"]') && (event.key === 'Enter' || event.key === ' ')) { return; }

  const action = KEYS[event.key];
  if (!action) { return; }
  event.preventDefault();
  action();
});

ui.input.value = DEFAULT_ARRAY;
rebuild();
