'use strict';

/* ==========================================================================
   Practice
   In practice mode the student answers before a step is revealed: by clicking
   a cell, the gap where a value goes, or one of several options. The step
   generators attach the questions; this file checks the answers, keeps the
   score and draws the answer controls.
   ========================================================================== */

const Practice = (() => {

  /* Questions --------------------------------------------------------------
     Every question has a prompt, the right answer, a short confirmation for
     a right answer (praise) and explain(value), which says why a wrong
     answer is wrong. "advance" moves to the next step after a right answer;
     otherwise the step stays so its own explanation can be read. */

  // Click one of the candidate cells. The answer is a cell index.
  function pickCell({ prompt, candidates, answer, praise, explain }) {
    return { kind: 'cell', prompt, candidates, answer, praise, explain, advance: false };
  }

  // Click the gap where a value belongs. Gap k means "ends at index k".
  function pickGap({ prompt, candidates, answer, praise, explain }) {
    return { kind: 'gap', prompt, candidates, answer, praise, explain, advance: false };
  }

  // Click the highlighted pair to swap it (true) or press Keep (false).
  function swapOrKeep({ prompt, pair, answer, praise, explain }) {
    return { kind: 'swap', prompt, candidates: pair, answer, praise, explain, advance: true };
  }

  // Choose an option now; it is checked when the last step is reached.
  function prediction({ prompt, options, answer, praise, explain }) {
    return { kind: 'choice', prompt, options, answer, praise, explain, advance: false, deferred: true };
  }

  /* Session ---------------------------------------------------------------- */

  function createSession() {
    return { answered: new Set(), correct: 0, mistakes: 0, prediction: null };
  }

  function isOpen(session, step, index) {
    return step.question !== null && !session.answered.has(index);
  }

  // Returns whether to move on and the feedback to show.
  function submit(session, step, index, value) {
    const question = step.question;

    if (question.deferred) {
      session.answered.add(index);
      session.prediction = { question, value, result: null };
      return {
        advance: question.advance,
        feedback: { good: true, text: `Prediction saved: ${value}. It is checked on the last step.` }
      };
    }

    if (value === question.answer) {
      session.answered.add(index);
      session.correct++;
      return { advance: question.advance, feedback: { good: true, text: question.praise } };
    }

    session.mistakes++;
    return { advance: false, feedback: { good: false, text: question.explain(value) } };
  }

  // Scores the prediction the first time the last step is reached.
  function settle(session) {
    const saved = session.prediction;
    if (!saved) { return null; }

    if (!saved.result) {
      const good = saved.value === saved.question.answer;
      if (good) { session.correct++; } else { session.mistakes++; }
      saved.result = { good, text: good ? saved.question.praise : saved.question.explain(saved.value) };
    }
    return saved.result;
  }

  /* Answer controls -------------------------------------------------------- */

  function button(className, text, onClick) {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = className;
    node.textContent = text;
    node.addEventListener('click', onClick);
    return node;
  }

  function makeClickable(cell, label, onClick) {
    cell.classList.add('is-option');
    cell.setAttribute('role', 'button');
    cell.setAttribute('tabindex', '0');
    cell.setAttribute('aria-label', label);
    cell.addEventListener('click', onClick);
    cell.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') { return; }
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
  }

  // Draws the controls for a question on the array and in the question box.
  function attach(question, { array, actions }, onAnswer) {
    const cells = Array.from(array.querySelectorAll('.cell'));
    const values = cells.map(cell => cell.querySelector('.value').textContent);
    actions.replaceChildren();
    array.classList.toggle('is-pair', question.kind === 'swap');

    if (question.kind === 'cell') {
      cells.forEach((cell, k) => cell.classList.toggle('is-inactive', !question.candidates.includes(k)));
      question.candidates.forEach(k => {
        makeClickable(cells[k], `${values[k]}, index ${k}`, () => onAnswer(k));
      });
    }

    if (question.kind === 'gap') {
      const last = Math.max(...question.candidates);
      cells.forEach((cell, k) => cell.classList.toggle('is-inactive', k > last));
      question.candidates.forEach(k => {
        const marker = button('gap-marker', '', () => onAnswer(k));
        marker.style.setProperty('--slot', k);
        marker.setAttribute('aria-label', `Insert at index ${k}`);
        marker.title = `Index ${k}`;
        array.append(marker);
      });
    }

    if (question.kind === 'swap') {
      const [left, right] = question.candidates;
      const label = `Swap ${values[left]} and ${values[right]}`;
      question.candidates.forEach(k => makeClickable(cells[k], label, () => onAnswer(true)));
      actions.append(button('ghost', 'Keep', () => onAnswer(false)));
    }

    if (question.kind === 'choice') {
      question.options.forEach(option => {
        actions.append(button('ghost', String(option), () => onAnswer(option)));
      });
    }
  }

  return { pickCell, pickGap, swapOrKeep, prediction, createSession, isOpen, submit, settle, attach };
})();
