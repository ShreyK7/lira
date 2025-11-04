import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

function parseCsv(text) {
  const records = [];
  const headers = [];
  let i = 0;
  const len = text.length;
  let field = "";
  let row = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    if (headers.length === 0) {
      headers.push(...row.map((h) => h.trim()))
    } else if (row.length === headers.length) {
      const obj = {};
      for (let k = 0; k < headers.length; k++) obj[headers[k]] = row[k];
      records.push(obj);
    }
    row = [];
  };

  while (i < len) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < len && text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      pushField();
      i++;
      continue;
    }
    if (ch === '\n') {
      pushField();
      pushRow();
      i++;
      continue;
    }
    if (ch === '\r') { i++; continue; }
    field += ch;
    i++;
  }
  // trailing field/row
  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }
  return records;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function splitVerses(lyrics) {
  const lines = String(lyrics || "").replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  const verses = [];
  let current = [];
  for (const line of lines) {
    if (line.trim() === "") {
      if (current.length > 0) {
        verses.push(current.slice(1));
        current = [];
      }
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) verses.push(current);
  return verses;
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "bad_bunny_lyrics.csv");
    const raw = await readFile(filePath, "utf8");
    const rows = parseCsv(raw);
    const candidates = rows.filter((r) => (r.lyrics || r.LYRICS || r["lyrics"])?.length > 0);
    if (candidates.length === 0) {
      return NextResponse.json({ error: "No songs available" }, { status: 404 });
    }
    let attempt = 0;
    while (attempt < 20) {
      attempt++;
      const song = pickRandom(candidates);
      const artist = song.artists || song.artist || song["artists"] || "";
      const title = song.title || song["title"] || song.title_with_featured || "";
      const lyrics = song.lyrics || song["lyrics"] || "";
      const verses = splitVerses(lyrics).filter((v) => v.filter((l) => l.trim().length > 0).length >= 6);
      if (verses.length === 0) continue;
      const verseLines = pickRandom(verses).filter((l) => l.trim().length > 0);
      if (verseLines.length < 6) continue;
      // Choose 6 lines: prefer contiguous window when possible
      let selected;
      let startIndex = 0;
      if (verseLines.length === 6) {
        selected = verseLines;
        startIndex = 0;
      } else {
        const maxStart = verseLines.length - 6;
        const start = Math.floor(Math.random() * (maxStart + 1));
        selected = verseLines.slice(start, start + 6);
        startIndex = start;
      }
      return NextResponse.json({
        artist,
        title,
        verse: verseLines.join("\n"),
        lines: selected,
        startIndex,
      });
    }
    return NextResponse.json({ error: "Could not find verse with 6 lines" }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}


