import jsPDF from "jspdf";
import type { PracticeSet } from "./practiceQuiz";

function addWrapped(doc: jsPDF, text: string, x: number, y: number, maxW: number, lineH = 14) {
  const lines = doc.splitTextToSize(text, maxW);
  doc.text(lines, x, y);
  return y + lines.length * lineH;
}

export function downloadPracticePdf(set: PracticeSet, mode: "questions" | "solutions") {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 48;
  const maxW = pw - m * 2;
  let y = m;

  const ensure = (need: number) => {
    if (y + need > ph - m) {
      doc.addPage();
      y = m;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(mode === "questions" ? "Practice Questions" : "Answer Key & Solutions", m, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  y = addWrapped(doc, `${set.title} — ${set.scopeLabel}`, m, y, maxW);
  y = addWrapped(doc, `Topic: ${set.topicTitle}`, m, y, maxW);
  y += 8;
  doc.setTextColor(0);

  const section = (title: string) => {
    ensure(28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(title, m, y);
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
  };

  if (set.mcq.length) {
    section(`Multiple Choice (${set.mcq.length})`);
    set.mcq.forEach((q, i) => {
      ensure(60);
      doc.setFont("helvetica", "bold");
      y = addWrapped(doc, `Q${i + 1}. ${q.question}`, m, y, maxW);
      doc.setFont("helvetica", "normal");
      q.choices.forEach((c, ci) => {
        ensure(16);
        const label = `${String.fromCharCode(65 + ci)}. ${c}`;
        y = addWrapped(doc, label, m + 12, y, maxW - 12, 13);
      });
      if (mode === "solutions") {
        doc.setTextColor(0, 120, 0);
        y = addWrapped(
          doc,
          `Answer: ${String.fromCharCode(65 + q.correctIndex)} — ${q.choices[q.correctIndex]}`,
          m + 12,
          y,
          maxW - 12,
          13
        );
        if (q.explanation) {
          doc.setTextColor(60);
          y = addWrapped(doc, `Explanation: ${q.explanation}`, m + 12, y, maxW - 12, 13);
        }
        doc.setTextColor(0);
      }
      y += 8;
    });
  }

  if (set.shortAnswer.length) {
    section(`Short Answer (${set.shortAnswer.length})`);
    set.shortAnswer.forEach((q, i) => {
      ensure(50);
      doc.setFont("helvetica", "bold");
      y = addWrapped(doc, `Q${i + 1}. ${q.question}`, m, y, maxW);
      doc.setFont("helvetica", "normal");
      if (mode === "solutions") {
        doc.setTextColor(0, 100, 0);
        y = addWrapped(doc, `Model answer: ${q.modelAnswer}`, m + 12, y, maxW - 12, 13);
        doc.setTextColor(0);
      } else {
        ensure(40);
        doc.setDrawColor(180);
        doc.rect(m, y, maxW, 36);
        y += 44;
      }
      y += 6;
    });
  }

  if (set.theory.length) {
    section(`Theory / Long Answer (${set.theory.length})`);
    set.theory.forEach((q, i) => {
      ensure(50);
      doc.setFont("helvetica", "bold");
      y = addWrapped(doc, `Q${i + 1}. ${q.question}`, m, y, maxW);
      doc.setFont("helvetica", "normal");
      if (mode === "solutions") {
        doc.setTextColor(0, 100, 0);
        y = addWrapped(doc, `Model answer: ${q.modelAnswer}`, m + 12, y, maxW - 12, 13);
        if (q.rubric) y = addWrapped(doc, `Marking guide: ${q.rubric}`, m + 12, y, maxW - 12, 13);
        doc.setTextColor(0);
      } else {
        ensure(80);
        doc.setDrawColor(180);
        doc.rect(m, y, maxW, 72);
        y += 80;
      }
      y += 6;
    });
  }

  const fname = `${set.title.replace(/[^a-z0-9\-_ ]/gi, "_").slice(0, 40)}_${mode}.pdf`;
  doc.save(fname);
}
