import { SECTIONS } from "../constants";
import { uid } from "./format";
import { normalizeMockDataset } from "./mockModel";

export function makeSampleData() {
  const sources = ["TIME", "IMS", "Actual CAT Mock"];
  const out = [];
  let day = new Date();
  day.setDate(day.getDate() - 100);
  const profiles = {
    VARC: { qs: 24, accBase: 0.64, attemptBase: 0.9, drift: 0.02 },
    DILR: { qs: 22, accBase: 0.56, attemptBase: 0.8, drift: 0.015 },
    Quant: { qs: 22, accBase: 0.4, attemptBase: 0.62, drift: -0.01 },
  };
  for (let m = 0; m < 11; m++) {
    day.setDate(day.getDate() + 9);
    const dateStr = day.toISOString().slice(0, 10);
    const source = sources[m % sources.length];
    SECTIONS.forEach((sec) => {
      const p = profiles[sec];
      const noise = () => (Math.random() - 0.5) * 0.08;
      const attemptRate = Math.min(1, Math.max(0.3, p.attemptBase + p.drift * m * 0.3 + noise()));
      const attempted = Math.round(p.qs * attemptRate);
      const acc = Math.min(0.95, Math.max(0.15, p.accBase + p.drift * m * 0.4 + noise()));
      const correct = Math.round(attempted * acc);
      const wrong = attempted - correct;
      out.push({
        id: uid(), createdAt: Date.now() + out.length, date: dateStr, source, section: sec,
        attempted, correct, manualTotalMarks: correct * 3 - wrong,
        totalQuestions: p.qs,
        percentile: Math.random() > 0.3 ? Math.round((40 + (sec === "Quant" ? -10 : 10) + m * 1.5 + (Math.random() - 0.5) * 10) * 10) / 10 : null,
        topperScore: Math.random() > 0.4 ? Math.round(p.qs * 2.6 + Math.random() * 8) : null,
      });
    });
  }
  return normalizeMockDataset(out);
}
