// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import JSZip from "jszip";

interface LimerickLine {
  lineNumber: number;
  text: string;
  syllableCount: number;
  rhymeToken: string;
}

interface LimerickData {
  title: string;
  lines: LimerickLine[];
  meterCompliant: boolean;
  humorSummary: string;
  model?: string; // <-- Add optional model field
}

interface SavedLimerick extends LimerickData {
  id: string;
  topic: string;
  afterHours: boolean;
  model: string; // <-- Add model to stored record
  createdAt: string;
}

const STORAGE_KEY = "fifth_line_gemini_history";

// Resilient ID generator for both HTTPS and LAN HTTP environments
function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "") || "limerick"
  );
}

export default function LimerickGenerator() {
  const [topic, setTopic] = useState("");
  const [afterHours, setAfterHours] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPoem, setCurrentPoem] = useState<SavedLimerick | null>(null);
  const [history, setHistory] = useState<SavedLimerick[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: SavedLimerick[] = JSON.parse(saved);
        setHistory(parsed);
        if (parsed.length > 0) {
          setCurrentPoem(parsed[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load history from localStorage", e);
    }
  }, []);

  function saveToHistory(
  poemData: LimerickData,
  promptTopic: string,
  isAfterHours: boolean
): SavedLimerick {
  const record: SavedLimerick = {
    ...poemData,
    id: generateId(),
    topic: promptTopic,
    afterHours: isAfterHours,
    model: poemData.model || "gemini-3.8-flash", // <-- Persist model
    createdAt: new Date().toISOString(),
  };

  setHistory((prev) => {
    const updated = [record, ...prev].slice(0, 100);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save to localStorage", e);
    }
    return updated;
  });

  return record;
}

  async function generatePoem(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/limerick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, afterHours }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.details || result.error || "Generation failed");
      }

      const savedRecord = saveToHistory(result, topic, afterHours);
      setCurrentPoem(savedRecord);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  function getCleanText(poem: SavedLimerick): string {
    const lines = poem.lines.map((l) => l.text).join("\n");
    return `${poem.title}\n\n${lines}`;
  }

  async function copyToClipboard(poem: SavedLimerick) {
    try {
      await navigator.clipboard.writeText(getCleanText(poem));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard write failed", err);
    }
  }

function generateMarkdown(poem: SavedLimerick): string {
  const body = poem.lines.map((l) => l.text).join("\n");
  const syllables = poem.lines.map((l) => l.syllableCount).join(", ");
  const safeTitle = poem.title.replace(/"/g, '\\"');
  const safeTopic = poem.topic.replace(/"/g, '\\"');
  const safePunchline = poem.humorSummary.replace(/"/g, '\\"');
  const modelUsed = poem.model || "gemini-3.8-flash";

  return `---
title: "${safeTitle}"
date: "${poem.createdAt}"
topic: "${safeTopic}"
model: "${modelUsed}"
afterHours: ${poem.afterHours}
meterCompliant: ${poem.meterCompliant}
syllables: [${syllables}]
punchline: "${safePunchline}"
tags:
  - limerick
  - poetry
---

${body}
`;
}

  function downloadSingleMarkdown(poem: SavedLimerick) {
    const content = generateMarkdown(poem);
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(poem.title)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadBatchZip() {
    if (history.length === 0) return;

    const zip = new JSZip();
    const slice = history.slice(0, 40);

    slice.forEach((poem) => {
      const datePrefix = poem.createdAt.split("T")[0];
      const filename = `${datePrefix}-${slugify(poem.title)}.md`;
      zip.file(filename, generateMarkdown(poem));
    });

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `limericks-slice-${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearHistory() {
    if (!confirm("Clear all locally saved limericks?")) return;
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
    setCurrentPoem(null);
  }

  return (
    <main className="max-w-2xl mx-auto py-12 px-4 font-sans text-zinc-900 dark:text-zinc-100">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Fifth Line: Gemini Edition</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Anapestic limerick generator with prosody telemetry and local archival.
        </p>
      </header>

      <form onSubmit={generatePoem} className="space-y-4 mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., An anaconda meeting a gander"
            className="flex-1 p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white px-5 py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition shrink-0"
          >
            {loading ? "Composing..." : "Generate"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={afterHours}
              onChange={(e) => setAfterHours(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            After Hours Mode {afterHours ? "🌙 (Ribald / Bawdy)" : "☀️ (Clean)"}
          </span>
        </div>
      </form>

      {error && (
        <div className="border border-red-200 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 p-4 rounded-xl mb-6 text-sm font-mono">
          {error}
        </div>
      )}

      {currentPoem && (
        <article className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 bg-zinc-50/50 dark:bg-zinc-900/50 shadow-sm mb-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">{currentPoem.title}</h2>
            <div className="flex items-center gap-2">
              {currentPoem.afterHours && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                  After Hours
                </span>
              )}
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  currentPoem.meterCompliant
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                }`}
              >
                {currentPoem.meterCompliant ? "Meter Verified" : "Meter Relaxed"}
              </span>
            </div>
          </div>

          <div className="space-y-3 font-serif text-lg leading-relaxed mb-6">
            {currentPoem.lines.map((line) => (
              <div key={line.lineNumber} className="flex justify-between items-baseline gap-4">
                <span>{line.text}</span>
                <span className="text-xs font-mono text-zinc-400 shrink-0">
                  {line.syllableCount} syll • [{line.rhymeToken}]
                </span>
              </div>
            ))}
          </div>

          <p className="text-sm text-zinc-500 italic border-t border-zinc-200 dark:border-zinc-800 pt-4 mb-6">
            Punchline: {currentPoem.humorSummary}
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={() => copyToClipboard(currentPoem)}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              {copied ? "Copied Clean Text!" : "Copy Poem"}
            </button>
            <button
              onClick={() => downloadSingleMarkdown(currentPoem)}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              Export .md
            </button>
          </div>
        </article>
      )}

      {history.length > 0 && (
        <section className="border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-baseline gap-2">
              <h3 className="font-semibold text-sm tracking-wide uppercase text-zinc-500">
                Local Archive ({history.length})
              </h3>
              <span className="text-xs text-zinc-400">Stored in browser</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={downloadBatchZip}
                className="text-xs bg-zinc-800 dark:bg-zinc-200 text-zinc-100 dark:text-zinc-900 font-medium px-3 py-1.5 rounded hover:opacity-90 transition"
              >
                Export Zip (Slice of {Math.min(history.length, 40)})
              </button>
              <button
                onClick={clearHistory}
                className="text-xs text-zinc-400 hover:text-red-500 px-2 py-1.5 transition"
              >
                Clear
              </button>
            </div>
          </div>

          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden max-h-64 overflow-y-auto text-sm">
            {history.map((poem) => (
              <li
                key={poem.id}
                onClick={() => setCurrentPoem(poem)}
                className={`p-3 flex justify-between items-center cursor-pointer transition ${
                  currentPoem?.id === poem.id
                    ? "bg-zinc-100 dark:bg-zinc-800 font-medium"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                }`}
              >
                <div className="truncate pr-4">
                  <span className="font-semibold mr-2">{poem.title}</span>
                  <span className="text-zinc-400 text-xs truncate">"{poem.topic}"</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {poem.afterHours && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-medium">
                      After Hours
                    </span>
                  )}
                  <time className="text-xs text-zinc-400 whitespace-nowrap">
                    {new Date(poem.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}