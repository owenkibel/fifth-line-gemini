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

interface MediaPrompts {
  keyframePrompt: string;
  motionPrompt: string;
  artDirectedVersePrompt: string;
}

interface LimerickData {
  title: string;
  lines: LimerickLine[];
  meterCompliant: boolean;
  humorSummary: string;
  visualPrompt?: string;
  model?: string;
  mediaPrompts?: MediaPrompts;
}

interface SavedLimerick extends LimerickData {
  id: string;
  topic: string;
  afterHours: boolean;
  model: string;
  createdAt: string;
}

const STORAGE_KEY = "fifth_line_gemini_history";

const MODEL_OPTIONS = [
  {
    id: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash-Lite (Fastest • Minimal Thinking)",
  },
  {
    id: "gemini-3.8-flash",
    label: "Gemini 3.8 Flash (Balanced • Low Thinking)",
  },
  {
    id: "gemini-4-argon",
    label: "Gemini 4 Argon (Deep Satire • Low Thinking)",
  },
];

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function slugify(text: string): string {
  return (
    (text || "limerick")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
      .slice(0, 48) || "limerick"
  );
}

export default function LimerickGenerator() {
  const [topic, setTopic] = useState("");
  const [afterHours, setAfterHours] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-3.5-flash-lite");
  const [loading, setLoading] = useState(false);
  const [visualizing, setVisualizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPoem, setCurrentPoem] = useState<SavedLimerick | null>(null);
  const [history, setHistory] = useState<SavedLimerick[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  function updateRecordInHistory(updatedRecord: SavedLimerick) {
    setCurrentPoem(updatedRecord);
    setHistory((prev) => {
      const next = prev.map((item) =>
        item.id === updatedRecord.id ? updatedRecord : item
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error("Failed to update localStorage", e);
      }
      return next;
    });
  }

  function saveToHistory(
    poemData: LimerickData,
    promptTopic: string,
    isAfterHours: boolean,
    requestedModel: string
  ): SavedLimerick {
    const record: SavedLimerick = {
      ...poemData,
      id: generateId(),
      topic: promptTopic,
      afterHours: isAfterHours,
      model: poemData.model || requestedModel || "gemini-3.5-flash-lite",
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
        body: JSON.stringify({
          topic,
          afterHours,
          model: selectedModel,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.details || result.error || "Generation failed");
      }

      const savedRecord = saveToHistory(result, topic, afterHours, selectedModel);
      setCurrentPoem(savedRecord);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function generateVisuals(poem: SavedLimerick) {
    setVisualizing(true);
    setError(null);

    try {
      const res = await fetch("/api/visualize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: poem.title,
          limerick: poem.lines.map((l) => l.text).join("\n"),
          punchline: poem.humorSummary,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.details || result.error || "Visualization failed");
      }

      const updatedRecord: SavedLimerick = {
        ...poem,
        mediaPrompts: result,
      };

      updateRecordInHistory(updatedRecord);
    } catch (err: any) {
      setError(err.message || "Failed to generate visual prompts.");
    } finally {
      setVisualizing(false);
    }
  }

  function getCleanText(poem: SavedLimerick): string {
    const lines = poem.lines.map((l) => l.text.trimEnd()).join("\n");
    return `${poem.title}\n\n${lines}`;
  }

  async function copyText(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error("Clipboard write failed", err);
    }
  }

  function generateMarkdown(poem: SavedLimerick): string {
    // Strip trailing spaces so Astro's pre-line CSS renders consecutive lines cleanly
    const body = poem.lines.map((l) => l.text.trimEnd()).join("\n");
    const syllables = poem.lines.map((l) => l.syllableCount).join(", ");
    const isoDate = poem.createdAt || new Date().toISOString();
    const pubDate = isoDate.split("T")[0];
    const modelUsed = poem.model || "gemini-3.5-flash-lite";
    const modelTag = modelUsed.toLowerCase().replace(/[^a-z0-9-]+/g, "-");

    const tags = Array.from(
      new Set([
        "limerick",
        "fifth-line",
        "poetry",
        modelTag,
        ...(poem.afterHours ? ["after-hours"] : []),
      ])
    );

    const telemetryBlock = poem.lines
      .map(
        (l) =>
          `- Line ${l.lineNumber} [${l.rhymeToken}]: ${l.syllableCount} syllables`
      )
      .join("\n");

    // Collect single-pass visualPrompt + optional 2nd-pass keyframePrompt for verse-render.js
    const scenePrompts: string[] = [];
    if (poem.visualPrompt?.trim()) {
      scenePrompts.push(poem.visualPrompt.trim());
    }
    if (
      poem.mediaPrompts?.keyframePrompt &&
      poem.mediaPrompts.keyframePrompt.trim() !== poem.visualPrompt?.trim()
    ) {
      scenePrompts.push(poem.mediaPrompts.keyframePrompt.trim());
    }

    let mediaStagingSection = "";
    if (poem.mediaPrompts) {
      mediaStagingSection = `

## Generative Media Prompts

### Text-to-Image Keyframe
\`\`\`
${poem.mediaPrompts.keyframePrompt}
\`\`\`

### Image-to-Video Motion
\`\`\`
${poem.mediaPrompts.motionPrompt}
\`\`\`

### Direct Video (Art-Directed Verse)
\`\`\`
${poem.mediaPrompts.artDirectedVersePrompt}
\`\`\``;
    }

    const visualPromptsSection =
      scenePrompts.length > 0
        ? `\n\n---\n\n## Visual Scene Prompts\n` +
          scenePrompts.map((p, idx) => `Prompt ${idx + 1}: ${p}`).join("\n")
        : "";

    return [
      "---",
      `title: ${JSON.stringify(poem.title || "Untitled Limerick")}`,
      `date: "${isoDate}"`,
      `pubDate: "${pubDate}"`,
      `author: ${JSON.stringify(`Fifth Line (${modelUsed})`)}`,
      `source: "fifth-line"`,
      `domain: "artistic"`,
      `topic: ${JSON.stringify(poem.topic || "")}`,
      `model: ${JSON.stringify(modelUsed)}`,
      `afterHours: ${Boolean(poem.afterHours)}`,
      `meterCompliant: ${Boolean(poem.meterCompliant)}`,
      `syllables: [${syllables}]`,
      `punchline: ${JSON.stringify(poem.humorSummary || "")}`,
      `rendered: false`,
      `status: "draft_prompts"`,
      `tags: [${tags.map((t) => JSON.stringify(t)).join(", ")}]`,
      "---",
      "",
      `> **Topic:** ${poem.topic} • **Engine:** \`${modelUsed}\`${
        poem.afterHours ? " • **Mode:** *After Hours*" : ""
      }`,
      "",
      body,
      "",
      `*Punchline: ${poem.humorSummary}*`,
      "",
      "---",
      "",
      "### Prosody Telemetry",
      telemetryBlock + mediaStagingSection + visualPromptsSection,
      "",
    ].join("\n");
  }

  function downloadSingleMarkdown(poem: SavedLimerick) {
    const content = generateMarkdown(poem);
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verse-limerick-${slugify(poem.title)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadBatchZip() {
    if (history.length === 0) return;

    const zip = new JSZip();
    const slice = history.slice(0, 40);
    const stamp = new Date().toISOString().slice(0, 10);
    const usedSlugs = new Set<string>();

    const indexLines: string[] = [
      "---",
      `title: "Fifth Line Limerick Archive (${stamp})"`,
      `date: "${new Date().toISOString()}"`,
      `pubDate: "${stamp}"`,
      `author: "Fifth Line Archive"`,
      `source: "fifth-line"`,
      `domain: "artistic"`,
      `tags: ["archive", "limerick", "fifth-line"]`,
      "---",
      "",
      `# Fifth Line Limerick Archive (${stamp})`,
      "",
      `Exported ${slice.length} anapestic limerick(s).`,
      "",
    ];

    slice.forEach((poem, idx) => {
      const baseSlug = `verse-limerick-${slugify(
        poem.title || poem.topic || `item-${idx + 1}`
      )}`;
      let uniqueSlug = baseSlug;
      let counter = 2;
      while (usedSlugs.has(uniqueSlug)) {
        uniqueSlug = `${baseSlug}-${counter++}`;
      }
      usedSlugs.add(uniqueSlug);

      zip.file(`${uniqueSlug}.md`, generateMarkdown(poem));

      // Extensionless relative link so Astro never 404s
      indexLines.push(
        `${idx + 1}. **[${poem.title}](./${uniqueSlug})** — *"${
          poem.topic
        }"* (\`${poem.model || "gemini-3.5-flash-lite"}\`)`
      );
    });

    zip.file(`archive-index-${stamp}.md`, indexLines.join("\n") + "\n");

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `limericks-slice-${stamp}.zip`;
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
        <h1 className="text-3xl font-bold tracking-tight">
          Fifth Line: Gemini Edition
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Anapestic limerick engine with prosody telemetry and ComfyUI / Astro
          staging.
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

        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-2">
            <label
              htmlFor="modelSelect"
              className="text-xs font-medium text-zinc-500"
            >
              Engine:
            </label>
            <select
              id="modelSelect"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            >
              {MODEL_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
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
        </div>
      </form>

      {error && (
        <div className="border border-red-200 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 p-4 rounded-xl mb-6 text-sm font-mono">
          {error}
        </div>
      )}

      {currentPoem && (
        <article className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 bg-zinc-50/50 dark:bg-zinc-900/50 shadow-sm mb-10">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
            <h2 className="text-xl font-bold">{currentPoem.title}</h2>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                {currentPoem.model || "gemini-3.5-flash-lite"}
              </span>
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
              <div
                key={line.lineNumber}
                className="flex justify-between items-baseline gap-4"
              >
                <span>{line.text}</span>
                <span className="text-xs font-mono text-zinc-400 shrink-0">
                  {line.syllableCount} syll • [{line.rhymeToken}]
                </span>
              </div>
            ))}
          </div>

          <p className="text-sm text-zinc-500 italic border-t border-zinc-200 dark:border-zinc-800 pt-4 mb-4">
            Punchline: {currentPoem.humorSummary}
          </p>

          {currentPoem.visualPrompt && (
            <div className="rounded-lg bg-zinc-100/70 dark:bg-zinc-800/40 p-3 text-xs mb-5 border border-zinc-200/60 dark:border-zinc-800">
              <div className="flex justify-between items-center mb-1 text-zinc-500">
                <span className="font-semibold">
                  Single-Pass Scene Prompt (Staged for verse-render.js)
                </span>
                <button
                  onClick={() =>
                    copyText(currentPoem.visualPrompt!, "single-visual")
                  }
                  className="hover:underline text-blue-600 dark:text-blue-400"
                >
                  {copiedKey === "single-visual" ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="font-mono text-zinc-700 dark:text-zinc-300 select-all">
                {currentPoem.visualPrompt}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 mb-6">
            <button
              onClick={() => copyText(getCleanText(currentPoem), "poem")}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              {copiedKey === "poem" ? "Copied Verse!" : "Copy Poem"}
            </button>
            <button
              onClick={() => downloadSingleMarkdown(currentPoem)}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              Export .md
            </button>
            <button
              onClick={() => generateVisuals(currentPoem)}
              disabled={visualizing}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition disabled:opacity-50"
            >
              {visualizing
                ? "Directing Media Prompts..."
                : currentPoem.mediaPrompts
                ? "Regenerate Media Prompts"
                : "Stage Video Prompts (I2V / T2V)"}
            </button>
          </div>

          {/* Extended Video/Media Prompts Display */}
          {currentPoem.mediaPrompts && (
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Extended Media Staging (T2I / I2V / T2V)
              </h3>

              {/* T2I Keyframe */}
              <div className="rounded-lg bg-zinc-100/60 dark:bg-zinc-800/40 p-3 text-xs">
                <div className="flex justify-between items-center mb-1 text-zinc-500">
                  <span className="font-semibold">
                    Keyframe Prompt (T2I / Start Frame)
                  </span>
                  <button
                    onClick={() =>
                      copyText(currentPoem.mediaPrompts!.keyframePrompt, "t2i")
                    }
                    className="hover:underline text-blue-600 dark:text-blue-400"
                  >
                    {copiedKey === "t2i" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="font-mono text-zinc-700 dark:text-zinc-300 select-all">
                  {currentPoem.mediaPrompts.keyframePrompt}
                </p>
              </div>

              {/* I2V Motion */}
              <div className="rounded-lg bg-zinc-100/60 dark:bg-zinc-800/40 p-3 text-xs">
                <div className="flex justify-between items-center mb-1 text-zinc-500">
                  <span className="font-semibold">
                    Motion Directive (I2V / Camera & Physics)
                  </span>
                  <button
                    onClick={() =>
                      copyText(currentPoem.mediaPrompts!.motionPrompt, "i2v")
                    }
                    className="hover:underline text-blue-600 dark:text-zinc-400"
                  >
                    {copiedKey === "i2v" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="font-mono text-zinc-700 dark:text-zinc-300 select-all">
                  {currentPoem.mediaPrompts.motionPrompt}
                </p>
              </div>

              {/* T2V Art-Directed Verse */}
              <div className="rounded-lg bg-zinc-100/60 dark:bg-zinc-800/40 p-3 text-xs">
                <div className="flex justify-between items-center mb-1 text-zinc-500">
                  <span className="font-semibold">
                    Art-Directed Verse (Direct T2V)
                  </span>
                  <button
                    onClick={() =>
                      copyText(
                        currentPoem.mediaPrompts!.artDirectedVersePrompt,
                        "t2v"
                      )
                    }
                    className="hover:underline text-blue-600 dark:text-blue-400"
                  >
                    {copiedKey === "t2v" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="font-mono text-zinc-700 dark:text-zinc-300 select-all">
                  {currentPoem.mediaPrompts.artDirectedVersePrompt}
                </p>
              </div>
            </div>
          )}
        </article>
      )}

      {/* History Archive */}
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
                  <span className="text-zinc-400 text-xs truncate">
                    &ldquo;{poem.topic}&rdquo;
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                    {(poem.model || "3.8-flash").replace("gemini-", "")}
                  </span>
                  {(poem.visualPrompt || poem.mediaPrompts) && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium">
                      Visualized
                    </span>
                  )}
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