import { SECTIONS } from "../constants";
import { uid } from "./format";
import { normalizeMockDataset } from "./mockModel";

export function makeSampleData() {
  const sources = ["TIME", "IMS", "Actual CAT Mock"];
  const out = [];
  let day = new Date();
  day.setDate(day.getDate() - 100);
  const profiles = {
    VARC: { qs: 24, mcqAccBase: 0.68, titaAccBase: 0.55, attemptBase: 0.9, drift: 0.02 },
    DILR: { qs: 22, mcqAccBase: 0.6, titaAccBase: 0.5, attemptBase: 0.8, drift: 0.015 },
    Quant: { qs: 22, mcqAccBase: 0.42, titaAccBase: 0.35, attemptBase: 0.62, drift: -0.01 },
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
      const mcqShare = 0.6;
      const attemptedMCQ = Math.round(attempted * mcqShare);
      const attemptedTITA = attempted - attemptedMCQ;
      const mcqAcc = Math.min(0.95, Math.max(0.15, p.mcqAccBase + p.drift * m * 0.4 + noise()));
      const titaAcc = Math.min(0.95, Math.max(0.1, p.titaAccBase + p.drift * m * 0.4 + noise()));
      const rightMCQ = Math.round(attemptedMCQ * mcqAcc);
      const rightTITA = Math.round(attemptedTITA * titaAcc);
      const wrongMCQ = attemptedMCQ - rightMCQ;
      const wrongTITA = attemptedTITA - rightTITA;
      out.push({
        id: uid(), createdAt: Date.now() + out.length, date: dateStr, source, section: sec,
        attemptedMCQ, attemptedTITA, rightMCQ, rightTITA, wrongMCQ, wrongTITA,
        totalQuestions: p.qs,
        percentile: Math.random() > 0.3 ? Math.round((40 + (sec === "Quant" ? -10 : 10) + m * 1.5 + (Math.random() - 0.5) * 10) * 10) / 10 : null,
        topperScore: Math.random() > 0.4 ? Math.round(p.qs * 2.6 + Math.random() * 8) : null,
      });
    });
  }
  return normalizeMockDataset(out);
}
