
/**
 * Safely extracts a JSON object or array from a string that might contain Markdown or other text.
 * @param text The string containing JSON.
 * @returns The parsed JSON object or throws an error.
 */
export function extractAndParseJson(text: string): any {
    if (!text) {
        throw new Error("Empty response received.");
    }

    // 1. Try to find a JSON code block ```json ... ```
    const jsonCodeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    let potentialJson = "";
    
    if (jsonCodeBlockMatch && jsonCodeBlockMatch[1]) {
        potentialJson = jsonCodeBlockMatch[1].trim();
    } else {
        // 2. Try to find the first '{' or '[' and the last '}' or ']'
        const firstOpenBrace = text.indexOf('{');
        const firstOpenBracket = text.indexOf('[');
        
        let startIndex = -1;
        let endIndex = -1;

        if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
            startIndex = firstOpenBrace;
            endIndex = text.lastIndexOf('}') + 1;
        } else if (firstOpenBracket !== -1) {
            startIndex = firstOpenBracket;
            endIndex = text.lastIndexOf(']') + 1;
        }

        if (startIndex !== -1) {
            potentialJson = text.substring(startIndex, endIndex > startIndex ? endIndex : text.length).trim();
        }
    }

    if (!potentialJson) {
        throw new Error("No valid JSON structure found in the response.");
    }

    // 教授级的防御：自动修复截断的 JSON (Missing closing braces/brackets)
    let repairedJson = potentialJson;
    const openBraces = (repairedJson.match(/\{/g) || []).length;
    const closeBraces = (repairedJson.match(/\}/g) || []).length;
    const openBrackets = (repairedJson.match(/\[/g) || []).length;
    const closeBrackets = (repairedJson.match(/\]/g) || []).length;

    if (openBrackets > closeBrackets) {
        repairedJson += "]".repeat(openBrackets - closeBrackets);
    }
    if (openBraces > closeBraces) {
        repairedJson += "}".repeat(openBraces - closeBraces);
    }

    try {
        return JSON.parse(repairedJson);
    } catch (e) {
         // Attempt to clean common LLM errors (trailing commas)
         try {
             const cleaned = repairedJson.replace(/,\s*([\]}])/g, '$1'); 
             return JSON.parse(cleaned);
         } catch (e2) {
             throw new Error(`Failed to parse extracted JSON: ${(e as Error).message}`);
         }
    }
}
