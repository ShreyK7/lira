import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are not set");
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    
    const minZipf = 4.0;
    const maxZipf = 6.9;
    const maxWeight = 10; // words near 6.9 should be ~10x likelier than near 4.0

    function weightFromZipf(zipf) {
      const clamped = Math.max(minZipf, Math.min(maxZipf, Number(zipf)));
      const t = (clamped - minZipf) / (maxZipf - minZipf); // 0..1
      return 1 + (maxWeight - 1) * t; // 1..10 linearly with Zipf
    }

    // Rejection sampling: pick a random offset uniformly, then accept with Zipf-based weight
    const maxTries = 10;
    for (let i = 0; i < maxTries; i++) {
      const { count, error: countErr } = await supabase
        .from("English_Words_Realtime")
        .select("Word, Zipf-value", { count: "exact", head: true });
      if (countErr) {
        return NextResponse.json({ error: countErr.message }, { status: 500 });
      }
      if (!count || count <= 0) break;

      const offset = Math.floor(Math.random() * count);
      const { data: randomPick, error: randomErr } = await supabase
        .from("English_Words_Realtime")
        .select("Word, Zipf-value")
        .range(offset, offset);
      if (randomErr) {
        return NextResponse.json({ error: randomErr.message }, { status: 500 });
      }

      const row = Array.isArray(randomPick) && randomPick.length > 0 ? randomPick[0] : null;
      if (!row || !row.Word) continue;

      const w = weightFromZipf(row["Zipf-value"]);
      const accept = Math.random() * maxWeight < w;
      if (accept) {
        return NextResponse.json({ word: row.Word });
      }
    }

    // Fallback: return the highest Zipf word
    const { data: topData, error: topErr } = await supabase
      .from("English_Words_Realtime")
      .select("Word, Zipf-value")
      .order("Zipf-value", { ascending: false })
      .limit(1);

    if (topErr) {
      return NextResponse.json({ error: topErr.message }, { status: 500 });
    }
    const top = Array.isArray(topData) && topData.length > 0 ? topData[0] : null;
    if (!top || !top.Word) {
      return NextResponse.json({ error: "No word found" }, { status: 404 });
    }
    return NextResponse.json({ word: top.Word });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


