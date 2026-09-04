// app/api/limerick/route.ts
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { NextResponse } from "next/server";

const apiKey = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-3.8-flash";

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set in environment variables." },
        { status: 500 }
      );
    }

    const { topic, afterHours } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = afterHours
      ? "You are an uncensored, witty 19th-century British tavern poet in the tradition of bawdy, earthy limericks (like Norman Douglas and tavern rugby verse). You embrace ribald humor, saucy double-entendres, cheeky adult innuendo, and mischievous earthy punchlines without being purely clinical or gratuitously crude. Maintain strict classical anapestic meter."
      : "You are an exacting poet and prosody scholar. You strictly follow classical anapestic limerick meter without cutting syllables. Witty, clever, and clean.";

    const prompt = `Write a ${afterHours ? "bawdy, earthy, double-entendre-laden" : "witty"} limerick about: "${topic}".
Rules:
- Line 1, 2, and 5 must have 8-9 syllables and rhyme together (A).
- Line 3 and 4 must have 5-6 syllables and rhyme together (B).
- Rigorously compute and verify your own syllable counts in the schema.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: afterHours ? 0.9 : 0.7,
        responseMimeType: "application/json",
        // Using typed SDK enums to pass TypeScript compilation:
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
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
                    description: "Count of syllables (Lines 1,2,5 = 8-9; Lines 3,4 = 5-6)",
                  },
                  rhymeToken: {
                    type: "string",
                    description: "Ending rhyming sound or letter code (e.g., 'A' or 'B')",
                  },
                },
                required: ["lineNumber", "text", "syllableCount", "rhymeToken"],
              },
            },
            meterCompliant: { type: "boolean" },
            humorSummary: { type: "string" },
          },
          required: ["title", "lines", "meterCompliant", "humorSummary"],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response received from Gemini.");
    }

    const parsedData = JSON.parse(responseText);

    return NextResponse.json({
      ...parsedData,
      model: MODEL_NAME,
    });
  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: "Generation failed", details: error.message },
      { status: 500 }
    );
  }
}