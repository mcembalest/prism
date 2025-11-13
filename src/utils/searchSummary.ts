/**
 * Search Summary Generation Utility
 *
 * Generates user-friendly, non-technical search summaries using Claude
 */

// Modal production endpoint for search summaries
const CLAUDE_BACKEND_URL = 'https://max-80448--rocket-alumni-backend-summarize-endpoint.modal.run';

/**
 * Generate a user-friendly search summary from a user query
 * Uses Claude Haiku via backend API for high-quality summaries
 *
 * @param userQuery - The raw user query
 * @returns Promise<string> - A clean 2-4 word summary
 */
export async function generateSearchSummary(userQuery: string): Promise<string> {
    try {
        const response = await fetch(CLAUDE_BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: userQuery })
        });

        if (!response.ok) {
            throw new Error(`Backend error: ${response.statusText}`);
        }

        const data = await response.json();

        // Validate we got a reasonable summary
        if (data.summary && data.summary.length > 0 && data.summary.length < 50) {
            return data.summary;
        }

        // Fall back to heuristics if summary is invalid
        return fallbackSummary(userQuery);

    } catch (error) {
        console.error('Summary generation error:', error);
        return fallbackSummary(userQuery);
    }
}

/**
 * Fallback summary generation using simple heuristics
 * Cleans up common search phrases to create user-friendly summaries
 */
function fallbackSummary(query: string): string {
    let cleaned = query
        .replace(/^(search for|look for|find|where is|what is|show me|tell me about|can you|could you|please)\s+/i, '')
        .replace(/^(info about|information about)\s+/i, '')
        .replace(/^(the|a|an)\s+/i, '')
        .trim();

    // If we ended up with an empty string, use the original query
    if (!cleaned) {
        cleaned = query;
    }

    // Capitalize first letter
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

    return cleaned;
}
