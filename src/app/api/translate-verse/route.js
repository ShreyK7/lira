import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

function extractJson(text) {
  if (!text) return null;
  const fence = /```[\s\S]*?```/g;
  const match = text.match(fence);
  const candidate = match ? match[0].replace(/```[a-zA-Z]*\n?/, "").replace(/```$/, "") : text;
  try {
    return JSON.parse(candidate);
  } catch {
    // Try to find first JSON object/array
    const start = candidate.indexOf("{") >= 0 ? candidate.indexOf("{") : candidate.indexOf("[");
    const end = Math.max(candidate.lastIndexOf("}"), candidate.lastIndexOf("]"));
    if (start >= 0 && end > start) {
      const slice = candidate.slice(start, end + 1);
      try { return JSON.parse(slice); } catch {}
    }
  }
  return null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const artist = body?.artist ?? "";
    const title = body?.title ?? "";
    const verse = body?.verse ?? "";
    if (!artist || !title || !verse) {
      return NextResponse.json({ error: "Missing artist, title or verse" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
    }

    let GoogleGenerativeAI;

    const genAI = new GoogleGenAI({});

    const prompt = `Translate the following verse from ${artist}'s "${title}" into english, being as contextual as possible. The translation should, with your best effort, reflect exactly what you think the artist is trying to semantically express (avoid literal translations if you think another translation makes more sense, or in order words, adopt the role of a Puerto Rican fluent in both American English and Puerto Rican Spanish). Only return the translated verse, and convert to json format.

Return JSON strictly in the form: { "lines": ["line1", "line2", ...] } where the number of lines matches the input verse lines (split by newline). Do not include any additional properties.

Input verse (keep line boundaries):
\n\n${verse}`;

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const text = response?.text || "";
    const parsed = extractJson(text);
    if (!parsed || !Array.isArray(parsed.lines)) {
      return NextResponse.json({ error: "Failed to parse Gemini response" }, { status: 502 });
    }
    return NextResponse.json({ lines: parsed.lines });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}


