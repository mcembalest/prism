/**
 * Claude Backend Service
 * 
 * This is a simple Express server that wraps the Claude Agent SDK
 * and provides a streaming API for the frontend to consume.
 * 
 * Run with: bun run claude-backend.ts
 */

import express from 'express';
import cors from 'cors';
import { query } from "@anthropic-ai/claude-agent-sdk";

const app = express();
const PORT = 3001;

// Enable CORS for your Tauri app
app.use(cors());
app.use(express.json());

// SSE endpoint for streaming Claude responses
app.post('/api/claude/query', async (req, res) => {
    const { prompt, cwd, allowedTools, sessionId, systemPrompt } = req.body;

    if (!prompt) {
        res.status(400).json({ error: 'Prompt is required' });
        return;
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        // Stream Claude events to the client
        for await (const event of query({
            prompt,
            options: {
                allowedTools: allowedTools || ["Read", "Glob", "Grep"],
                cwd: cwd || "data/rocketalumni/",
                resume: sessionId || undefined,
                systemPrompt: systemPrompt || undefined
            }
        })) {
            // Send each event as SSE
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        }

        // End the stream
        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        console.error('Claude query error:', error);
        res.write(`data: ${JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : String(error)
        })}\n\n`);
        res.end();
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'claude-backend' });
});

app.listen(PORT, () => {
    console.log(`🚀 Claude Backend running on http://localhost:${PORT}`);
    console.log(`📡 Streaming endpoint: http://localhost:${PORT}/api/claude/query`);
});

