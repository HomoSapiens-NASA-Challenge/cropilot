import { View } from "react-native"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"

export function QuestionSuggestions({
  questions,
  disabled,
  onQuestion,
}: {
  questions: string[]
  disabled: boolean
  onQuestion: (question: string) => void
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {questions.map((question) => (
        <Button
          key={question}
          variant="outline"
          size="sm"
          className="h-auto min-h-11 max-w-full justify-start py-2"
          disabled={disabled}
          onPress={() => onQuestion(question)}
        >
          <Text className="shrink text-sm">{question}</Text>
        </Button>
      ))}
    </View>
  )
}
