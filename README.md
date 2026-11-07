# Algorithm Visualizations

Interactive, step-by-step visualizations of classic algorithms, built with plain
HTML, CSS and JavaScript. Each visualization is a standalone page that can be
opened directly or embedded in another page with an `<iframe>`.

**Live site:** https://0b3d.github.io/algorithm-visualizations/

## Visualizations

| Topic | Page | Contents |
| --- | --- | --- |
| Elementary sorting | [`sorting-elementary/`](https://0b3d.github.io/algorithm-visualizations/sorting-elementary/) | Bubble sort, selection sort and insertion sort |

### Elementary sorting

- Step forward and back through every comparison and movement.
- The C++ code is shown next to the array, with the lines of the current step highlighted.
- Index variables (`i`, `j`, `minIndex`) are drawn under the cells, and every variable's value is listed next to the code.
- Each step is explained as you go, and the final step breaks down the number of comparisons and relates it to n(n − 1)/2.
- Three modes:
  - **Explore**: step through the algorithm with an explanation at every step.
  - **Practice: play the algorithm**: predict how many comparisons it will make, then click the value that ends
    each pass in place, the gap where a value is inserted, or the pair to swap. Wrong answers explain why,
    including the subtle cases with equal values.
  - **Practice: complete the code**: one fragment of the C++ code is blank. Pick a fragment and the algorithm runs
    with it, so typical mistakes can be seen happening: reading outside the array, losing values, sorting in the
    wrong order, or doing extra work. The verdict compares the run with the correct code.
- Use your own array (3 to 12 whole numbers) or one of the preset cases.
- Dark theme by default, with a button to switch to light (the choice is remembered).

Keyboard: `→` or `Space` next step, `←` previous step, `Enter` finish the current pass. In practice mode, `Tab` reaches the cells and gaps to click, and `Enter` chooses one.

## Embedding

```html
<iframe
  src="https://0b3d.github.io/algorithm-visualizations/sorting-elementary/"
  style="width: 100%; height: 860px; border: 0;"
  title="Elementary sorting algorithms step by step"
  loading="lazy">
</iframe>
```

The pages adapt to the width of the frame, from about 360 px up to full screen.
Give the frame a fixed height: about 860 px shows the whole page on wide screens
(the array next to the code); narrower frames stack them and scroll inside the frame.
Keyboard shortcuts work once the frame has focus (click inside it); the buttons always work.

## Structure

```
algorithm-visualizations/
├── index.html          Landing page with links to every visualization
└── sorting-elementary/ One folder per topic
    ├── index.html
    ├── styles.css
    ├── theme.js        Light and dark theme
    ├── practice.js     Play-the-algorithm questions: answers, score and controls
    ├── challenge.js    Complete-the-code challenges: verdict and options
    └── script.js       Algorithms, step player and rendering
```

Conventions:

- One folder per topic at the root, named `topic-subtopic` in lowercase English
  (for example `sorting-elementary`, `sorting-divide-conquer`, `graph-traversal`).
- Each folder is self-contained, with HTML, CSS and JavaScript in separate files.
- No external libraries or build step.
- Code shared between topics will live in a `shared/` folder once a second topic needs it.

## Running locally

Open any `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server
```

and visit http://localhost:8000.

## License

[MIT](LICENSE)
