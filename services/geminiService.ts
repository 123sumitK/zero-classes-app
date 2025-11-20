import { GoogleGenAI } from "@google/genai";

const initAI = () => {
  if (!process.env.API_KEY) return null;
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateCourseOutline = async (topic: string): Promise<string> => {
  const ai = initAI();
  if (!ai) return "Gemini API Key missing.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a brief, engaging 2-sentence description for a course about: ${topic}. Then list 3 key learning outcomes bullet points.`,
    });
    return response.text || "No description generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to generate content. Please try again.";
  }
};

export const askTutor = async (question: string, context: string): Promise<string> => {
  const ai = initAI();
  if (!ai) return "Gemini API Key missing.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Context: The student is asking about: ${context}.
      Question: ${question}
      
      Provide a helpful, encouraging answer as an AI Tutor. Keep it under 100 words.`,
    });
    return response.text || "I couldn't find an answer for that.";
  } catch (error) {
    return "Sorry, I'm having trouble connecting to the knowledge base.";
  }
};