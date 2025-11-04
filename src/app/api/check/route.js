import { NextResponse } from "next/server";

function normalizeText(input) {
  if (!input) return "";
  return String(input)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[.,;:!?'"()[\]{}]/g, "") // Remove punctuation
    .replace(/\s+/g, " ")
    .trim();
}

function isCloseMatch(answer, correct) {
  const normalizedAnswer = normalizeText(answer);
  const normalizedCorrect = normalizeText(correct);
  
  // Exact match
  if (normalizedAnswer === normalizedCorrect) return true;
  
  // Check if answer is close to correct (allows for minor typos)
  const maxDistance = Math.max(1, Math.floor(normalizedCorrect.length * 0.2)); // 20% of length
  const distance = levenshteinDistance(normalizedAnswer, normalizedCorrect);
  return distance <= maxDistance;
}

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

async function translateWord(word) {
  // Lazy import so the server can start even if the dependency isn't present
  let TranslationServiceClient;
  try {
    ({ TranslationServiceClient } = await import("@google-cloud/translate"));
  } catch (e) {
    throw new Error(
      "@google-cloud/translate is not installed. Please install it with `npm i @google-cloud/translate`."
    );
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT
  const location = "global";
  if (!projectId) {
    throw new Error(
      "Google Cloud project not configured. Set GOOGLE_CLOUD_PROJECT or GCP_PROJECT"
    );
  }

  const client = new TranslationServiceClient();
  const parent = `projects/${projectId}/locations/${location}`;

  const [response] = await client.translateText({
    parent,
    contents: [word],
    mimeType: "text/plain",
    sourceLanguageCode: "en",
    targetLanguageCode: "es",
  });

  const translations = response?.translations || [];
  const translated = translations[0]?.translatedText || "";
  return translated;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const word = body?.word;
    const answer = body?.answer ?? "";
    if (!word || typeof word !== "string") {
      return NextResponse.json({ error: "Missing word" }, { status: 400 });
    }

    const translated = await translateWord(word);
    const isCorrect = isCloseMatch(answer, translated);

    return NextResponse.json({
      correct: isCorrect,
      translation: translated,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}


