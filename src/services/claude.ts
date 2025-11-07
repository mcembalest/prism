/**
 * Claude Frontend Service
 * Communicates with the Claude backend service via HTTP/SSE
 */

const CLAUDE_BACKEND_URL = 'http://localhost:3001';

/**
 * Claude event types that we'll receive from the streaming API
 */
export type ClaudeEventType = 'system' | 'assistant' | 'user' | 'result' | 'error';

export interface ClaudeSystemEvent {
    type: 'system';
    subtype: 'init';
    session_id: string;
    tools: string[];
    model: string;
    [key: string]: any;
}

export interface ClaudeAssistantEvent {
    type: 'assistant';
    message: {
        content: Array<{
            type: string;
            text?: string;
            name?: string;
            input?: any;
            [key: string]: any;
        }>;
        [key: string]: any;
    };
    session_id: string;
    [key: string]: any;
}

export interface ClaudeUserEvent {
    type: 'user';
    message: {
        content: any[];
        [key: string]: any;
    };
    session_id: string;
    [key: string]: any;
}

export interface ClaudeResultEvent {
    type: 'result';
    subtype: 'success' | 'error';
    result?: string;
    error?: string;
    session_id: string;
    usage?: any;
    total_cost_usd?: number;
    [key: string]: any;
}

export interface ClaudeErrorEvent {
    type: 'error';
    error: string;
    [key: string]: any;
}

export type ClaudeEvent = 
    | ClaudeSystemEvent 
    | ClaudeAssistantEvent 
    | ClaudeUserEvent 
    | ClaudeResultEvent 
    | ClaudeErrorEvent;

/**
 * Options for Claude queries
 */
export interface ClaudeQueryOptions {
    prompt: string;
    cwd?: string;
    allowedTools?: string[];
    sessionId?: string;
    systemPrompt?: string;
}

/**
 * Claude service for handling AI agent conversations
 */
export class ClaudeService {
    private sessionId: string | null = null;

    /**
     * Query Claude and stream back events via the backend service
     */
    async *queryStream(options: ClaudeQueryOptions): AsyncGenerator<ClaudeEvent> {
        try {
            const response = await fetch(`${CLAUDE_BACKEND_URL}/api/claude/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: options.prompt,
                    cwd: options.cwd || "data/rocketalumni/",
                    allowedTools: options.allowedTools || ["Read", "Glob", "Grep"],
                    sessionId: options.sessionId,
                    systemPrompt: options.systemPrompt
                })
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.statusText}`);
            }

            if (!response.body) {
                throw new Error('No response body');
            }

            // Read the SSE stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        
                        if (data === '[DONE]') {
                            return;
                        }

                        try {
                            const event = JSON.parse(data) as ClaudeEvent;
                            
                            // Store session ID from first message
                            if ('session_id' in event && event.session_id && !this.sessionId) {
                                this.sessionId = event.session_id;
                            }

                            yield event;
                        } catch (e) {
                            console.error('Failed to parse SSE data:', data, e);
                        }
                    }
                }
            }
        } catch (error) {
            yield {
                type: 'error',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Get the current session ID
     */
    getSessionId(): string | null {
        return this.sessionId;
    }

    /**
     * Reset the session
     */
    resetSession(): void {
        this.sessionId = null;
    }
}

// Export singleton instance
export const claudeService = new ClaudeService();

