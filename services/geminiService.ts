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
    const roomContext = availableRooms.map(r => `${r.name} (${r.type}): RM${r.price}/night. Features: ${r.amenities.join(', ')}.`).join('\n');
    
    const systemInstruction = `You are "Lux", the AI Concierge for Mi Le Garden Hotel. 
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

export const generateMarketingContent = async (room: Room): Promise<string> => {
  try {
    const prompt = `Create a promotional Instagram post for this hotel room at Mi Le Garden:
    Name: ${room.name}
    Type: ${room.type}
    Features: ${room.amenities.join(', ')}
    Description: ${room.description}
    
    Include engaging emojis and 3-5 relevant hashtags.`;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    
    return response.text || "Check out our amazing room! #MiLeGarden";
  } catch (error) {
    console.error("Gemini Marketing Error:", error);
    return "Could not generate marketing content at this time.";
  }
};

export const analyzePricing = async (room: Room): Promise<string> => {
  try {
    const prompt = `Act as a Hotel Revenue Manager. Analyze the pricing for this room:
    Name: ${room.name}
    Price: RM${room.price} (Weekday)
    Type: ${room.type}
    Amenities: ${room.amenities.join(', ')}
    
    Is this price competitive for a luxury hotel? Provide a 2-sentence assessment and a suggestion.`;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    
    return response.text || "Pricing analysis unavailable.";
  } catch (error) {
    console.error("Gemini Pricing Error:", error);
    return "Could not analyze pricing at this time.";
  }
};