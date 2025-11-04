"use client";

import { useCallback, useEffect, useState } from "react";

function Card({ front, back }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setFlipped((v) => !v)}
      className="relative h-32 sm:h-36 rounded-xl border border-white/10 bg-white/5 overflow-hidden [perspective:1000px]"
    >
      <div
        className={`absolute inset-0 transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}
      >
        <div className="absolute inset-0 flex items-center justify-center p-4 backface-hidden">
          <span className="text-sm sm:text-base text-foreground/90 text-center leading-relaxed">
            {front}
          </span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-4 [transform:rotateY(180deg)] backface-hidden bg-gradient-to-br from-cyan-500/10 to-fuchsia-500/10">
          <span className="text-sm sm:text-base text-foreground/90 text-center leading-relaxed">
            {back}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function MusicFlashcards() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [verse, setVerse] = useState("");
  const [lines, setLines] = useState([]);
  const [startIndex, setStartIndex] = useState(0);
  const [translations, setTranslations] = useState([]);
  const [error, setError] = useState("");

  const generate = useCallback(async () => {
    setError("");
    setGenerating(true);
    try {
      const verseRes = await fetch("/api/random-verse", { cache: "no-store" });
      if (!verseRes.ok) throw new Error("Failed to select verse");
      const verseJson = await verseRes.json();
      const { artist, title, verse, lines, startIndex } = verseJson;
      setArtist(artist);
      setTitle(title);
      setVerse(verse);
      setLines(lines);
      setStartIndex(Number.isFinite(startIndex) ? startIndex : 0);

      const transRes = await fetch("/api/translate-verse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artist, title, verse }),
      });
      if (!transRes.ok) {
        let msg = "Failed to translate verse";
        try {
          const errJson = await transRes.json();
          if (errJson?.error) msg = errJson.error;
        } catch {}
        throw new Error(msg);
      }
      const transJson = await transRes.json();
      const verseLines = String(verse).split("\n");
      const translatedLines = Array.isArray(transJson.lines) ? transJson.lines : [];
      // Map using contiguous window start index to avoid off-by-one due to duplicates/cleanup
      const mapped = lines.map((_, i) => translatedLines[(startIndex || 0) + i] || "");
      setTranslations(mapped);
    } catch (e) {
      setError(e.message || "Something went wrong");
      setArtist("");
      setTitle("");
      setVerse("");
      setLines([]);
      setTranslations([]);
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial idle state until user clicks generate
    setLoading(false);
  }, []);

  const hasCards = lines.length === 6 && translations.length === 6;

  return (
    <div className="min-h-dvh p-6 sm:p-10">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Music Flashcards</h1>
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="inline-flex items-center rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-4 py-2 text-sm font-medium text-white transition hover:from-cyan-400 hover:to-fuchsia-400 disabled:opacity-50"
          >
            {hasCards ? (generating ? "Refreshing..." : "New flashcards") : (generating ? "Generating..." : "Generate flashcards")}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {generating && (
          <div className="mb-6 flex items-center gap-3 text-foreground/80">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-foreground/30 border-t-transparent" />
            <span className="text-sm">Translating verse and building flashcards...</span>
          </div>
        )}

        {!loading && hasCards && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm text-foreground/60 mb-2">{artist} — {title}</div>
              <pre className="whitespace-pre-wrap text-base sm:text-lg leading-relaxed text-foreground">{verse}</pre>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {lines.map((line, idx) => (
                <Card key={idx} front={line} back={translations[idx] || ""} />
              ))}
            </div>
          </div>
        )}

        {!loading && !hasCards && (
          <div className="mt-10 text-center text-foreground/70">
            Click "Generate flashcards" to start.
          </div>
        )}
      </div>
    </div>
  );
}