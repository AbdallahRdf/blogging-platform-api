import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const MAX_TOKEN_PER_MINUTE = 250_000;

export const generateTags = async (postContent: string) => {

    // esitmating that 1 word ≈ 1.3 tokens (average)
    const maxWords = Math.floor(MAX_TOKEN_PER_MINUTE / 1.3);
    let contentTrimmed = postContent.split(" ").slice(0, maxWords).join(" ");

    let prompt = `
        Given the following blog post content, generate a list of 3 to 6 relevant tags.
            - Each tag should be concise (1–3 words).
            - Return only the tags as a comma-separated list.
            - Do not include any explanations or extra text.

        Blog Post:
        "${contentTrimmed}"
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            thinkingConfig: {
                thinkingBudget: 0, // Disables thinking
            },
        }
    });
    if (!response.candidates || !response.candidates[0].content?.parts) {
        throw new Error("Failed to generate tags from Gemini response.");
    }

    return response.candidates[0].content?.parts[0].text
        ?.split(',')
        .map((tag: string) => tag.trim().toLowerCase().replace(/[^A-Za-z0-9- ]/g, ''))
        .filter(Boolean);
};
