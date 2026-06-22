PRAGMA foreign_keys = ON;

-- ============================================================
-- Built-in Languages
-- ============================================================
INSERT INTO languages (id, name, is_builtin) VALUES
  ('lang-html-css',    'HTML & CSS',  1),
  ('lang-javascript',  'JavaScript',  1),
  ('lang-python',      'Python',      1);

-- ============================================================
-- HTML & CSS Problems  (has_visual_preview = 1 for all)
-- ============================================================

-- MCQ 1 – easy
INSERT INTO problems (id, language_id, type, difficulty, prompt, options, correct_answer, has_visual_preview) VALUES
(
  'prob-html-01',
  'lang-html-css',
  'mcq',
  'easy',
  'Which HTML tag is used to define the largest heading?',
  '["<h6>","<heading>","<h1>","<head>"]',
  '<h1>',
  1
);

-- MCQ 2 – easy
INSERT INTO problems (id, language_id, type, difficulty, prompt, options, correct_answer, has_visual_preview) VALUES
(
  'prob-html-02',
  'lang-html-css',
  'mcq',
  'easy',
  'Which CSS property changes the text color of an element?',
  '["font-color","text-color","color","foreground"]',
  'color',
  1
);

-- MCQ 3 – medium
INSERT INTO problems (id, language_id, type, difficulty, prompt, options, correct_answer, has_visual_preview) VALUES
(
  'prob-html-03',
  'lang-html-css',
  'mcq',
  'medium',
  'Which CSS display value makes an element a flex container?',
  '["block","inline","flex","grid"]',
  'flex',
  1
);

-- Code 1 – easy
INSERT INTO problems (id, language_id, type, difficulty, prompt, starter_code, correct_answer, test_cases, has_visual_preview) VALUES
(
  'prob-html-04',
  'lang-html-css',
  'code',
  'easy',
  'Write HTML that displays a red paragraph containing the text "Hello, World!".',
  '<p style="">Hello, World!</p>',
  NULL,
  '[{"input":"","expected":"contains:<p","description":"Must have a paragraph element"}]',
  1
);

-- Code 2 – medium
INSERT INTO problems (id, language_id, type, difficulty, prompt, starter_code, correct_answer, test_cases, has_visual_preview) VALUES
(
  'prob-html-05',
  'lang-html-css',
  'code',
  'medium',
  'Create a centered blue button with the label "Click Me" using HTML and inline CSS.',
  '<div style="text-align:center;">\n  <button style="">Click Me</button>\n</div>',
  NULL,
  '[{"input":"","expected":"contains:Click Me","description":"Must contain the button text"}]',
  1
);

-- MCQ 4 – hard
INSERT INTO problems (id, language_id, type, difficulty, prompt, options, correct_answer, has_visual_preview) VALUES
(
  'prob-html-06',
  'lang-html-css',
  'mcq',
  'hard',
  'In CSS Grid, which property defines how many columns a grid item should span?',
  '["grid-row","grid-column","grid-area","column-span"]',
  'grid-column',
  1
);

-- ============================================================
-- JavaScript Problems
-- ============================================================

-- MCQ 1 – easy
INSERT INTO problems (id, language_id, type, difficulty, prompt, options, correct_answer, has_visual_preview) VALUES
(
  'prob-js-01',
  'lang-javascript',
  'mcq',
  'easy',
  'Which keyword declares a variable that cannot be reassigned?',
  '["var","let","const","static"]',
  'const',
  0
);

-- MCQ 2 – easy
INSERT INTO problems (id, language_id, type, difficulty, prompt, options, correct_answer, has_visual_preview) VALUES
(
  'prob-js-02',
  'lang-javascript',
  'mcq',
  'easy',
  'What does `typeof null` return in JavaScript?',
  '["null","undefined","object","boolean"]',
  'object',
  0
);

-- MCQ 3 – medium
INSERT INTO problems (id, language_id, type, difficulty, prompt, options, correct_answer, has_visual_preview) VALUES
(
  'prob-js-03',
  'lang-javascript',
  'mcq',
  'medium',
  'Which array method returns a new array with each element transformed by a function?',
  '["forEach","filter","map","reduce"]',
  'map',
  0
);

-- Code 1 – easy
INSERT INTO problems (id, language_id, type, difficulty, prompt, starter_code, test_cases, has_visual_preview) VALUES
(
  'prob-js-04',
  'lang-javascript',
  'code',
  'easy',
  'Write a function called `add` that takes two numbers and returns their sum.',
  'function add(a, b) {\n  // your code here\n}',
  '[{"input":[2,3],"expected":5,"description":"add(2,3) should return 5"},{"input":[0,0],"expected":0,"description":"add(0,0) should return 0"},{"input":[-1,1],"expected":0,"description":"add(-1,1) should return 0"}]',
  0
);

