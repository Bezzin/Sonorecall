import { GoogleGenAI, Modality, Type, FunctionDeclaration } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  generateMissedCallResponse: async (clinicName: string, callerNumber: string): Promise<string> => {
    const prompt = `You are a helpful assistant for a clinic named "${clinicName}". A person from the number ${callerNumber} called, but the clinic missed the call. Write a short, friendly, and professional SMS message to send to this number. Apologize for missing the call and ask how you can help, suggesting they can reply to book an appointment or ask a question.`;
    
    try {
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
      });
      return response.text;
    } catch (error) {
        console.error("Error generating missed call response:", error);
        // Fallback to a static message on error
        return `Hi there! This is ${clinicName}. We're sorry we missed your call. How can we help you today? You can reply to this message directly to book an appointment or ask a question.`;
    }
  },

  generateReviewRequest: async (clinicName: string, patientName: string): Promise<string> => {
    const prompt = `You are a helpful assistant for a clinic named "${clinicName}". A patient named ${patientName} just visited. Write a short, friendly, and professional SMS message to thank them for their visit and ask them to leave a review of their experience. Include a placeholder like "[Google Review Link]".`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating review request:", error);
        // Fallback to a static message on error
        return `Hi ${patientName}, thank you for visiting ${clinicName} today! We'd love to hear about your experience. If you have a moment, please leave us a review at: [Google Review Link]`;
    }
  },

  editImageWithPrompt: async (base64ImageData: string, mimeType: string, prompt: string): Promise<string | null> => {
    try {
      const imagePart = {
        inlineData: {
          mimeType,
          data: base64ImageData,
        },
      };

      const textPart = {
        text: prompt,
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, textPart] },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return part.inlineData.data;
        }
      }
      return null;

    } catch (error) {
      console.error("Error editing image:", error);
      throw error;
    }
  },

  generateVideoFromImage: async (base64ImageData: string, mimeType: string, aspectRatio: '16:9' | '9:16', prompt?: string): Promise<string> => {
    try {
      const aiForVideo = new GoogleGenAI({ apiKey: process.env.API_KEY });

      let operation = await aiForVideo.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt || 'Animate this 4D ultrasound scan with a gentle, slow-moving effect to bring it to life.',
        image: {
          imageBytes: base64ImageData,
          mimeType: mimeType,
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: aspectRatio,
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await aiForVideo.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        // The API key must be appended to the download link for access.
        return `${downloadLink}&key=${process.env.API_KEY}`;
      }

      throw new Error("Video generation completed, but the API response was empty.");
    } catch (error) {
      console.error("Error generating video:", error);
      throw error;
    }
  },
  
  syncClinicInfo: async (clinicName: string, clinicWebsite: string): Promise<{ address: string; phone: string; services: { name: string; price: string }[] }> => {
    try {
      // Step 1: Use Google Search grounded on the specific website to get unstructured information.
      const searchResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Provide a summary of the clinic named "${clinicName}" using information primarily from their official website: ${clinicWebsite}. Include its primary address, main phone number, and a list of key services or packages offered with their prices.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const searchResultText = searchResponse.text;
      if (!searchResultText) {
          throw new Error("Google Search did not return any information for the clinic's website.");
      }

      // Step 2: Use a second call to extract the structured data from the search result.
      const extractionResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `From the following text, extract the primary address, main phone number, and a list of key services or packages with their prices. \n\nText: "${searchResultText}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              address: {
                type: Type.STRING,
                description: 'The full address of the clinic.',
              },
              phone: {
                type: Type.STRING,
                description: 'The main contact phone number of the clinic.',
              },
              services: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                   properties: {
                      name: { type: Type.STRING, description: 'The name of the service or package.' },
                      price: { type: Type.STRING, description: 'The price of the service, including currency symbol.' }
                    },
                    required: ["name"]
                },
                description: 'A list of services or packages the clinic offers with their prices (e.g., "4D Scan Package - £150").',
              },
            },
            required: ["address", "phone", "services"],
          },
        },
      });

      const jsonString = extractionResponse.text.trim();
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("Error syncing clinic info:", error);
      throw new Error("Failed to fetch clinic information from the web.");
    }
  },
};
