# Evidence assistant

**Ask Cropilot** answers an agronomist's questions about the evidence Cropilot already has: the public case of a region and, for a signed-in reader, a finished planner run. It reads, compares and explains. It never runs a model, changes data or produces numbers of its own: every table in an answer is built from server data, and every paragraph cites a source.

It is a floating panel on the public case and on every app page (`apps/webapp/src/components/assistant-panel.tsx`), and a screen in the mobile app (`/case/[zoneId]/ask`). Answers follow the language of the question.

## Try it

1. Put `OPENAI_API_KEY` in the ignored root `.env.local` (never in a `VITE_` or `EXPO_PUBLIC_` variable). Set `ASSISTANT_PUBLIC_ENABLED=true` there to allow anonymous use of the public case; it makes paid calls.
2. For voice input, install FFmpeg and keep `ffmpeg` on `PATH`. The production image includes it.
3. Run `pnpm dev`, open `http://localhost:5173/case/pergamino` and choose **Ask Cropilot**.
4. Ask, for example: "Compare the rotations at 1 m depth and 50% initial water. Does this predict floods?" Expand the evidence tables and sources.
5. Choose **Record question**, speak, stop, edit the transcript and send. **Spoken reply** reads a short excerpt aloud; the full answer stays on screen.

Microphone capture needs HTTPS or `localhost`.

## How it works

The backend module `app/modules/assistant` runs the OpenAI Responses API with five tools:

| Tool                                                                         | Scope                                                      |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `list_cases`, `find_analog_years`, `compare_rotations`, `get_field_evidence` | Public case evidence, shared with the [MCP server](mcp.md) |
| `get_planner_result`                                                         | A planner run owned by the reader's handle                 |

The region comes from the request; the model cannot switch it or ask for another reader's run. Water results are read only for the released combinations, and missing data stays missing. For a planner run, the assistant reports the optimum minus each baseline with the planner's own held-out intervals and conclusion.

The last three exchanges are sent for follow-ups. A conversation lives in the open panel and resets when the region or run changes.

### Checks on every answer

- Every paragraph must cite at least one known source id; an unknown source fails the answer.
- Provider errors are returned as fixed messages, never with the provider's body.
- Citations do not prove that every sentence is right. The tables are the reference, and an agronomist still has to review the answer.

## Voice

Voice works in recorded turns, not as a continuous call.

- The client records up to 60 seconds and 4 MB and sends it to `/api/assistant/transcriptions` (or `private-transcriptions` with a handle). The server decodes it with FFmpeg, rejects anything longer than 60 seconds and transcribes it. The reader reviews the transcript before sending.
- With **Spoken reply** on, the server reads the first cited claim and the first limitation through the Realtime API and returns a WAV with its transcript. If the spoken transcript changes a word, number or unit, the audio is dropped and only the text is returned. Audio is labelled as AI-generated and never plays on its own.
- Recordings and replies are not stored by Cropilot.

## Configuration and data sent to OpenAI

| Variable                      | Default                 |
| ----------------------------- | ----------------------- |
| `OPENAI_MODEL`                | `gpt-6.1-sol`           |
| `OPENAI_TRANSCRIPTION_MODEL`  | `gpt-transcribe`        |
| `OPENAI_SPEECH_MODEL`         | `gpt-realtime-2.1-mini` |
| `ASSISTANT_PUBLIC_ENABLED`    | `false`                 |
| `ASSISTANT_REQUESTS_PER_HOUR` | `60`                    |

OpenAI receives the question, the recent history, source and method metadata, the selected public evidence and, for planner chat, the reader's run. Never credentials. Requests use `store=false`, which does not by itself guarantee zero retention by the provider.

Chat and transcription share the hourly budget and allow two concurrent requests. Each message allows up to four provider requests, three tool calls, 2,400 output tokens per request and a 35-second timeout, without retries. Tool payloads are capped at 128 KiB. Limits live in memory, so the backend must run as one process (the planner requires it too).

## Limits

- The analog selection uses July-September ONI, which is published after a late-August decision, so it is retrospective.
- Water excess is not a flood forecast. Soil carbon and food-security risk are not planner goals.
- Native microphone and speaker on the mobile app have not been tested on a physical device.

## Tests

```sh
cd apps/backend && uv run pytest tests/test_assistant.py tests/test_assistant_voice.py -q
```

They cover exact water values, invalid combinations, missing regional data, invented citations, run ownership, usage limits, tool loops, malformed or overlong audio and altered spoken transcripts. They make no paid calls.

## Libraries and services

OpenAI Python SDK 3.51.0 with the [Responses](https://developers.openai.com/api/docs/guides/function-calling), [transcription](https://developers.openai.com/api/docs/guides/transcription) and [Realtime](https://developers.openai.com/api/docs/guides/realtime-conversations) APIs; FFmpeg for audio decoding; `expo-audio` in the mobile app.
