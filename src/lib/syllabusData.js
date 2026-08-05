/**
 * CAT syllabus hierarchy — Section -> Macro Topic -> Micro Topic -> Question Types.
 *
 * This is a direct transcription of the CAT 2026 syllabus reference document
 * supplied by the user (topic names, weightage, frequency labels and
 * question-type phrasing). It is the single source of truth for the
 * Syllabus module — do not regenerate or infer values from elsewhere.
 *
 * Every section/macro/micro topic carries a hand-assigned, stable `id` so
 * other modules (mock analysis, revision planning, etc.) can reference a
 * topic without depending on array order or slug generation.
 */

// Question types are plain strings here; syllabusModel.js assigns each one
// a deterministic id (`${microTopicId}-qt-${index}`) when building the tree.
export const SYLLABUS_SECTIONS = [
  {
    id: "varc",
    name: "VARC",
    fullName: "Verbal Ability & Reading Comprehension",
    // Maps this section onto the existing app-wide SECTION_META color key
    // (constants.js) so the Syllabus module visually matches the Mock
    // Tracker's VARC/DILR/Quant color language instead of inventing its own.
    colorKey: "VARC",
    weightagePercent: 34,
    questionCount: 24,
    weightageLabel: "~34% of total marks (24 questions)",
    macroTopics: [
      {
        id: "varc-rc",
        name: "Reading Comprehension (RC)",
        weightageLabel: "~24% of total marks / ~70-80% of VARC (~16-19 of the 24 VARC questions, across 4-5 passages)",
        microTopics: [
          {
            id: "varc-rc-factual-detail",
            name: "Factual/detail-based questions",
            category: "Question Types",
            frequency: "High",
            questionTypes: [
              'Direct information lookup ("According to the passage, which of the following is true?")',
              '"Which of the following is NOT mentioned/stated" elimination-style questions',
            ],
          },
          {
            id: "varc-rc-inference",
            name: "Inference-based questions",
            category: "Question Types",
            frequency: "High",
            questionTypes: [
              '"The author would most likely agree/disagree with..." type',
              '"It can be inferred that..." – requires reading between the lines, not literal text',
              "Assumption-identification within the passage's argument",
            ],
          },
          {
            id: "varc-rc-main-idea",
            name: "Main idea / central theme questions",
            category: "Question Types",
            frequency: "Medium-High",
            questionTypes: [
              '"The primary purpose of the passage is..."',
              '"Which title best captures the passage?"',
              "Distinguishing main idea from a supporting detail (common trap option)",
            ],
          },
          {
            id: "varc-rc-tone",
            name: "Author's tone/attitude/purpose questions",
            category: "Question Types",
            frequency: "Medium",
            questionTypes: [
              "Identifying whether tone is critical, neutral, appreciative, skeptical, etc.",
              '"Why does the author mention X in paragraph 2?" (functional/rhetorical purpose questions)',
            ],
          },
          {
            id: "varc-rc-vocab-context",
            name: "Vocabulary-in-context questions",
            category: "Question Types",
            frequency: "Medium",
            questionTypes: [
              '"As used in the passage, the word X most nearly means..."',
              "Distinguishing dictionary meaning vs. contextual meaning (common trap)",
            ],
          },
          {
            id: "varc-rc-critical-reasoning",
            name: "Critical reasoning within RC",
            category: "Question Types",
            frequency: "Medium",
            questionTypes: [
              "Strengthen/weaken the author's argument",
              "Identify a logical flaw or unstated assumption in the passage's argument",
            ],
          },
          {
            id: "varc-rc-domain-familiarity",
            name: "Passage Domain",
            category: "General",
            frequency: null,
            note: "Underlying academic or disciplinary domain of RC passages.",
            questionTypes: [
              "Philosophy, History, Literature, Arts & Culture, Psychology, Economics, Politics & Society, Biology & Medicine, Physics & Chemistry, Technology, Environment, Mixed",
            ],
          },
          // Passage Domains
          { id: "varc-rc-philosophy", name: "Philosophy", category: "Passage Domains", questionTypes: ["Ethics, epistemology, logic, philosophical arguments, aesthetics"] },
          { id: "varc-rc-history", name: "History", category: "Passage Domains", questionTypes: ["Historiography, historical events, narrative analysis"] },
          { id: "varc-rc-literature", name: "Literature", category: "Passage Domains", questionTypes: ["Literary criticism, fiction, prose, author analysis, linguistics"] },
          { id: "varc-rc-arts-culture", name: "Arts & Culture", category: "Passage Domains", questionTypes: ["Art history, aesthetics, architecture, culture & traditions"] },
          { id: "varc-rc-psychology", name: "Psychology", category: "Passage Domains", questionTypes: ["Cognitive science, behavioral psychology, human perception"] },
          { id: "varc-rc-economics", name: "Economics", category: "Passage Domains", questionTypes: ["Micro/macroeconomics, finance, marketing, management, entrepreneurship"] },
          { id: "varc-rc-politics-society", name: "Politics & Society", category: "Passage Domains", questionTypes: ["Political science, sociology, law, governance, anthropology, education"] },
          { id: "varc-rc-biology-medicine", name: "Biology & Medicine", category: "Passage Domains", questionTypes: ["Evolution, genetics, healthcare, neuroscience, medical research"] },
          { id: "varc-rc-physics-chemistry", name: "Physics & Chemistry", category: "Passage Domains", questionTypes: ["Physical sciences, chemistry, astronomy & space, mathematics"] },
          { id: "varc-rc-technology", name: "Technology", category: "Passage Domains", questionTypes: ["Computer science, AI, engineering, internet & digital society"] },
          { id: "varc-rc-environment", name: "Environment", category: "Passage Domains", questionTypes: ["Climate change, ecology, conservation, environmental science & geography"] },
          { id: "varc-rc-mixed", name: "Mixed", category: "Passage Domains", questionTypes: ["Interdisciplinary passages combining multiple academic fields"] },
        ],
      },
      {
        id: "varc-va",
        name: "Verbal Ability (VA)",
        weightageLabel: "~10% of total marks / ~20-30% of VARC (~5-6 of the 24 VARC questions), mostly TITA",
        microTopics: [
          {
            id: "varc-va-para-jumbles",
            name: "Para-jumbles",
            frequency: "High",
            frequencyNote: "typically 2-3 questions",
            questionTypes: [
              "Standard 4-5 sentence jumble – arrange in correct order (TITA, type the sequence)",
              'Identifying the "opening sentence" (no dangling pronoun/reference) as a shortcut',
              "Identifying mandatory pairs (sentences that must stay adjacent due to linking words)",
            ],
          },
          {
            id: "varc-va-para-summary",
            name: "Para-summary",
            frequency: "High",
            frequencyNote: "typically 2-3 questions",
            questionTypes: [
              "Choose the option that best captures the passage's essence without over- or under-generalizing",
              "Common wrong-option traps: too narrow, too broad, or factually distorted",
            ],
          },
          {
            id: "varc-va-odd-sentence",
            name: "Odd sentence out / odd one out",
            frequency: "Medium-High",
            frequencyNote: "typically 1-2 questions",
            questionTypes: [
              "Given 4-5 sentences forming a coherent paragraph plus one unrelated sentence – identify the one that breaks the paragraph's flow/theme",
            ],
          },
          {
            id: "varc-va-para-completion",
            name: "Paragraph completion",
            frequency: "Low-Medium",
            frequencyNote: "occasional, 0-1 questions",
            questionTypes: [
              "Choose the sentence that logically completes/concludes a given paragraph",
            ],
          },
          {
            id: "varc-va-sentence-correction",
            name: "Sentence correction / error identification",
            frequency: "Low",
            frequencyNote: "rare in recent CATs",
            questionTypes: [
              "Grammar-rule-based single-error detection (subject-verb agreement, tense, parallelism)",
            ],
          },
          {
            id: "varc-va-vocab-analogies",
            name: "Vocabulary and analogies",
            frequency: "Low",
            frequencyNote: "rare in recent CATs",
            questionTypes: [
              "Word-pair relationship matching, fill-in-the-blank with closest-meaning word",
            ],
          },
          {
            id: "varc-va-fij",
            name: "Fact-Inference-Judgment (FIJ)",
            frequency: "Low",
            frequencyNote: "seen in some years, not every year",
            questionTypes: [
              "Classifying a statement as a Fact (objectively verifiable), Inference (conclusion from facts), or Judgment (subjective opinion/value statement)",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "dilr",
    name: "DILR",
    fullName: "Data Interpretation & Logical Reasoning",
    colorKey: "DILR",
    weightagePercent: 32,
    questionCount: 22,
    weightageLabel: "~32% of total marks (22 questions, usually 4 sets of ~5-6 questions each: 2 DI-heavy sets + 2 LR-heavy sets, though many sets blend both)",
    macroTopics: [
      {
        id: "dilr-di",
        name: "Data Interpretation (DI)",
        weightageLabel: "~16% of total marks / ~50% of DILR (~10-11 questions)",
        microTopics: [
          {
            id: "dilr-di-tables",
            name: "Tables (single/multi-table sets)",
            frequency: "Medium-High",
            questionTypes: [
              'Row-column cross-referencing questions, "which entity satisfies condition X and Y together"',
            ],
          },
          {
            id: "dilr-di-bar-graphs",
            name: "Bar graphs (simple/stacked/clustered)",
            frequency: "Medium",
            questionTypes: [
              '"By what % is A more than B" comparative questions, trend/growth-rate questions',
            ],
          },
          {
            id: "dilr-di-line-graphs",
            name: "Line graphs",
            frequency: "Low-Medium",
            questionTypes: [
              "Rate-of-change questions, point-of-intersection questions",
            ],
          },
          {
            id: "dilr-di-pie-charts",
            name: "Pie charts",
            frequency: "Low",
            questionTypes: [
              "Percentage-of-whole and combined pie+table questions",
            ],
          },
          {
            id: "dilr-di-caselets",
            name: "Caselets",
            frequency: "High",
            questionTypes: [
              "Extracting a hidden table from paragraph-form data, then standard DI questions on it",
            ],
          },
          {
            id: "dilr-di-combination-sets",
            name: "Combination sets (table+graph, or multiple charts)",
            frequency: "High",
            questionTypes: [
              "Multi-step questions requiring linking two data sources together",
            ],
          },
          {
            id: "dilr-di-data-sufficiency",
            name: "Data sufficiency",
            frequency: "Medium",
            frequencyNote: "~3-5 questions when this set type appears",
            questionTypes: [
              "Can the question be answered using statement 1 alone / statement 2 alone / both / neither",
            ],
          },
          {
            id: "dilr-di-missing-data",
            name: "Missing data / data reconstruction",
            frequency: "Medium",
            questionTypes: [
              "Filling in blanks in a table/grid using given constraints (often blurs into an LR puzzle)",
            ],
          },
          {
            id: "dilr-di-games-tournaments",
            name: "Games & tournaments sets",
            frequency: "Medium-High",
            questionTypes: [
              'Points-table reconstruction, knockout-bracket reconstruction, "who played whom" deduction',
            ],
          },
          {
            id: "dilr-di-venn",
            name: "Venn diagram-based DI",
            frequency: "Low",
            questionTypes: [
              "Numeric overlap questions (how many belong to exactly 2 of 3 categories, etc.)",
            ],
          },
        ],
      },
      {
        id: "dilr-lr",
        name: "Logical Reasoning (LR)",
        weightageLabel: "~16% of total marks / ~50% of DILR (~10-11 questions)",
        microTopics: [
          {
            id: "dilr-lr-seating",
            name: "Seating arrangement (linear/circular/rectangular/multi-row)",
            frequency: "High",
            frequencyNote: "~5-6 questions when this set type appears",
            questionTypes: [
              '"Who sits immediately to the left of X", "how many people sit between X and Y"',
            ],
          },
          {
            id: "dilr-lr-distribution",
            name: "Distribution/allocation puzzles",
            frequency: "High",
            questionTypes: [
              "Assigning items/ranks/days/groups to people under multiple constraints",
            ],
          },
          {
            id: "dilr-lr-sequencing",
            name: "Sequencing and scheduling puzzles",
            frequency: "Medium-High",
            questionTypes: [
              "Ordering events/people across days/slots given relative-position clues",
            ],
          },
          {
            id: "dilr-lr-conditional-logic",
            name: "Conditional/rule-based logic sets",
            frequency: "High",
            questionTypes: [
              '"If-then" rule chains requiring nested-condition elimination',
            ],
          },
          {
            id: "dilr-lr-team-formation",
            name: "Team/group formation and selection puzzles",
            frequency: "Medium",
            questionTypes: [
              '"Which of the following is a valid team given the constraints" type questions',
            ],
          },
          {
            id: "dilr-lr-truth-liar",
            name: "Binary/ternary logic puzzles (truth-teller/liar type)",
            frequency: "Medium",
            questionTypes: [
              "Determining who is lying/telling truth given a set of statements",
            ],
          },
          {
            id: "dilr-lr-network-direction",
            name: "Network/route/direction-based puzzles",
            frequency: "Medium",
            questionTypes: [
              "Direction-and-distance questions, shortest-path style deduction",
            ],
          },
          {
            id: "dilr-lr-venn",
            name: "Venn diagram-based LR",
            frequency: "Low-Medium",
            questionTypes: [
              "Logical set-membership deduction questions",
            ],
          },
          {
            id: "dilr-lr-blood-relations",
            name: "Blood relations",
            frequency: "Low",
            questionTypes: [
              "Family-tree construction from clues, then \"how is X related to Y\"",
            ],
          },
          {
            id: "dilr-lr-clocks-calendars",
            name: "Clocks and calendars",
            frequency: "Low",
            questionTypes: [
              "Day-of-week deduction, angle-between-hands problems",
            ],
          },
          {
            id: "dilr-lr-cubes-dice",
            name: "Cubes and dice",
            frequency: "Low",
            questionTypes: [
              "Painted-cube-cut-into-smaller-cubes counting, dice-face deduction",
            ],
          },
          {
            id: "dilr-lr-coding-decoding",
            name: "Coding-decoding",
            frequency: "Low",
            frequencyNote: "more common in other exams than recent CATs",
            questionTypes: [
              "Pattern-based letter/number substitution, deduction of the coding rule",
            ],
          },
          {
            id: "dilr-lr-series-completion",
            name: "Series completion",
            frequency: "Low",
            questionTypes: [
              "Number/letter series with a hidden pattern rule",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "qa",
    name: "QA",
    fullName: "Quantitative Aptitude",
    colorKey: "Quant",
    weightagePercent: 34,
    questionCount: 22,
    weightageLabel: "~34% of total marks (22 questions)",
    macroTopics: [
      {
        id: "qa-arithmetic",
        name: "Arithmetic",
        weightageLabel: "~36-40% of QA (~8-9 questions), highest weightage overall",
        microTopics: [
          {
            id: "qa-arithmetic-percentages",
            name: "Percentages",
            frequency: "High",
            questionTypes: [
              "Successive percentage change (increase then decrease, or multiple changes stacked)",
              "Percentage points vs. percentage change distinction (classic trap)",
              "Population/quantity growth-decay over multiple years",
              "Election/vote-share problems",
              "Constant-expenditure problems (price rise vs. required consumption fall)",
            ],
          },
          {
            id: "qa-arithmetic-pld",
            name: "Profit, Loss and Discount",
            frequency: "High",
            questionTypes: [
              "Successive discounts (two or three applied one after another)",
              "CP-SP-MP relationship problems",
              "Dishonest dealer / faulty weight problems",
              "Discount + profit combined problems",
              "Chain-of-sale problems",
            ],
          },
          {
            id: "qa-arithmetic-si-ci",
            name: "Simple & Compound Interest",
            frequency: "Medium",
            questionTypes: [
              "Difference between SI and CI over 2-3 years",
              "Installment/EMI-based repayment problems",
              "Effective annual rate when compounding is half-yearly/quarterly",
              "Ratio-based problems (principal, rate, or time as a ratio)",
            ],
          },
          {
            id: "qa-arithmetic-ratio-proportion",
            name: "Ratio and Proportion",
            frequency: "Medium",
            questionTypes: [
              "Combining two or more given ratios into one",
              "Direct and inverse variation word problems",
              "Dividing a quantity into a given ratio with an added condition",
            ],
          },
          {
            id: "qa-arithmetic-averages",
            name: "Averages",
            frequency: "Medium",
            questionTypes: [
              "Change in average when an element is added/removed",
              "Weighted average of two or more groups combined",
              "Replacement-based average shift",
              "Average-age problems",
              '"Batting average" style framing (new score shifts the average by a specific amount)',
            ],
          },
          {
            id: "qa-arithmetic-mixtures-alligations",
            name: "Mixtures and Alligations",
            frequency: "Low-Medium",
            questionTypes: [
              "Two/three-mixture blending problems",
              'Repeated replacement problems (classic "milk and water can")',
              "Alligation rule for price-quantity blending",
            ],
          },
          {
            id: "qa-arithmetic-tsd",
            name: "Time, Speed and Distance",
            frequency: "High",
            questionTypes: [
              "Relative speed (same vs. opposite direction)",
              "Circular track meeting-point problems",
              "Boats and streams",
              "Trains crossing platforms/other trains/poles",
              "Races (head starts, dead heat)",
              "Average speed for a multi-leg journey (harmonic mean)",
            ],
          },
          {
            id: "qa-arithmetic-time-work",
            name: "Time and Work",
            frequency: "High",
            questionTypes: [
              "Combined work rates",
              "Pipes and cisterns (with a leak)",
              "Efficiency-ratio problems",
              "Man-Days-Hours (MDH) equivalence problems",
              "Alternate-day/alternating-worker problems",
            ],
          },
          {
            id: "qa-arithmetic-partnerships",
            name: "Partnerships",
            frequency: "Low",
            questionTypes: [
              "Profit-sharing ratio based on capital × time invested",
              "Simple vs. compound partnership problems",
              "Sleeping partner vs. working partner problems",
            ],
          },
        ],
      },
      {
        id: "qa-algebra",
        name: "Algebra",
        weightageLabel: "~27-31% of QA (~6-7 questions), second-highest weightage",
        microTopics: [
          {
            id: "qa-algebra-linear-equations",
            name: "Linear Equations",
            frequency: "Medium",
            questionTypes: [
              "Word problems requiring 2-3 simultaneous equations (ages, costs, quantities)",
              "Age-based problems",
            ],
          },
          {
            id: "qa-algebra-quadratic-equations",
            name: "Quadratic Equations",
            frequency: "Medium",
            questionTypes: [
              "Nature-of-roots questions (sum/product of roots, discriminant)",
              "Forming a quadratic given its roots",
              "Word problems translating into a quadratic",
            ],
          },
          {
            id: "qa-algebra-polynomials",
            name: "Polynomials",
            frequency: "Low-Medium",
            questionTypes: [
              "Remainder/factor theorem to find an unknown coefficient",
              "Finding roots or evaluating given specific conditions",
            ],
          },
          {
            id: "qa-algebra-functions-graphs",
            name: "Functions and Graphs",
            frequency: "High",
            questionTypes: [
              "Functional equation problems (e.g., f(x+y) = f(x) + f(y))",
              "Evaluating piecewise/recursive functions at specific inputs",
              "Graph transformation identification",
              "Domain-range determination",
            ],
          },
          {
            id: "qa-algebra-inequalities-modulus",
            name: "Inequalities and Modulus",
            frequency: "Medium",
            questionTypes: [
              "Compound/combined inequalities",
              "Modulus equations/inequalities with case-based splitting",
              '"Number of integer solutions satisfying..." questions',
            ],
          },
          {
            id: "qa-algebra-logarithms",
            name: "Logarithms",
            frequency: "Medium",
            questionTypes: [
              "Change-of-base and simplification",
              "Solving logarithmic equations",
              "Number of digits in a large number using logs",
            ],
          },
          {
            id: "qa-algebra-sequences-series",
            name: "Sequences and Series",
            frequency: "High",
            questionTypes: [
              "nth term / sum of n terms of AP/GP/HP",
              "Mixed series (arithmetic-geometric combined) sum problems",
              "Telescoping series sum problems",
            ],
          },
          {
            id: "qa-algebra-maxima-minima",
            name: "Maxima and Minima",
            frequency: "Medium",
            questionTypes: [
              "Optimizing expressions using AM-GM inequality",
              "Word problems maximizing/minimizing area, cost, or profit",
            ],
          },
          {
            id: "qa-algebra-surds-indices",
            name: "Surds and Indices",
            frequency: "Low",
            questionTypes: [
              "Simplifying nested/compound surds",
              "Solving exponential equations",
            ],
          },
        ],
      },
      {
        id: "qa-geometry-mensuration",
        name: "Geometry & Mensuration",
        weightageLabel: "~13-14% of QA (~3 questions)",
        microTopics: [
          {
            id: "qa-geometry-triangles",
            name: "Triangles",
            frequency: "High",
            frequencyNote: "within geometry",
            questionTypes: [
              "Similar-triangles ratio problems",
              "Triangle inequality-based range-of-side-length problems",
              "Centroid/incenter/circumcenter/orthocenter properties",
              "Area using Heron's formula, base-height, or coordinates",
            ],
          },
          {
            id: "qa-geometry-circles",
            name: "Circles",
            frequency: "Medium",
            questionTypes: [
              "Tangent-chord angle and tangent-length problems",
              "Common tangents between two circles",
              "Cyclic quadrilateral property-based angle problems",
            ],
          },
          {
            id: "qa-geometry-polygons",
            name: "Polygons",
            frequency: "Low",
            questionTypes: [
              "Interior/exterior angle sum problems",
              "Diagonals count and area of regular polygons",
            ],
          },
          {
            id: "qa-geometry-coordinate",
            name: "Coordinate Geometry",
            frequency: "Medium-High",
            questionTypes: [
              "Equation of a line given points/conditions",
              "Distance and section formula application",
              "Area of triangle/quadrilateral using coordinates",
            ],
          },
          {
            id: "qa-geometry-trigonometry",
            name: "Trigonometry",
            frequency: "Low-Medium",
            questionTypes: [
              "Heights and distances (angle of elevation/depression)",
              "Basic identity-based simplification",
            ],
          },
          {
            id: "qa-geometry-mensuration-2d-3d",
            name: "Mensuration (2D and 3D)",
            frequency: "Medium-High",
            questionTypes: [
              "Combined-solid problems (surface area/volume)",
              "Melting-and-recasting problems",
              "Cutting-a-solid problems",
            ],
          },
        ],
      },
      {
        id: "qa-number-systems",
        name: "Number Systems",
        weightageLabel: "~9-13% of QA (~2-3 questions)",
        microTopics: [
          {
            id: "qa-numbersystems-divisibility-lcm-hcf",
            name: "Divisibility, LCM and HCF",
            frequency: "Medium",
            questionTypes: [
              "Numbers within a range divisible by a given set of numbers",
              "LCM/HCF word problems (bells ringing together, tank-filling cycles)",
            ],
          },
          {
            id: "qa-numbersystems-factors-factorials",
            name: "Factors and Factorials",
            frequency: "Medium",
            questionTypes: [
              "Trailing zeros in a factorial",
              "Highest power of a prime in a factorial (Legendre's formula)",
              "Number/sum of factors of a given number",
            ],
          },
          {
            id: "qa-numbersystems-remainder-theorem",
            name: "Remainder Theorem",
            frequency: "High",
            frequencyNote: "within number systems",
            questionTypes: [
              "Cyclicity of remainders (remainder of a^n divided by m)",
              "Chinese Remainder Theorem style combined-condition problems",
            ],
          },
          {
            id: "qa-numbersystems-base-conversion",
            name: "Base Conversion Systems",
            frequency: "Low",
            questionTypes: [
              "Converting between bases",
              "Combining base-system representation with divisibility rules",
            ],
          },
          {
            id: "qa-numbersystems-unit-digit",
            name: "Unit Digit Problems",
            frequency: "Medium",
            questionTypes: [
              "Units digit of a large power or product",
            ],
          },
        ],
      },
      {
        id: "qa-modern-mathematics",
        name: "Modern Mathematics",
        weightageLabel: "~9% of QA (~2 questions)",
        microTopics: [
          {
            id: "qa-modernmath-permutations-combinations",
            name: "Permutations and Combinations",
            frequency: "High",
            frequencyNote: "within modern math",
            questionTypes: [
              "Arrangements with restrictions",
              "Circular permutation problems",
              "Word/letter arrangement with repeated letters",
              "Committee-selection problems with at-least/at-most constraints",
            ],
          },
          {
            id: "qa-modernmath-probability",
            name: "Probability",
            frequency: "Medium-High",
            questionTypes: [
              "Probability using combinations",
              "Conditional probability problems",
              "Classic dice/cards/coins problems",
            ],
          },
          {
            id: "qa-modernmath-set-theory",
            name: "Set Theory",
            frequency: "Medium",
            questionTypes: [
              "Two-set and three-set Venn diagram numeric problems",
              "Maximum/minimum overlap between sets",
            ],
          },
          {
            id: "qa-modernmath-binomial-theorem",
            name: "Binomial Theorem",
            frequency: "Low",
            questionTypes: [
              "Finding a specific term or coefficient in an expansion",
            ],
          },
        ],
      },
    ],
  },
];
