import {
  type AssistantResponse,
  askCaseAssistantMutation,
  type HistoryMessage,
} from "@cropilot/api"
import { useMutation } from "@tanstack/react-query"
import { useRef, useState } from "react"

export type Turn = {
  id: number
  question: string
  response: AssistantResponse
}

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

export function useAssistant(zoneId: string) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [question, setQuestion] = useState("")
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const nextTurnId = useRef(0)
  const chat = useMutation(askCaseAssistantMutation())
  const pending = chat.isPending || pendingQuestion !== null

  async function send() {
    const text = question.trim()
    if (!text || pending) return
    chat.reset()
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
      const response = await chat.mutateAsync({
        body: { zone_id: zoneId, message: text, history },
      })
      const id = nextTurnId.current++
      setTurns((previous) => [
        ...previous.slice(-5),
        { id, question: text, response },
      ])
      setQuestion("")
    } catch {
      // The mutation retains the server error and the draft remains editable for retry.
    } finally {
      setPendingQuestion(null)
    }
  }

  function newConversation() {
    if (pending) return
    setTurns([])
    setQuestion("")
    chat.reset()
  }

  return {
    turns,
    question,
    setQuestion,
    pendingQuestion,
    pending,
    error: chat.error ? errorMessage(chat.error) : null,
    send,
    newConversation,
  }
}
