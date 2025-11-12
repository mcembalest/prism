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
import Anthropic from '@anthropic-ai/sdk';

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
                systemPrompt: systemPrompt || undefined,
                model: "claude-haiku-4-5-20251001"
            }
        })) {
            // Send each event as SSE
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        }

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

// Simple text completion endpoint for generating search summaries
app.post('/api/claude/summarize', async (req, res) => {
    const { query } = req.body;

    if (!query) {
        res.status(400).json({ error: 'Query is required' });
        return;
    }

    try {
        const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || '';
        if (!apiKey) {
            res.status(500).json({ error: 'No Anthropic API key configured' });
            return;
        }

        const anthropic = new Anthropic({
            apiKey
        });

        const prompt = `Extract the main topic in 2-4 words. Follow the examples exactly.

Examples:
"search for pricing info" -> pricing information
"where is the login page" -> login page
"tell me about security" -> security details

"${query}" ->`;

        const message = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 50,
            system: "You are a text summarization tool. Respond ONLY with the requested summary, no explanations or additional text.",
            messages: [{ role: 'user', content: prompt }]
        });

        const summary = message.content[0].type === 'text'
            ? message.content[0].text.split('\n')[0].trim()
            : '';

        res.json({ summary });
    } catch (error) {
        console.error('Summarize error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'claude-backend' });
});

app.listen(PORT, () => {
    console.log(`Claude Backend running on http://localhost:${PORT}`);
    console.log(`Streaming endpoint: http://localhost:${PORT}/api/claude/query`);
});

