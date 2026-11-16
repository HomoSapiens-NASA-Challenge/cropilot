import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio"
import { File, Paths } from "expo-file-system"
import { useEffect, useRef, useState } from "react"
import { Platform } from "react-native"
import type { Turn } from "@/features/case/assistant/use-assistant"

function deleteCachedFile(file: File) {
  try {
    if (file.exists) file.delete()
  } catch (failure) {
    console.warn("Could not delete the spoken answer cache", failure)
  }
}

export function useSpokenAnswers(turns: Turn[], voiceBusy: boolean) {
  const player = useAudioPlayer(null)
  const status = useAudioPlayerStatus(player)
  const [selectedTurnId, setSelectedTurnId] = useState<number | null>(null)
  const [loadingTurnId, setLoadingTurnId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const selected = useRef<number | null>(null)
  const loaded = useRef<number | null>(null)
  const generation = useRef(0)
  const files = useRef(new Map<number, File>())

  useEffect(() => {
    const cache = files.current
    return () => {
      generation.current += 1
      for (const file of cache.values()) deleteCachedFile(file)
      cache.clear()
    }
  }, [])

  useEffect(() => {
    if (voiceBusy || !turns.some((turn) => turn.id === selected.current)) {
      generation.current += 1
      player.pause()
      setLoadingTurnId(null)
      if (!turns.some((turn) => turn.id === selected.current)) {
        player.replace(null)
        loaded.current = null
        selected.current = null
        setSelectedTurnId(null)
      }
    }
    for (const [id, file] of files.current) {
      if (!turns.some((turn) => turn.id === id)) {
        deleteCachedFile(file)
        files.current.delete(id)
      }
    }
  }, [player, turns, voiceBusy])

  async function toggle(turn: Turn) {
    const speech = turn.response.speech
    if (!speech || voiceBusy) return
    const session = ++generation.current
    const sameTurn = loaded.current === turn.id && !status.error
    const wasPlaying = sameTurn && player.playing
    player.pause()
    selected.current = turn.id
    setSelectedTurnId(turn.id)
    setError(null)
    if (wasPlaying) return
    setLoadingTurnId(turn.id)
    let pendingFile: File | null = null
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      })
      if (session !== generation.current) return
      if (!sameTurn) {
        let uri: string
        if (Platform.OS === "web") {
          uri = `data:${speech.mime_type ?? "audio/wav"};base64,${speech.audio_base64}`
        } else {
          let file = files.current.get(turn.id)
          if (!file) {
            file = new File(
              Paths.cache,
              `cropilot-spoken-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`
            )
            pendingFile = file
            await file.write(speech.audio_base64, { encoding: "base64" })
            if (session !== generation.current) return
            files.current.set(turn.id, file)
            pendingFile = null
          }
          uri = file.uri
        }
        player.replace(uri)
        loaded.current = turn.id
      } else if (
        status.didJustFinish ||
        (player.duration > 0 && player.currentTime >= player.duration)
      ) {
        await player.seekTo(0)
      }
      if (session === generation.current) player.play()
    } catch (failure) {
      if (session === generation.current) {
        selected.current = null
        setError("Could not play the spoken answer. Please try again.")
      }
      console.warn("Could not play the spoken answer", failure)
    } finally {
      if (pendingFile) deleteCachedFile(pendingFile)
      if (session === generation.current) setLoadingTurnId(null)
    }
  }

  return {
    playingTurnId: status.playing ? selectedTurnId : null,
    loadingTurnId,
    errorTurnId: error || status.error ? selectedTurnId : null,
    error: error ?? status.error,
    toggle,
  }
}

export type SpokenAnswers = ReturnType<typeof useSpokenAnswers>
