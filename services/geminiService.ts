import { GoogleGenAI } from "@google/genai";
import { Room } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelId = "gemini-2.5-flash";

export const generateRoomDescription = async (name: string, type: string, amenities: string[]): Promise<string> => {
  try {
    const prompt = `Write a captivating and luxurious description (approx 60-80 words) for a hotel accommodation with the following details:
    Name: ${name}
    Type: ${type}
    Amenities: ${amenities.join(', ')}
    
    Make it sound inviting and exclusive.`;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    
    return response.text || "Enjoy a wonderful stay with us.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Experience luxury and comfort in this beautiful accommodation. (AI Description unavailable)";
  }
};

export const getConciergeResponse = async (history: {role: string, text: string}[], currentMessage: string, availableRooms: Room[]) => {
  try {
    const roomContext = availableRooms.map(r => `${r.name} (${r.type}): $${r.price}/night. Features: ${r.amenities.join(', ')}.`).join('\n');
    
    const systemInstruction = `You are "Lux", the AI Concierge for LuxStay Hotel. 
    Your goal is to help customers find the perfect room and answer questions about the hotel.
    
    Here is the current list of available rooms:
    ${roomContext}
    
    Rules:
    - Be polite, professional, and helpful.
    - If asked about availability, refer to the list above.
    - If asked about price, quote the prices from the list.
    - Keep responses concise (under 100 words) unless detailed info is requested.
    `;

    const contents = [
      ...history.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      })),
      { role: 'user', parts: [{ text: currentMessage }] }
    ];

    const response = await ai.models.generateContent({
      model: modelId,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || "I apologize, I am having trouble connecting to the concierge service right now.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "I'm having a bit of trouble right now. Please try again later.";
  }
};