-- Code 2 – medium
INSERT INTO problems (id, language_id, type, difficulty, prompt, starter_code, test_cases, has_visual_preview) VALUES
(
  'prob-js-05',
  'lang-javascript',
  'code',
  'medium',
  'Write a function called `reverseString` that takes a string and returns it reversed.',
  'function reverseString(str) {\n  // your code here\n}',
  '[{"input":["hello"],"expected":"olleh","description":"reverseString(\"hello\") should return \"olleh\""},{"input":["abc"],"expected":"cba","description":"reverseString(\"abc\") should return \"cba\""}]',
  0
);

-- MCQ 4 – hard
INSERT INTO problems (id, language_id, type, difficulty, prompt, options, correct_answer, has_visual_preview) VALUES
(
  'prob-js-06',
  'lang-javascript',
  'mcq',
  'hard',
  'What is the output of `[1,2,3].reduce((acc, v) => acc + v, 10)`?',
  '["6","16","10","undefined"]',
  '16',
  0
);

-- Code 3 – hard
INSERT INTO problems (id, language_id, type, difficulty, prompt, starter_code, test_cases, has_visual_preview) VALUES
(
  'prob-js-07',
  'lang-javascript',
  'code',
  'hard',
  'Write a function `flatten` that flattens a nested array one level deep. Example: flatten([1,[2,3],[4]]) → [1,2,3,4]',
  'function flatten(arr) {\n  // your code here\n}',
  '[{"input":[[1,[2,3],[4]]],"expected":[1,2,3,4],"description":"flatten([1,[2,3],[4]]) should return [1,2,3,4]"},{"input":[[[1],[2]]],"expected":[1,2],"description":"flatten([[1],[2]]) should return [1,2]"}]',
  0
);

-- ============================================================
-- Python Problems (MCQ + AI-graded code)
-- ============================================================

-- MCQ 1 – easy
INSERT INTO problems (id, language_id, type, difficulty, prompt, options, correct_answer, has_visual_preview) VALUES
(
  'prob-py-01',
  'lang-python',
  'mcq',
  'easy',
  'Which function prints output to the console in Python?',
  '["echo()","console.log()","print()","write()"]',
  'print()',
  0
);

-- MCQ 2 – easy
INSERT INTO problems (id, language_id, type, difficulty, prompt, options, correct_answer, has_visual_preview) VALUES
(
  'prob-py-02',
  'lang-python',
  'mcq',
  'easy',
  'What data type is the result of `type(3.14)` in Python?',
  '["int","float","double","decimal"]',
  'float',
  0
);

-- MCQ 3 – medium
INSERT INTO problems (id, language_id, type, difficulty, prompt, options, correct_answer, has_visual_preview) VALUES
(
  'prob-py-03',
  'lang-python',
  'mcq',
  'medium',
  'Which Python keyword is used to define a function?',
  '["function","fun","def","fn"]',
  'def',
  0
);

-- Code 1 – easy (Gemini-graded)
INSERT INTO problems (id, language_id, type, difficulty, prompt, starter_code, test_cases, has_visual_preview) VALUES
(
  'prob-py-04',
  'lang-python',
  'code',
  'easy',
  'Write a Python function called `greet` that takes a name as a string and returns "Hello, {name}!". For example: greet("Alice") → "Hello, Alice!"',
  'def greet(name):\n    # your code here\n    pass',
  '[{"input":["Alice"],"expected":"Hello, Alice!","description":"greet(\"Alice\") should return \"Hello, Alice!\""},{"input":["Bob"],"expected":"Hello, Bob!","description":"greet(\"Bob\") should return \"Hello, Bob!\""}]',
  0
);

-- Code 2 – medium (Gemini-graded)
INSERT INTO problems (id, language_id, type, difficulty, prompt, starter_code, test_cases, has_visual_preview) VALUES
(
  'prob-py-05',
  'lang-python',
  'code',
  'medium',
  'Write a Python function `is_even` that returns True if a number is even, False otherwise.',
  'def is_even(n):\n    # your code here\n    pass',
  '[{"input":[4],"expected":true,"description":"is_even(4) should return True"},{"input":[7],"expected":false,"description":"is_even(7) should return False"}]',
  0
);

-- MCQ 4 – hard
INSERT INTO problems (id, language_id, type, difficulty, prompt, options, correct_answer, has_visual_preview) VALUES
(
  'prob-py-06',
  'lang-python',
  'mcq',
  'hard',
  'What is the output of `list(map(lambda x: x**2, [1,2,3]))`?',
  '["[1,4,9]","[2,4,6]","[1,2,3]","[1,8,27]"]',
  '[1,4,9]',
  0
);
