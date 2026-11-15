"""Latency of the text assistant (PR 11, POST /api/assistant/messages) for voice-style questions.

Decides whether the voice agent can use that assistant as its single brain (one client tool
`ask_cropilot`). Runs in process against the real OpenAI API, so it needs OPENAI_API_KEY and the
`assistant` module, which only exists on `feat/contextual-assistant` until PR 11 is merged.

    cd apps/backend   # of the feat/contextual-assistant checkout
    PYTHONPATH=. uv run --env-file ../../.env.local python <path to this file>

Decision rule (docs in scripts/voice_agent/README.md): median at most 4 s -> ask_cropilot;
otherwise the voice agent keeps fast read-only tools.
"""

import json
import os
import statistics
import sys
import time

QUESTIONS = [
    "How did this campaign start?",
    "Which past years look like this one?",
    "How did maize soy soy do in years like this?",
    "Which rotation had the best margin in 1997/98?",
    "Is continuous soybean riskier than maize soybean?",
]
RUNS_PER_QUESTION = 2
MAX_MEDIAN_S = 4.0


def main() -> None:
    # The app reads its settings at import, so the environment is set first.
    os.environ.setdefault("DATABASE_URL", "postgresql://bench:bench@localhost:5432/bench")
    os.environ.setdefault("BETTER_AUTH_URL", "http://auth.bench")
    os.environ.setdefault("AUTH_JWKS_URL", "http://auth.bench/jwks")
    os.environ["ASSISTANT_PUBLIC_ENABLED"] = "true"
    os.environ.setdefault("ASSISTANT_REQUESTS_PER_HOUR", "1000")
    from fastapi.testclient import TestClient

    from app.main import create_app

    client = TestClient(create_app())
    rows = []
    for question in QUESTIONS:
        for _ in range(RUNS_PER_QUESTION):
            start = time.perf_counter()
            response = client.post(
                "/api/assistant/messages", json={"zone_id": "pergamino", "message": question}
            )
            body = response.json()
            ok = response.status_code == 200
            rows.append(
                {
                    "question": question,
                    "status": response.status_code,
                    "seconds": round(time.perf_counter() - start, 2),
                    "tools": body["tools_used"] if ok else None,
                    "claims_chars": sum(len(c["text"]) for c in body["claims"]) if ok else None,
                    "error": None if ok else body.get("detail"),
                }
            )
            sys.stderr.write(json.dumps(rows[-1]) + os.linesep)

    times = [row["seconds"] for row in rows if row["status"] == 200]
    if not times:
        raise SystemExit("No successful answer: check OPENAI_API_KEY and the branch")
    median = statistics.median(times)
    summary = {
        "ok": f"{len(times)}/{len(rows)}",
        "median_s": round(median, 2),
        "min_s": min(times),
        "max_s": max(times),
        "verdict": "ask_cropilot" if median <= MAX_MEDIAN_S else "keep fast tools",
    }
    sys.stdout.write(json.dumps(summary, indent=1) + os.linesep)


if __name__ == "__main__":
    main()
