import { GoogleGenAI, Type, Chat } from "@google/genai";
import { GrantApplication, ComparativeAnalysis, ContextItem } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }
  return new GoogleGenAI({ apiKey });
};

const formatGlobalContext = (items: ContextItem[]): string => {
  if (items.length === 0) return "";

  const links = items.filter(i => i.type === 'link');
  const docs = items.filter(i => i.type !== 'link');

  let contextString = "\n\nGLOBAL KNOWLEDGE BASE & CONTEXT:\n";
  
  if (links.length > 0) {
    contextString += "Relevant External Links (The user considers these sources authoritative):\n";
    links.forEach(l => {
      contextString += `- ${l.title}: ${l.content}\n`;
    });
  }

  if (docs.length > 0) {
    contextString += "\nOrganizational Knowledge (Presentations, Writings, Background):\n";
    docs.forEach(d => {
      contextString += `--- BEGIN SOURCE: ${d.title} ---\n${d.content.slice(0, 15000)}\n--- END SOURCE ---\n`;
    });
  }
  
  return contextString;
};

export const createGrantChat = (grants: GrantApplication[], contextItems: ContextItem[] = []): Chat => {
  const ai = getClient();
  
  const grantsJson = JSON.stringify(grants.map(g => ({
    title: g.title,
    outcome: g.outcome,
    content: g.content,
    amountRequested: g.amountRequested,
    amountAwarded: g.amountAwarded,
    locations: g.locations
  })), null, 2);

  const globalContext = formatGlobalContext(contextItems);

  const systemInstruction = `
    You are an expert grant analyst assistant. 
    You have been provided with a dataset of grant applications, their outcomes (WON/LOST), funding details, and locations.
    You also have access to a Global Knowledge Base containing relevant statistics and organizational writings.
    
    Your goal is to answer user questions specifically about this dataset and help them write better content using the Knowledge Base.
    You can calculate totals, compare specific applications, summarize content, or explain why specific grants might have won or lost based on the provided content.

    DATASET:
    ${grantsJson}

    ${globalContext}

    Always reference specific applications by title when relevant. Keep answers concise and helpful.
    If the user asks about statistics or topics covered in the Global Knowledge Base (e.g., homelessness stats), use that information to inform your answer.
  `;

  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction,
    },
  });
};

export const analyzeGrants = async (grants: GrantApplication[]): Promise<ComparativeAnalysis> => {
  const ai = getClient();
  
  // Serialize grants for the prompt
  const grantsJson = JSON.stringify(grants.map(g => ({
    title: g.title,
    outcome: g.outcome,
    content: g.content,
    amountRequested: g.amountRequested,
    amountAwarded: g.amountAwarded,
    locations: g.locations
  })), null, 2);

  const prompt = `
    Analyze the following list of grant applications and their outcomes (WON vs LOST). 
    Your goal is to identify the critical differentiating factors that led to success or failure.
    
    Specific Instructions:
    1.  **Funding Efficiency**: Analyze the 'amountAwarded' vs 'amountRequested'. For WON grants, determine if there is a pattern in grants that received 100% funding vs partial funding. Consider the funding magnitude as a factor.
    2.  **Location Analysis**: Consider the target locations ('TOSA SLC', 'TOSV SLC', 'TOSA Denver'). Identify if certain locations have higher success rates, or if specific project types or themes perform better in specific locations. Look for correlations between location and outcome.
    3.  **Differentiating Factors**: Focus on clarity of impact, budget specificity, sustainability, and language tone.
    4.  **Comparative Analysis**: Contrast the winners against the losers.

    Here are the applications:
    ${grantsJson}
  `;

  // Define the output schema structure using the Type enum
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      executiveSummary: {
        type: Type.STRING,
        description: "A high-level summary of the analysis comparing winners and losers, including observations on funding amounts and location-based trends.",
      },
      winningStrengths: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of common strengths found in winning applications.",
      },
      losingWeaknesses: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of common weaknesses found in losing applications.",
      },
      actionableAdvice: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Specific, actionable steps for a user to improve their grant writing.",
      },
      keyThemes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            sentiment: { type: Type.STRING, enum: ['POSITIVE', 'NEGATIVE', 'NEUTRAL'] },
            impactScore: { type: Type.NUMBER, description: "1 to 10 scale of importance" },
            frequency: { type: Type.NUMBER, description: "Count of occurrences" }
          },
          required: ['name', 'description', 'sentiment', 'impactScore', 'frequency']
        }
      },
      successRateByTheme: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                theme: { type: Type.STRING },
                rate: { type: Type.NUMBER, description: "Success rate (0.0 to 1.0) associated with this theme" }
            }
        }
      }
    },
    required: ["executiveSummary", "winningStrengths", "losingWeaknesses", "keyThemes", "actionableAdvice", "successRateByTheme"],
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2, // Low temperature for analytical consistency
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as ComparativeAnalysis;
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

export const generateSectionDraft = async (
  question: string,
  context: string,
  analysis: ComparativeAnalysis | null,
  contextItems: ContextItem[] = []
): Promise<string> => {
  const ai = getClient();

  const analysisContext = analysis 
    ? `
      Key learnings from successful grants to apply:
      - Strengths to emulate: ${analysis.winningStrengths.join(', ')}
      - Pitfalls to avoid: ${analysis.losingWeaknesses.join(', ')}
      - Actionable Advice: ${analysis.actionableAdvice.join(', ')}
      ` 
    : "No historical analysis available. Rely on general best practices.";

  const globalContext = formatGlobalContext(contextItems);

  const prompt = `
    You are an expert grant writer. Write a response to a specific grant application question.
    
    QUESTION:
    ${question}

    CONTEXT (Application Guidelines & Background):
    ${context}

    ${globalContext}

    STRATEGY (Based on analysis of past winners):
    ${analysisContext}

    INSTRUCTIONS:
    - Write a compelling, specific, and direct response.
    - Use professional, persuasive language.
    - Adopt the tone and style found in the "Organizational Knowledge" if available.
    - Incorporate relevant statistics from the "Relevant External Links" or Knowledge Base if they support the argument (e.g. homelessness stats).
    - Strictly adhere to any constraints found in the Question or Context.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text || "Failed to generate draft.";
};

export const refineSectionDraft = async (
  question: string,
  currentDraft: string,
  feedback: string
): Promise<string> => {
  const ai = getClient();

  const prompt = `
    You are editing a grant application response based on user feedback.

    QUESTION:
    ${question}

    CURRENT DRAFT:
    ${currentDraft}

    USER FEEDBACK / INSTRUCTIONS:
    ${feedback}

    INSTRUCTIONS:
    - Rewrite the draft to incorporate the user's feedback.
    - Maintain the professional tone.
    - Do not output explanations, just the new draft text.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text || currentDraft;
};