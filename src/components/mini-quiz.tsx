"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/track";

/**
 * A three-question taste of the Career Discovery Platform, using three of the
 * real questions and their real option-to-profile scoring. The real thing has 15
 * questions across five dimensions; this only totals the profile points.
 */

type Profile =
  | "SOC Analyst"
  | "Security Analyst"
  | "GRC Analyst"
  | "Cloud Security Analyst"
  | "Security Engineer"
  | "Incident Response Analyst";

type Option = { text: string; profile: Profile; score: number };
type Question = { q: string; options: Option[] };

const QUESTIONS: Question[] = [
  {
    q: "What best describes your current situation?",
    options: [
      { text: "I'm still studying or recently graduated", profile: "SOC Analyst", score: 8 },
      { text: "I'm looking for my first job", profile: "Security Analyst", score: 9 },
      { text: "I'm currently working and want to upskill", profile: "Cloud Security Analyst", score: 10 },
      { text: "I want to switch careers into tech", profile: "Incident Response Analyst", score: 10 },
    ],
  },
  {
    q: "Why are you interested in cybersecurity?",
    options: [
      { text: "Better career opportunities & salary", profile: "Security Analyst", score: 7 },
      { text: "High demand for jobs in the industry", profile: "Cloud Security Analyst", score: 8 },
      { text: "I enjoy technology and problem-solving", profile: "Security Engineer", score: 10 },
      { text: "I want to protect organizations from threats", profile: "Incident Response Analyst", score: 10 },
    ],
  },
  {
    q: "Have you ever explored cybersecurity before?",
    options: [
      { text: "Yes, I regularly read and learn about it", profile: "Security Engineer", score: 10 },
      { text: "I've taken a beginner course or certification", profile: "Security Analyst", score: 9 },
      { text: "I've watched videos or read some articles", profile: "SOC Analyst", score: 7 },
      { text: "This is completely new to me", profile: "GRC Analyst", score: 6 },
    ],
  },
];

export function MiniQuiz() {
  const [picked, setPicked] = useState<Option[]>([]);
  const announcement = useRef<HTMLParagraphElement>(null);
  const interacted = useRef(false);
  const step = picked.length;
  const done = step === QUESTIONS.length;

  const totals = new Map<Profile, number>();
  for (const o of picked) totals.set(o.profile, (totals.get(o.profile) ?? 0) + o.score);
  const top = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];

  useEffect(() => {
    if (interacted.current) announcement.current?.focus({ preventScroll: true });
  }, [step]);

  return (
    <div className="quiz">
      <p className="quiz-count" ref={announcement} tabIndex={-1}>
        {done ? "Your result" : `Question ${step + 1} of ${QUESTIONS.length} (the real one has 15)`}
      </p>

      {!done ? (
        <>
          <h3 className="quiz-q">{QUESTIONS[step].q}</h3>
          <div className="quiz-options">
            {QUESTIONS[step].options.map((o) => (
              <button key={o.text} type="button" onClick={() => {
                interacted.current = true;
                track("demo_question_answered", `career_discovery_${step + 1}`);
                if (step === QUESTIONS.length - 1) track("demo_completed", "career_discovery");
                setPicked([...picked, o]);
              }}>
                {o.text}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="quiz-result">
          <p className="quiz-profile">{top?.[0]}</p>
          <p>
            That&rsquo;s the profile your three answers point to most. The real platform asks 15 questions,
            scores five dimensions and turns it into a personalised report with a next step. Every answer
            in this demo records a local <code>demo_question_answered</code> event. No answers are sent to a server.
          </p>
          <button type="button" className="quiz-again" onClick={() => { track("demo_reset", "career_discovery"); setPicked([]); }}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
