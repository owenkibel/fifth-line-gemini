// app/api/visualize/route.ts
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const apiKey = process.env.GEMINI_API_KEY1;
const MODEL_NAME = "gemini-3.8-flash";

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set." },
        { status: 500 }
      );
    }

    const { title, limerick, punchline } = await req.json();

    if (!title || !limerick) {
      return NextResponse.json(
        { error: "Title and limerick text are required." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction =
      "You are an expert cinematic art director and visual prompting engineer. " +
      "Your task is to adapt short humorous limericks into production-ready prompts for " +
      "modern generative image and video models (e.g., Flux, Midjourney, LTX-Video, Wan). " +
      "Avoid cliché AI filler words (like 'photorealistic', 'hyper-detailed', '8k'). " +
      "Focus on physical staging, light, lens, era, comic expression, and temporal action.";

    const prompt = `Adapt the following limerick into three distinct media generation prompts:

Title: "${title}"
Punchline context: "${punchline || "Comic irony"}"

Verse:
${limerick}

Generate:
1. keyframePrompt: A static image prompt (T2I) capturing the comic composition right at or immediately before the punchline.
2. motionPrompt: An image-to-video (I2V) animation directive describing camera move, character physics, and reactions across 4-5 seconds starting from that keyframe.
3. artDirectedVersePrompt: The 'Peacock Strategy' for text-to-video (T2V) — an aesthetic medium/director wrapper framing the core narrative of the poem without losing its punch.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            keyframePrompt: {
              type: "string",
              description: "Text-to-Image prompt for starting frame / key visual.",
            },
            motionPrompt: {
              type: "string",
              description: "Image-to-Video motion and camera direction for the keyframe.",
            },
            artDirectedVersePrompt: {
              type: "string",
              description: "Text-to-Video full narrative prompt using artistic styling.",
            },
          },
          required: ["keyframePrompt", "motionPrompt", "artDirectedVersePrompt"],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini.");
    }

    return NextResponse.json(JSON.parse(responseText));
  } catch (error: any) {
    console.error("Visualize API Error:", error);
    return NextResponse.json(
      { error: "Media prompt generation failed", details: error.message },
      { status: 500 }
    );
  }
}