# Voice agent

The mobile app's case assistant is an ElevenLabs Agents conversation over WebRTC. This folder holds
what lives on the ElevenLabs side: the system prompt (`prompt.md`) and `sync.py`, which creates or
updates the agent and its four client tools.

## Setup

1. Create an API key in ElevenLabs (Developers > API keys) and put it in the root `.env` as
   `ELEVENLABS_API_KEY`.
2. Create the agent. The script prints its id:

   ```bash
   cd apps/backend
   uv run --env-file ../../.env python ../../scripts/voice_agent/sync.py
   ```

3. Put the printed id in `.env` as `ELEVENLABS_AGENT_ID`. Running the script again with the id set
   updates the same agent and tools instead of creating new ones.

## How it fits

```
app ── POST /api/voice/session ──> backend ── GET /v1/convai/conversation/token ──> ElevenLabs
app <════════════ WebRTC audio, tool calls (conversation token) ════════════> ElevenLabs agent
```

- The agent is private (`enable_auth`): only a token minted by the backend opens a conversation, so
  the API key never reaches the phone.
- The tools are client tools: they run in the app (`apps/mobile/src/features/voice/client-tools.ts`)
  and read the same public `case-v1` bundles as the screens. The agent has no other data, so every
  number it says comes from a case and carries its source ids.
- `show_case_screen` navigates the app to the screen the agent is talking about.
- Tool names and parameters are a contract between `sync.py` and `client-tools.ts`: change both.

## Evaluation

Step by step, with the pass rule of each step: [EVALUATION.md](EVALUATION.md).

## Limits

- `POST /api/voice/session` is public, like the case. Each call can start a billed conversation;
  cap usage in the ElevenLabs dashboard (agent call limits) before a public demo.
- The app needs a development build (`expo run:android` / `expo run:ios`): WebRTC does not run in
  Expo Go.
