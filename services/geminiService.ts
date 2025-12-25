import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini AI client
// The API key is guaranteed to be available in process.env.API_KEY
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analyzes an image using Gemini Vision to determine accident severity.
 */
export const analyzeEmergencyImage = async (base64DataUrl: string) => {
  try {
    // Extract MIME type and base64 data
    const matches = base64DataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("Invalid base64 image format");
    }
    const mimeType = matches[1];
    const data = matches[2];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { 
            inlineData: { 
              mimeType: mimeType, 
              data: data 
            } 
          },
          { 
            text: "Analyze this accident image for emergency responders. Return ONLY a JSON object with these fields: severity (High/Medium/Low), type (Car/Bike/Pedestrian/Other), and immediateAction (short concise medical or dispatch recommendation, e.g., 'Send ALS Ambulance')." 
          }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return null;
  }
};

/**
 * Placeholder for future implementation of symptom checker
 */
export const checkSymptoms = async (symptoms: string) => {
  // TODO: Implement reasoning
  return "Symptom check not implemented yet";
};