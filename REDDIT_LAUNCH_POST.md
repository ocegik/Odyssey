# I got tired of not knowing why a CAT mock went badly, so I built this for myself

Hi, I’m a CAT aspirant. For the last month, I’ve been building a small tracker for my own mock prep. It has mostly been sitting on my laptop while I kept fixing things after every mock.

I’m putting it out publicly now because it might help someone else too.

**App link:** [https://odysseyprep.vercel.app](https://odysseyprep.vercel.app)

Just to be completely clear, I’m not selling anything. No ads, no donations, no premium plan, and no paid features. I’m not connected to any coaching institute, test series, or company. I made this because my spreadsheet was getting messy and I wanted something that helped me understand my mocks better.

Usually after a bad mock, I would write something useless like “Quant was bad” or “need to improve DILR.” That does not really tell me what to do next. Did I attempt too few questions? Did I get too many wrong? Did I force bad questions and lose marks to negative marking?

So this is what the app tries to show.

When logging a mock, I enter the score for VARC, DILR, and Quant, along with the number of questions. Attempted questions and correct answers are optional, but adding them makes the useful stuff work. It then shows:

- section-wise marks over time
- rolling 5-mock averages, so one horrible mock does not feel like the end of the world
- accuracy and attempt rate for each section
- marks per attempt
- percentile trend, using the percentile actually given in that mock report
- source-wise comparison, so you can see your averages separately for different test series

The part I made because I needed it most is called “where marks are going.” It looks at the last five mocks and splits lost marks into three simple parts:

- questions I did not attempt, which usually means I need to work on attempt rate
- questions I attempted but got wrong, which points to accuracy
- marks lost to negative marking, which can mean I am choosing or forcing the wrong questions

For CAT, a correct answer is worth +3. The app uses the score I actually logged to work out the negative-marking part. So it does not make up an MCQ/TITA split if I did not enter one. I found this much more useful than just seeing a low score. “Attempt a few more Quant questions” and “stop taking risky Quant questions” are very different fixes.

I also did not want mock analysis to become another huge task I keep avoiding. You can save the score first and review the mock later. For detailed review, questions start as `Unreviewed`, which is different from `Skipped`.

`Unreviewed` means I have not checked that question yet, so it does not affect the analysis numbers. `Skipped` means I actually left it in the mock. I can review only 10 questions, save it, see something like “10/22 reviewed,” and come back later. Once everything is reviewed, the app checks whether the detailed analysis matches the score I logged. If something does not match, it gives a warning, but it does not stop me from saving.

Some other things that felt important to me:

- Detailed charts are tucked away under expandable sections, so the main screen stays simple. The closed row still tells you what is inside, like which section is most inconsistent.
- Percentiles are optional. It never tries to create an overall percentile by averaging section percentiles.
- You can export a full JSON backup and import it again later. Adding old mock data is separate from restoring a full backup, so you do not accidentally replace everything.
- It can stay local in your browser. Cloud sync through Supabase is optional if you want your data saved to an account. I also handled the annoying case where a slow cloud load could overwrite something you just typed locally.

One small detail that probably sounds boring, but mattered to me: an empty score is treated as missing, not as zero. A real zero should count. A blank entry should not quietly ruin your average or best-score number.

This is still a solo project, so there will probably be bugs and rough edges. It does not predict CAT percentile, admissions, or colleges. It only shows patterns from the mocks you put in.

If anyone tries it, I’d really appreciate honest feedback. Especially from people who already use a spreadsheet for mock analysis. That is exactly what I was using before this.

TL;DR

- Free CAT mock tracker I built for my own prep: no ads, donations, premium tier, or coaching affiliation.
- [Try it here: odysseyprep.vercel.app](https://odysseyprep.vercel.app)
- Tracks marks, 5-mock averages, accuracy, attempt rate, percentiles, and test-series-wise performance.
- Shows whether lost marks are mostly from low attempts, wrong answers, or negative marking.
- Lets you save a half-finished detailed mock review and return to it later.
