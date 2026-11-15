# Voice and integration delivery

User-authorized scope: put voice in the final product, reuse the local OpenAI key,
upload it as the repository secret `OPENAI_API_KEY`, and reconcile assistant PR #11
with MCP integration PR #12. The team merged #12 and #11 during this work; the voice
increment is now based on updated main. This session did not merge either PR.

1. Rebase #11 onto `integrate/mcp-on-main`; regenerate uv.lock from merged dependencies.
   Preserve MCP mounting, static resources, deployment safeguards and Windows commit hook.
2. Add bounded recorded-audio transcription with `gpt-transcribe`. The user reviews the
   transcript before sending. Use the same source-backed assistant and owner checks.
3. Add an opt-in spoken excerpt using `gpt-realtime-2.1-mini` via server-side WebSocket,
   preserving the complete cited text and tables. No permanent key reaches the browser.
   Capture max 60 seconds; allow stop/cancel, handle permission denial and provider errors.
   Keep textual answers usable when speech fails. Display that the voice is AI-generated.
4. Wire the GitHub secret into the deployment process via encrypted SSH standard input,
   without writing it to Git, command arguments or logs. No deployment occurs without a host.
5. Regenerate API, run unit/integration checks, test actual transcription/synthesis with the
   shared key and the browser using synthetic speech input, document limits and push with lease.

Design choice: recorded turns keep exact case/tool evidence in the existing orchestrator.
Continuous interruption-aware speech is not required for this first final-product voice flow.
OpenAI's current docs recommend gpt-transcribe for files and Realtime 2.1 for new speech
generation integrations; the older Speech API models are already deprecated.

Progress: secret uploaded and listed; audio-model access verified. Initial rebase onto #12
conflicted only in uv.lock, regenerated from the merged dependencies. After team merges,
the uncommitted increment was moved onto main without force-pushing the shared branch.
Voice, generated contract and secret transport are implemented. Offline tests and real
browser/provider checks are recorded in assistant.md. Final publication remains a PR.

Review corrections: server-side FFmpeg decoding enforces duration before transcription;
spoken transcript validation preserves mathematical signs/operators; stable conversation
IDs and explicit Play prevent historical answers from replaying on panel reopen.
Ruling: manual Play is preferable to autoplay for a panel retaining several answers.
Ruling: recorded turns are the demonstrated web voice experience; native Expo voice and
continuous interruption-aware calls remain explicit limitations, not claimed features.
