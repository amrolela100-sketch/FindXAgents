import { GoogleGenerativeAI } from "@google/generative-ai";

let _client: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  if (!_client) {
    _client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _client;
}

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export async function generateWithGemini(prompt: string, model = "gemini-1.5-flash"): Promise<string> {
  const client = getGeminiClient();
  const genModel = client.getGenerativeModel({ model });
  const result = await genModel.generateContent(prompt);
  return result.response.text();
}
