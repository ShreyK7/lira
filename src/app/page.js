"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(true);
  const [answer, setAnswer] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctTranslation, setCorrectTranslation] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPrompt() {
      setIsLoadingPrompt(true);
      try {
        const res = await fetch("/api/word", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load word");
        const json = await res.json();
        if (isMounted) setPrompt(json.word ?? "");
      } finally {
        if (isMounted) setIsLoadingPrompt(false);
      }
    }

    loadPrompt();
    return () => {
      isMounted = false;
    };
  }, []);

  async function fetchNewWord() {
    setShowCorrection(false);
    setCorrectTranslation("");
    setShowSuccess(false);
    setAnswer("");
    setIsLoadingPrompt(true);
    const res = await fetch("/api/word", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load word");
    const json = await res.json();
    setPrompt(json.word ?? "");
    setIsLoadingPrompt(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!prompt) return;
    setIsChecking(true);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: prompt, answer }),
      });
      if (!res.ok) throw new Error("Failed to check answer");
      const json = await res.json();
      if (json.correct) {
        setShowSuccess(true);
        setTimeout(async () => {
          await fetchNewWord();
        }, 1500); // Show success message for 1.5 seconds
      } else {
        setShowCorrection(true);
        setCorrectTranslation(json.translation ?? "");
      }
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="relative rounded-2xl border border-white/10 bg-white/5 dark:bg-white/5 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_20px_60px_-20px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-transparent to-fuchsia-500/10" />

          <div className="p-6 sm:p-8">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-4">
              Spanish Vocab Drill
            </h1>

            <div className="mb-6">
              {isLoadingPrompt ? (
                <div className="h-6 w-3/4 animate-pulse rounded bg-white/10" />
              ) : (
                <p className="text-3xl sm:text-4xl font-medium tracking-tight text-foreground">{prompt}</p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="answer" className="sr-only">
                  Your answer
                </label>
                <input
                  id="answer"
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30 placeholder:text-foreground/50"
                  autoComplete="off"
                  disabled={isLoadingPrompt}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isLoadingPrompt || isChecking || !answer.trim()}
                  className="inline-flex items-center rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-5 py-2.5 text-sm font-medium text-white transition hover:from-cyan-400 hover:to-fuchsia-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isChecking ? "Checking..." : "Submit Answer"}
                </button>

                {showCorrection && (
                  <button
                    type="button"
                    onClick={fetchNewWord}
                    disabled={isLoadingPrompt}
                    className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next word
                  </button>
                )}
              </div>

              {showSuccess && (
                <div className="text-lg font-medium text-green-400 animate-pulse">
                  ✓ Correct!
                </div>
              )}

              {showCorrection && (
                <div className="text-base text-foreground/80">
                  Correct translation: <span className="text-xl font-medium text-foreground">{correctTranslation}</span>
                </div>
              )}
            </form>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-foreground/60">
          Tip: Press Enter to submit
        </div>

        <div className="mt-3 text-center">
          <Link
            href="/flashcards/music"
            className="inline-flex items-center rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-5 py-2.5 text-sm font-medium text-white transition hover:from-cyan-400 hover:to-fuchsia-400"
          >
            Try Music Flashcards
          </Link>
        </div>
      </div>
    </div>
  );
}

