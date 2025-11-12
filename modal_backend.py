"""
Modal Backend for Rocket Alumni Solutions
Replaces the Express backend with a serverless Modal deployment.

Deploy with: uv run modal deploy modal_backend.py
"""

import modal
import os
from typing import Optional
from dataclasses import asdict, is_dataclass


def serialize_message(obj):
    """
    Convert Claude SDK message objects to JSON-serializable dictionaries.
    Transforms Python SDK format to match TypeScript SDK format expected by frontend.
    """
    if is_dataclass(obj) and not isinstance(obj, type):
        # Get the class name to determine the message type
        class_name = obj.__class__.__name__

        # Convert dataclass to dict, but handle fields recursively BEFORE asdict
        # to preserve type information for nested dataclasses
        result = {}
        for field in obj.__dataclass_fields__:
            field_value = getattr(obj, field)
            result[field] = serialize_message(field_value)

        # Add type field for content blocks (TextBlock, ToolUseBlock, etc.)
        if class_name == 'TextBlock':
            result['type'] = 'text'
        elif class_name == 'ToolUseBlock':
            result['type'] = 'tool_use'
        elif class_name == 'ToolResultBlock':
            result['type'] = 'tool_result'
        elif class_name == 'ThinkingBlock':
            result['type'] = 'thinking'

        # Transform to match TypeScript SDK format
        if class_name == 'SystemMessage':
            # System messages already have correct structure
            result['type'] = 'system'
        elif class_name == 'AssistantMessage':
            # Transform: {content: [...], model: ...} -> {type: 'assistant', message: {content: [...]}, session_id: ...}
            return {
                'type': 'assistant',
                'message': {
                    'content': result.get('content', []),
                    'model': result.get('model')
                },
                'session_id': result.get('session_id', 'unknown')
            }
        elif class_name == 'UserMessage':
            return {
                'type': 'user',
                'message': {
                    'content': result.get('content', [])
                },
                'session_id': result.get('session_id', 'unknown')
            }
        elif class_name == 'ResultMessage':
            result['type'] = 'result'

        return result
    elif isinstance(obj, list):
        return [serialize_message(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: serialize_message(value) for key, value in obj.items()}
    else:
        return obj


image = (
      modal.Image.debian_slim()
      .apt_install("curl")  # Needed for Node.js installation
      .run_commands(
          # Install Node.js 20
          "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
          "apt-get install -y nodejs",
          # Install Claude Code CLI globally
          "npm install -g @anthropic-ai/claude-code",
      )
      .pip_install(
          "fastapi",
          "anthropic",
          "claude-agent-sdk",
          "sse-starlette",
      )
  )

# Reference the Volume and Secret
volume = modal.Volume.from_name("rocket-alumni-data", create_if_missing=True)
app = modal.App("rocket-alumni-backend")


@app.function(
    image=image,
    volumes={"/data": volume},
    secrets=[modal.Secret.from_name("anthropic-api-key")],
    timeout=300,  # 5 minutes for long queries
)
@modal.fastapi_endpoint(method="POST")
async def query_endpoint(request: dict):
    """
    Streaming Claude Agent SDK endpoint.
    Mirrors the Express backend's /api/claude/query endpoint.
    """
    from sse_starlette.sse import EventSourceResponse
    from claude_agent_sdk import query as claude_query, ClaudeAgentOptions
    import json

    # Extract parameters from request body
    prompt = request.get("prompt")
    cwd = request.get("cwd")
    allowedTools = request.get("allowedTools")
    sessionId = request.get("sessionId")
    systemPrompt = request.get("systemPrompt")

    if not prompt:
        return {"error": "Prompt is required"}, 400

    # Set default values
    tools = allowedTools or ["Read", "Glob", "Grep"]

    # Translate relative Express backend path to absolute Modal path
    # Frontend sends "data/rocketalumni/" but Modal volume is at /data root
    if cwd and cwd.startswith("data/rocketalumni"):
        working_dir = "/data/"
    else:
        working_dir = cwd or "/data/"

    async def event_generator():
        """Generator function for SSE events."""
        try:
            options = ClaudeAgentOptions(
                allowed_tools=tools,
                cwd=working_dir,
                resume=sessionId if sessionId else None,
                system_prompt=systemPrompt if systemPrompt else None,
                model="claude-haiku-4-5-20251001",
            )

            # Track session ID from first event
            current_session_id = None

            # Stream Claude events
            async for event in claude_query(prompt=prompt, options=options):
                # Serialize the message object to a JSON-compatible dict
                serialized_event = serialize_message(event)

                # Extract and track session_id from system init event
                if serialized_event.get('type') == 'system' and serialized_event.get('subtype') == 'init':
                    current_session_id = serialized_event.get('data', {}).get('session_id')

                # Add session_id to events that don't have it
                if current_session_id and 'session_id' in serialized_event and serialized_event['session_id'] == 'unknown':
                    serialized_event['session_id'] = current_session_id

                yield {"data": json.dumps(serialized_event)}

            # Send completion signal
            yield {"data": "[DONE]"}

        except Exception as e:
            print(f"Error in query: {e}")
            import traceback
            traceback.print_exc()
            yield {
                "data": json.dumps({
                    "type": "error",
                    "error": str(e)
                })
            }

    return EventSourceResponse(event_generator())


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("anthropic-api-key")],
    timeout=30,
)
@modal.fastapi_endpoint(method="POST")
def summarize_endpoint(request: dict):
    """
    Simple text completion endpoint for generating search summaries.
    Mirrors the Express backend's /api/claude/summarize endpoint.
    """
    from anthropic import Anthropic

    # Extract query from request body
    query = request.get("query")

    if not query:
        return {"error": "Query is required"}, 400

    try:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            return {"error": "No Anthropic API key configured"}, 500

        anthropic = Anthropic(api_key=api_key)

        prompt = f"""Extract the main topic in 2-4 words. Follow the examples exactly.

Examples:
"search for pricing info" -> pricing information
"where is the login page" -> login page
"tell me about security" -> security details

"{query}" ->"""

        message = anthropic.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=50,
            system="You are a text summarization tool. Respond ONLY with the requested summary, no explanations or additional text.",
            messages=[{"role": "user", "content": prompt}]
        )

        # Extract text from response
        summary = ""
        if message.content and len(message.content) > 0:
            if hasattr(message.content[0], 'text'):
                summary = message.content[0].text.split('\n')[0].strip()

        return {"summary": summary}

    except Exception as e:
        print(f"Summarize error: {e}")
        return {"error": str(e)}, 500


@app.function(image=image)
@modal.fastapi_endpoint(method="GET")
def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "rocket-alumni-backend",
        "platform": "modal"
    }
