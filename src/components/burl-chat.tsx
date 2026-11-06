"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A working recreation of the scripted lead-qualifier chat on the Burl
 * Concepts site: the same seven steps, the same options, the same record at the
 * end. Nothing here is sent or stored anywhere, and the studio's real contact
 * details are not used.
 */

type Step = "service" | "specific" | "budget" | "timeline" | "location" | "name" | "phone" | "done";
type Msg = { from: "bot" | "you"; text: string };

const SERVICES = ["Residential", "Office / Commercial", "Modular Kitchen", "Custom Furniture"];
const SPECIFIC: Record<string, string[]> = {
  Residential: ["2BHK", "3BHK", "Villa"],
  "Office / Commercial": ["Office", "Clinic / Healthcare", "Retail / Showroom"],
  "Modular Kitchen": ["L-Shaped", "U-Shaped", "Straight Kitchen", "Custom Design"],
  "Custom Furniture": ["Wardrobe", "TV Unit", "Kitchen Cabinets", "Custom Furniture"],
};
const SPECIFIC_Q: Record<string, string> = {
  Residential: "What type of home are you designing?",
  "Office / Commercial": "What type of space is this?",
  "Modular Kitchen": "What type of kitchen are you planning?",
  "Custom Furniture": "What are you looking for?",
};
const BUDGET = ["Below 3 Lakhs", "3–6 Lakhs", "6–10 Lakhs", "10 Lakhs+"];
const TIMELINE = ["Immediately", "Within 1–2 months", "3+ months"];

const GREETING =
  "Looking to transform your space? Burl Concepts designs homes, offices and custom furniture with premium finishes and smart layouts. Tell us what you need.";

type Data = { service: string; specific: string; budget: string; timeline: string; location: string; name: string; phone: string };
const EMPTY: Data = { service: "", specific: "", budget: "", timeline: "", location: "", name: "", phone: "" };

export function BurlChat() {
  const [step, setStep] = useState<Step>("service");
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: GREETING }]);
  const [data, setData] = useState<Data>(EMPTY);
  const [events, setEvents] = useState<string[]>(["chatbot_open"]);
  const [text, setText] = useState("");
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, step]);

  const say = (from: Msg["from"], t: string) => setMsgs((m) => [...m, { from, text: t }]);

  function pick(option: string) {
    say("you", option);
    if (step === "service") {
      setEvents((e) => [...e, "chatbot_start"]);
      setData((d) => ({ ...d, service: option }));
      say("bot", SPECIFIC_Q[option]);
      setStep("specific");
    } else if (step === "specific") {
      setData((d) => ({ ...d, specific: option }));
      say("bot", "What is your approximate budget for this project?");
      setStep("budget");
    } else if (step === "budget") {
      setData((d) => ({ ...d, budget: option }));
      say("bot", "When are you planning to start this project?");
      setStep("timeline");
    } else if (step === "timeline") {
      setData((d) => ({ ...d, timeline: option }));
      say("bot", "Which location is the project in?");
      setStep("location");
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    say("you", t);
    setText("");
    if (step === "location") {
      setData((d) => ({ ...d, location: t }));
      say("bot", "Can I get your name and phone number so our designer can contact you? Please enter your name first.");
      setStep("name");
    } else if (step === "name") {
      setData((d) => ({ ...d, name: t }));
      say("bot", "Thanks! And your phone number?");
      setStep("phone");
    } else if (step === "phone") {
      setData((d) => ({ ...d, phone: t }));
      setEvents((ev) => [...ev, "chatbot_submit"]);
      say("bot", "Perfect. Our design team will contact you shortly to understand your requirement in detail.");
      setStep("done");
    }
  }

  function reset() {
    setStep("service");
    setMsgs([{ from: "bot", text: GREETING }]);
    setData(EMPTY);
    setEvents(["chatbot_open"]);
    setText("");
  }

  const options =
    step === "service"
      ? SERVICES
      : step === "specific"
        ? SPECIFIC[data.service] ?? []
        : step === "budget"
          ? BUDGET
          : step === "timeline"
            ? TIMELINE
            : [];
  const typing = step === "location" || step === "name" || step === "phone";
  const placeholder =
    step === "location" ? "Any location" : step === "name" ? "Any name" : "Any number. It isn't sent anywhere";

  return (
    <div className="bchat">
      <div className="bchat-window">
        <div className="bchat-head">
          <span className="bchat-avatar" aria-hidden="true">
            B
          </span>
          <div>
            <strong>Burl Concepts</strong>
            <small>Recreation of the chat on the site</small>
          </div>
        </div>

        <div className="bchat-log" ref={log} role="log" aria-live="polite" aria-label="Chat conversation">
          {msgs.map((m, i) => (
            <p key={i} className={`bchat-msg bchat-${m.from}`}>
              {m.text}
            </p>
          ))}
          {options.length > 0 && (
            <div className="bchat-options">
              {options.map((o) => (
                <button key={o} type="button" onClick={() => pick(o)}>
                  {o}
                </button>
              ))}
            </div>
          )}
        </div>

        {typing && (
          <form className="bchat-form" onSubmit={submit}>
            <label htmlFor="bchat-input" className="sr-only">
              Your answer
            </label>
            <input
              id="bchat-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              inputMode={step === "phone" ? "tel" : "text"}
              autoComplete="off"
            />
            <button type="submit" disabled={!text.trim()}>
              Send
            </button>
          </form>
        )}
      </div>

      <div className="bchat-side">
        <h3>What the studio would receive</h3>
        {step === "done" ? (
          <dl className="bchat-record">
            <div>
              <dt>Name</dt>
              <dd>{data.name}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{data.phone}</dd>
            </div>
            <div>
              <dt>Project</dt>
              <dd>
                {data.service} ({data.specific}) | Budget: {data.budget} | Timeline: {data.timeline} | Location:{" "}
                {data.location}
              </dd>
            </div>
          </dl>
        ) : (
          <p>Answer the seven steps and the lead record appears here, in the format the real chat writes it.</p>
        )}

        <h3>Events it fires</h3>
        <ol className="bchat-events">
          {events.map((e, i) => (
            <li key={`${e}-${i}`}>
              <code>{e}</code>
            </li>
          ))}
        </ol>
        <p className="bchat-note">Nothing is sent or stored. Use made-up details.</p>
        <button type="button" className="bchat-reset" onClick={reset}>
          Start again
        </button>
      </div>
    </div>
  );
}
