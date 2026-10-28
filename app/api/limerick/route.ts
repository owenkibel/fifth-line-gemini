// app/api/limerick/route.ts
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { NextResponse } from "next/server";

const apiKey = process.env.GEMINI_API_KEY1 || process.env.GEMINI_API_KEY;

// Default model if the frontend does not send a `model` parameter yet:
const DEFAULT_MODEL = "gemini-3.5-flash-lite";

const MODEL_CONFIGS: Record<
  string,
  { thinkingLevel: "minimal" | "low"; supportsTemperature: boolean }
> = {
  "gemini-3.5-flash-lite": {
    thinkingLevel: "minimal",
    supportsTemperature: true,
  },
  "gemini-3.8-flash": {
    thinkingLevel: "low",
    supportsTemperature: true,
  },
  "gemini-4-argon": {
    thinkingLevel: "low",
    supportsTemperature: false, // Omit temperature for gemini-4-argon
  },
};

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY1 is not set in environment variables." },
        { status: 500 }
      );
    }

    const { topic, afterHours, model } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const selectedModel =
      model && MODEL_CONFIGS[model] ? model : DEFAULT_MODEL;
    const modelSpec = MODEL_CONFIGS[selectedModel];

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = afterHours
      ? "You are an uncensored, witty 19th-century British tavern poet in the tradition of bawdy, earthy limericks (like Norman Douglas and tavern rugby verse). You embrace ribald humor, saucy double-entendres, cheeky adult innuendo, and mischievous earthy punchlines without being purely clinical or gratuitously crude. Maintain strict classical anapestic meter."
      : "You are an exacting poet and prosody scholar. You strictly follow classical anapestic limerick meter without cutting syllables. Witty, clever, and sharp.";

    const prompt = `Write a ${afterHours ? "bawdy, earthy, double-entendre-laden" : "witty"} limerick about: "${topic}".
Rules:
- Line 1, 2, and 5 must have 8-9 syllables (3 anapestic beats) and rhyme together (A).
- Line 3 and 4 must have 5-6 syllables (2 anapestic beats) and rhyme together (B).
- Rigorously compute and verify your own syllable counts in the schema.
- Also provide a vivid 1-sentence visualPrompt (satirical editorial illustration or 19th-century caricature style, no text in image) capturing the limerick's scene.`;

    const config: Record<string, any> = {
      systemInstruction,
      responseMimeType: "application/json",
      thinkingConfig: {
        thinkingLevel: modelSpec.thinkingLevel as any,
      },
      // Using typed SDK enums with BLOCK_NONE across all categories:
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
      responseSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          lines: {
            type: "array",
            description: "Five lines of the limerick in order (AABBA).",
            items: {
              type: "object",
              properties: {
                lineNumber: { type: "integer" },
                text: { type: "string" },
                syllableCount: {
                  type: "integer",
                  description:
                    "Count of syllables (Lines 1,2,5 = 8-9; Lines 3,4 = 5-6)",
                },
                rhymeToken: {
                  type: "string",
                  description:
                    "Ending rhyming sound or letter code (e.g., 'A' or 'B')",
                },
              },
              required: ["lineNumber", "text", "syllableCount", "rhymeToken"],
            },
          },
          meterCompliant: { type: "boolean" },
          humorSummary: { type: "string" },
          visualPrompt: {
            type: "string",
            description:
              "A single vivid sentence describing an editorial illustration or caricature of this limerick's scene for ComfyUI.",
          },
        },
        required: [
          "title",
          "lines",
          "meterCompliant",
          "humorSummary",
          "visualPrompt",
        ],
      },
    };

    if (modelSpec.supportsTemperature) {
      config.temperature = afterHours ? 0.9 : 0.75;
    }

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: prompt,
      config,
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response received from Gemini.");
    }

    const parsedData = JSON.parse(responseText);

    return NextResponse.json({
      ...parsedData,
      model: selectedModel,
    });
  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: "Generation failed", details: error.message },
      { status: 500 }
    );
  }
}