import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { MessagePart } from "../types";

export const generateContent = async (
  prompt: string,
  attachments: { mimeType: string; data: string }[],
  modelId: string,
  customApiKey?: string,
  customBaseUrl?: string,
  config?: any,
  systemInstruction?: string
): Promise<MessagePart[]> => {
  
  // Initialize with custom key/url if provided, otherwise fallback to environment
  const options: any = { 
    apiKey: customApiKey || process.env.API_KEY 
  };

  if (customBaseUrl) {
    options.baseUrl = customBaseUrl;
  }

  const ai = new GoogleGenAI(options);

  const parts: any[] = [];

  // Add attachments first (images to be analyzed or combined)
  attachments.forEach((att) => {
    parts.push({
      inlineData: {
        mimeType: att.mimeType,
        data: att.data,
      },
    });
  });

  // Add text prompt
  if (prompt) {
    parts.push({ text: prompt });
  }

  // Merge system instruction into config
  const finalConfig = { ...(config || {}) };
  if (systemInstruction) {
    finalConfig.systemInstruction = systemInstruction;
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelId,
      contents: { parts: parts },
      config: finalConfig
    });

    // 1. Check for Prompt Feedback (Blocked before processing)
    if (response.promptFeedback?.blockReason) {
        throw new Error(`PROMPT_BLOCKED: ${response.promptFeedback.blockReason}`);
    }

    const responseParts: MessagePart[] = [];
    const candidate = response.candidates?.[0];

    // 2. Check for Candidate Finish Reason
    if (candidate) {
        if (candidate.finishReason === 'SAFETY') {
            throw new Error('FINISH_SAFETY');
        }
        if (candidate.finishReason === 'RECITATION') {
            throw new Error('FINISH_RECITATION');
        }
        if (candidate.finishReason === 'OTHER') {
            // Sometimes 'OTHER' implies a filter that isn't strictly safety but still blocks content
            // We'll check if there is content, if not, throw error.
             if (!candidate.content?.parts?.length) {
                 throw new Error('FINISH_OTHER');
             }
        }
    }

    // 3. Parse Content
    const candidateContent = candidate?.content;

    if (candidateContent && candidateContent.parts) {
      for (const part of candidateContent.parts) {
        if (part.text) {
          responseParts.push({ text: part.text });
        } else if (part.inlineData) {
          responseParts.push({
            inlineData: {
              mimeType: part.inlineData.mimeType,
              data: part.inlineData.data,
            },
          });
        }
      }
    }

    // Fallback if strict text property usage
    if (responseParts.length === 0 && response.text) {
        responseParts.push({ text: response.text });
    }

    // 4. Final check: If success but no content found
    if (responseParts.length === 0) {
        throw new Error('NO_CONTENT_RETURNED');
    }

    return responseParts;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};