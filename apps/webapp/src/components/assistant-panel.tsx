import {
  type AssistantResponse,
  askCaseAssistantMutation,
  askPlannerAssistantMutation,
  type EvidenceCard,
  type HistoryMessage,
} from "@cropilot/api"
import { useMutation } from "@tanstack/react-query"
import {
  ArrowUp,
  BookOpen,
  LoaderCircle,
  MessageCircle,
  RotateCcw,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { AssistantVoiceInput } from "@/components/assistant-voice-input"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

type Turn = { id: string; question: string; response: AssistantResponse }

function errorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "detail" in error &&
    typeof error.detail === "string"
  ) {
    return error.detail
  }
  return "The assistant could not answer. Your question is still here; please try again."
}

function EvidenceTable({ card }: { card: EvidenceCard }) {
  return (
    <details className="rounded-lg border">
      <summary className="cursor-pointer px-3 py-2 font-medium">
        {card.title}
      </summary>
      <div className="space-y-3 border-t p-3">
        <p className="text-xs text-muted-foreground">
          {card.provenance} · {card.scale} · Published evidence
        </p>
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead>
              <tr>
                {card.columns.map((column) => (
                  <th key={column} className="px-2 py-2 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {card.rows.map((row, index) => (
                <tr key={`${card.title}-${index}`} className="border-t">
                  {row.map((value, column) => (
                    <td key={card.columns[column]} className="px-2 py-2">
                      {value === null
                        ? "Missing"
                        : typeof value === "number"
                          ? value.toLocaleString("en", {
                              maximumFractionDigits: 3,
                            })
                          : value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {card.note}
        </p>
      </div>
    </details>
  )
}

function Answer({
  response,
  onQuestion,
}: {
  response: AssistantResponse
  onQuestion: (question: string) => void
}) {
  return (
    <div className="space-y-4">
      {response.speech && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-xs font-medium">
            AI-generated voice · spoken excerpt
          </p>
          <audio
            controls
            className="w-full"
            aria-label="Spoken answer"
            src={`data:${response.speech.mime_type};base64,${response.speech.audio_base64}`}
          >
            <track
              kind="captions"
              label="Spoken transcript"
              srcLang="und"
              default
              src={`data:text/vtt;charset=utf-8,${encodeURIComponent(`WEBVTT\n\n00:00:00.000 --> 00:01:30.000\n${response.speech.text}`)}`}
            />
          </audio>
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Spoken transcript</summary>
            <p className="mt-2 leading-relaxed">{response.speech.text}</p>
          </details>
          <p className="text-xs text-muted-foreground">
            Press Play to listen, pause or replay. The complete answer and
            sources are below.
          </p>
        </div>
      )}
      {response.speech_error && (
        <p role="status" className="text-xs text-muted-foreground">
          {response.speech_error}
        </p>
      )}
      {response.claims.map((claim) => (
        <div key={claim.text} className="space-y-1">
          <p className="whitespace-pre-wrap leading-relaxed">{claim.text}</p>
          <p className="text-xs text-muted-foreground">
            {claim.source_ids
              .map(
                (id) =>
                  response.sources.find((source) => source.id === id)
                    ?.dataset ?? id
              )
              .join(" · ")}
          </p>
        </div>
      ))}
      {response.cards.map((card, index) => (
        <EvidenceTable key={`${card.title}-${index}`} card={card} />
      ))}
      {response.limitations.length > 0 && (
        <div className="space-y-2 border-l-2 border-primary pl-3 text-xs leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">
            What this does not establish
          </p>
          {response.limitations.map((limit) => (
            <p key={limit}>{limit}</p>
          ))}
        </div>
      )}
      <details className="text-xs">
        <summary className="cursor-pointer font-medium">
          <BookOpen className="mr-1 inline size-3" aria-hidden />
          Sources and context ({response.sources.length})
        </summary>
        <div className="mt-3 space-y-3 text-muted-foreground">
          {response.sources.map((source) => (
            <div key={source.id} className="space-y-1 break-words">
              {source.url && /^https?:\/\//.test(source.url) ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  {source.dataset}
                </a>
              ) : (
                <p className="text-foreground">{source.dataset}</p>
              )}
              <p>
                {source.provider} · {source.period} · {source.location}
              </p>
              <p>
                {source.nature} · {source.id}
              </p>
            </div>
          ))}
          <p>
            Case snapshot: {response.generated_utc}. Model: {response.model}.
            Tools: {response.tools_used.join(", ") || "Case metadata"}.
          </p>
          {response.run_id && <p>Planner run: {response.run_id}</p>}
        </div>
      </details>
      <div className="flex flex-wrap gap-2">
        {response.suggested_questions.map((question) => (
          <Button
            key={question}
            variant="outline"
            size="sm"
            className="h-auto whitespace-normal text-left"
            onClick={() => onQuestion(question)}
          >
            {question}
          </Button>
        ))}
      </div>
    </div>
  )
}

/** Mounted with a context key: changing region or planner run starts a fresh conversation. */
export function AssistantPanel({
  zoneId,
  zoneName,
  runId,
}: {
  zoneId: string
  zoneName: string
  runId?: string
}) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [question, setQuestion] = useState("")
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const [voiceBusy, setVoiceBusy] = useState(false)
  const [speak, setSpeak] = useState(false)
  const latestTurn = useRef<HTMLDivElement | null>(null)
  const publicChat = useMutation(askCaseAssistantMutation())
  const plannerChat = useMutation(askPlannerAssistantMutation())
  const pending = publicChat.isPending || plannerChat.isPending
  const error = publicChat.error ?? plannerChat.error

  useEffect(() => {
    if (pendingQuestion || turns.length > 0) {
      latestTurn.current?.scrollIntoView({ block: "start", behavior: "smooth" })
    }
  }, [pendingQuestion, turns.length])

  async function send() {
    const text = question.trim()
    if (!text || pending || voiceBusy) return
    publicChat.reset()
    plannerChat.reset()
    setPendingQuestion(text)
    const history: HistoryMessage[] = turns.slice(-3).flatMap((turn) => [
      { role: "user", content: turn.question },
      {
        role: "assistant",
        content: turn.response.claims
          .map((claim) => claim.text)
          .join("\n\n")
          .slice(0, 6000),
      },
    ])
    try {
      const body = { zone_id: zoneId, message: text, history, speak }
      const response = runId
        ? await plannerChat.mutateAsync({ body: { ...body, run_id: runId } })
        : await publicChat.mutateAsync({ body })
      setTurns((previous) => [
        ...previous.slice(-5),
        { id: crypto.randomUUID(), question: text, response },
      ])
      setQuestion("")
    } catch {
      // The mutation retains the server error and the draft remains editable for retry.
    } finally {
      setPendingQuestion(null)
    }
  }

  const suggestions = runId
    ? [
        "Explain this planner result and its uncertainty.",
        "Did RL improve on the simple baselines?",
      ]
    : [
        "Compare the rotations and their water tradeoffs.",
        "What happened in the published analog years?",
        "What do we actually know about the reference field?",
      ]

  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        <MessageCircle aria-hidden data-icon="inline-start" />
        Ask Cropilot
      </SheetTrigger>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>Explore the evidence</SheetTitle>
          <SheetDescription>
            {zoneName} · {runId ? "Selected planner run" : "Published case"}
          </SheetDescription>
          <p className="mt-2 text-xs text-muted-foreground">
            AI explanations of scenarios, with sources. Supports your agronomic
            judgment.
          </p>
        </SheetHeader>
        <div
          className="min-h-0 flex-1 overflow-y-auto p-4"
          role="log"
          aria-label="Conversation"
          aria-busy={pending}
        >
          {turns.length === 0 && !pending && (
            <div className="space-y-5 py-5">
              <MessageCircle className="size-7 text-primary" aria-hidden />
              <p className="text-xl font-light tracking-tight">
                What would you like to understand?
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Compare alternatives, inspect their sources, or ask what is
                still missing. You can write in English or Spanish.
              </p>
              <div className="flex flex-col items-start gap-2">
                {suggestions.map((text) => (
                  <Button
                    key={text}
                    variant="outline"
                    className="h-auto whitespace-normal text-left"
                    onClick={() => setQuestion(text)}
                  >
                    {text}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-8">
            {turns.map((turn, index) => (
              <article key={turn.id} className="space-y-4">
                <div
                  ref={
                    index === turns.length - 1 && !pendingQuestion
                      ? latestTurn
                      : undefined
                  }
                />
                <p className="rounded-lg bg-muted p-3 text-sm">
                  {turn.question}
                </p>
                <Answer response={turn.response} onQuestion={setQuestion} />
              </article>
            ))}
            {pendingQuestion && (
              <div className="space-y-4" ref={latestTurn}>
                <p className="rounded-lg bg-muted p-3 text-sm">
                  {pendingQuestion}
                </p>
                <p
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  role="status"
                >
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                  Reading the evidence and preparing your answer…
                </p>
              </div>
            )}
          </div>
        </div>
        <form
          className="space-y-3 border-t p-4"
          onSubmit={(event) => {
            event.preventDefault()
            void send()
          }}
        >
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(error)}
            </p>
          )}
          <AssistantVoiceInput
            disabled={pending}
            privateContext={runId !== undefined}
            onBusy={setVoiceBusy}
            onTranscript={(text) => {
              setQuestion(text)
              setSpeak(true)
            }}
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={speak}
              disabled={pending || voiceBusy}
              onChange={(event) => setSpeak(event.target.checked)}
            />
            Spoken reply (AI-generated)
          </label>
          <label htmlFor={`assistant-question-${zoneId}`} className="sr-only">
            Your question
          </label>
          <textarea
            id={`assistant-question-${zoneId}`}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={2000}
            disabled={pending || voiceBusy}
            rows={3}
            placeholder="Ask about this case…"
            className="w-full resize-none rounded-lg border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending || voiceBusy || turns.length === 0}
              onClick={() => {
                setTurns([])
                setQuestion("")
                publicChat.reset()
                plannerChat.reset()
              }}
            >
              <RotateCcw aria-hidden data-icon="inline-start" />
              New conversation
            </Button>
            <Button
              type="submit"
              disabled={pending || voiceBusy || !question.trim()}
            >
              <ArrowUp aria-hidden data-icon="inline-start" />
              Send
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
