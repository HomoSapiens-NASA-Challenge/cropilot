# How to evaluate the voice assistant

Four stages, in order. Each one has a pass rule. Stop at the first stage that fails and report it in
the PR with the stage number, what you did and what you saw.

| Stage                            | Who                                      | Needs                           | Time   |
| -------------------------------- | ---------------------------------------- | ------------------------------- | ------ |
| 1. Automated checks              | anyone                                   | the repo                        | 5 min  |
| 2. Backend smoke test            | anyone                                   | an ElevenLabs API key           | 10 min |
| 3. Conversation on a phone       | anyone with an Android phone or emulator | stage 2 done, Android Studio    | 30 min |
| 4. Latency of the text assistant | anyone                                   | an OpenAI API key, PR 11 branch | 5 min  |

Ask Tomás for the keys. Never paste a key in the PR, a commit or a chat: it goes only in the root
`.env` (or `.env.local`), which Git ignores.

## 1. Automated checks

From the repo root, on branch `feat/voice-agent`:

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test
```

**Pass:** all three finish without errors, except two tests that already fail on the base branch
on Windows: `test_water_assets.py::test_linked_payload_directory_is_rejected` and
`::test_setup_rejects_wrong_python_before_dependency_sync`. Also run only the new tests:

```bash
cd apps/backend && uv run pytest tests/test_voice.py -v
```

**Pass:** 4 passed. They check that the session endpoint returns a token, never returns the API
key, answers 503 without configuration and 502 when ElevenLabs fails.

## 2. Backend smoke test

1. Put `ELEVENLABS_API_KEY=...` in the root `.env`.
2. Create the agent and copy the id it prints into `.env` as `ELEVENLABS_AGENT_ID`:

   ```bash
   cd apps/backend
   uv run --env-file ../../.env python ../../scripts/voice_agent/sync.py
   ```

   **Pass:** it prints four `tool <name>: <id>` lines and then the agent id. In the ElevenLabs
   dashboard (Agents) there is an agent "Cropilot case assistant" with authentication enabled and
   four client tools: `get_national_campaign`, `get_case_briefing`, `get_strategy_details`,
   `show_case_screen`, each with "Wait for response" on.

3. Run `pnpm dev` and, in another terminal:

   ```bash
   curl -s -X POST http://localhost:8000/api/voice/session
   ```

   **Pass:** `{"conversation_token":"..."}`. The output never contains the API key.
   Then remove `ELEVENLABS_AGENT_ID` from `.env`, restart and repeat. **Pass:** HTTP 503 with
   `Voice assistant unavailable; contact the operator`. Put the id back.

## 3. Conversation on a phone

WebRTC does not run in Expo Go: build the development app once.

```bash
cd apps/mobile
echo "EXPO_PUBLIC_API_URL=http://localhost:5173" > .env
adb reverse tcp:5173 tcp:5173   # the phone's localhost:5173 reaches your computer's dev server
npx expo run:android
```

The Vite dev server only listens on localhost, so `adb reverse` is what lets the phone (USB with
debugging on) or the emulator reach it. Run it again after reconnecting the phone.

With `pnpm dev` running, open the app, go past the welcome and sign-in screens, and follow the
script below. Speak in English. Mark each row pass or fail and copy the table to the PR.

The expected values come from the committed case bundles
(`apps/backend/app/modules/cases/resources/`). A number that differs from them is a fail, even if
it sounds plausible: the assistant must never say a number it did not read from a tool.

| #   | Do                                                                                              | Pass if                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Look at Home, Years, Strategies, Map, then the welcome screen                                   | The round assistant button floats above the tab bar on the four tabs and on case screens, and is absent on the welcome and landing                                                    |
| 2   | Tap the button, then "Start talking"                                                            | Android asks for the microphone once; status goes Connecting, then Listening in under 5 s; the orb moves while you speak                                                              |
| 3   | Ask "How did this campaign start in Pergamino?"                                                 | It says ONI Jul-Sep +2.16 (strong El Niño) and soil wetness about 0.65, higher than 53% of past campaigns, and names NOAA ONI and NASA POWER as sources. Same numbers as the Home tab |
| 4   | Ask "Which past years look like this one?"                                                      | It names real analog campaigns; 1997/98 should be among them (it is the closest analog in the bundle)                                                                                 |
| 5   | Ask "Show me the strategies"                                                                    | The sheet closes, the Strategies tab opens, the conversation keeps going and the floating button shows the moving orb                                                                 |
| 6   | Ask "Why is maize soybean soybean the current rotation?"                                        | It says it is a satellite reading (INTA crop map) not confirmed by the farmer                                                                                                         |
| 7   | Ask "Which rotation had the best margin in 1997/98?"                                            | Maize / soybean (from the analog margins). Any other answer is a fail                                                                                                                 |
| 8   | Ask "What will my yield be next year?"                                                          | It does not forecast: it says analog years are not a forecast and offers what the case does show                                                                                      |
| 9   | Ask "What is the soybean price today?"                                                          | It says it does not have that data. Any price is a fail                                                                                                                               |
| 10  | Ask "And in Charata?"                                                                           | It switches zone: soil wetness about 0.56, higher than 100% of past campaigns there; water and field are not available for that region yet                                            |
| 11  | Tap Mute, speak, then Unmute                                                                    | Muted: it does not react to your voice. Unmuted: it does again                                                                                                                        |
| 12  | Tap End                                                                                         | Status returns to "Tap to talk about this case"; the floating button shows the static icon; the ElevenLabs dashboard lists the conversation as ended                                  |
| 13  | For questions 3, 4, 6 and 7, time from the end of your question to the first word of the answer | Write the four times in the PR. Pass if each is 3 s or less                                                                                                                           |

Also write down, even if all rows pass: anything said in a robotic or confusing way, any number
read badly (for example "2015/16" read as a fraction), and whether the orb drops frames.

## 4. Latency of the text assistant (PR 11)

This decides how the voice agent gets its answers. Today it uses four fast read-only tools over the
case bundles. The alternative is a single tool, `ask_cropilot`, that calls the text assistant of
PR 11, so web and voice give the same answers with the same citation checks. That only works if
the text assistant is fast enough to talk with.

```bash
git worktree add ../cropilot-assistant origin/feat/contextual-assistant
cd ../cropilot-assistant
echo "OPENAI_API_KEY=..." > .env.local
cd apps/backend && uv sync
PYTHONPATH=. uv run --env-file ../../.env.local python \
  ../../cropilot/scripts/voice_agent/bench_assistant.py
```

It asks five voice-style questions twice each (10 OpenAI calls) and prints the median.

**Decision:** median 4 s or less → the voice agent switches to `ask_cropilot`. More than 4 s → it
keeps its fast tools. Paste the printed summary in the PR either way.
