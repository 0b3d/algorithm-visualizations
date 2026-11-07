'use strict';

/* ==========================================================================
   Complete the code
   One fragment of the C++ code is left blank. The student picks a fragment,
   the algorithm runs with it, and the verdict compares that run with the
   run of the correct code: out of bounds, values lost, wrong order, or
   sorted with a different amount of work. A mistake that can break the
   result but happened to sort this array is reported as luck.
   ========================================================================== */

const Challenge = (() => {

  function count(n, word) {
    return `${n} ${word}${n === 1 ? '' : 's'}`;
  }

  function ascending(values) {
    return values.every((value, k) => k === 0 || values[k - 1] <= value);
  }

  function descending(values) {
    return values.every((value, k) => k === 0 || values[k - 1] >= value);
  }

  function sameValues(x, y) {
    const sorted = values => [...values].sort((p, q) => p - q).join();
    return sorted(x) === sorted(y);
  }

  function show(values) {
    return `[${values.join(', ')}]`;
  }

  // run and reference are the last steps of the chosen code and of the correct code.
  function verdict({ option, correct, original, run, reference, moveWord }) {
    const end = run.array;
    const unchanged = end.join() === original.join();
    let outcome;

    if (run.crash) {
      outcome = 'Out of bounds.';
    } else if (!sameValues(end, original)) {
      outcome = `Values were lost: the array went from ${show(original)} to ${show(end)}.`;
    } else if (!ascending(end)) {
      const k = end.findIndex((value, index) => value > end[index + 1]);
      if (unchanged) {
        outcome = 'Nothing changed: the array is still unsorted.';
      } else if (descending(end)) {
        outcome = 'The array ended up sorted from largest to smallest.';
      } else {
        outcome = `Not sorted: ${end[k]} at index ${k} is greater than ${end[k + 1]} at index ${k + 1}.`;
      }
    } else {
      const extra = [];
      if (run.comparisons !== reference.comparisons) {
        extra.push(`${count(run.comparisons, 'comparison')} instead of ${reference.comparisons}`);
      }
      if (run.moves !== reference.moves) {
        extra.push(`${count(run.moves, moveWord)} instead of ${reference.moves}`);
      }
      const reordered = run.ids.join() !== reference.ids.join();

      const alreadySorted = unchanged && ascending(original);
      const lucky = `It sorted this array, but only because this array does not trigger the problem. ` +
                    `Try "${option.tryWith}".`;

      if (correct) {
        outcome = 'Correct.';
      } else if (alreadySorted && (option.breaks || run.comparisons === 0)) {
        outcome = `The array was already sorted, so this run proves nothing. Try "${option.tryWith}".`;
      } else if (option.breaks) {
        outcome = lucky;
      } else if (extra.length) {
        outcome = `Sorted, but with ${extra.join(' and ')}.` +
                  (reordered ? ' Equal values also ended in a different order.' : '');
      } else if (reordered) {
        outcome = 'Sorted, but equal values ended in a different order than with the correct code.';
      } else if (alreadySorted) {
        outcome = `The array was already sorted, so this run proves nothing. Try "${option.tryWith}".`;
      } else {
        outcome = lucky;
      }
    }

    return { good: correct, text: `${outcome} ${option.explain}` };
  }

  function attach(challenge, actions, onChoose) {
    actions.replaceChildren();
    challenge.options.forEach((option, k) => {
      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'ghost code-option';
      node.textContent = option.code;
      node.addEventListener('click', () => onChoose(k));
      actions.append(node);
    });
  }

  return { verdict, attach };
})();
