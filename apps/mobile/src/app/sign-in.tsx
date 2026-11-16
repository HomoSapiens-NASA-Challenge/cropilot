import { handleFromName } from "@cropilot/api"
import { router } from "expo-router"
import { ArrowRight, ChevronLeft } from "lucide-react-native"
import { useState } from "react"
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { BrandMark } from "@/components/brand-mark"
import { StrandsArt } from "@/components/strands-art"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Text } from "@/components/ui/text"
import { INVALID_NAME_MESSAGE, signIn } from "@/features/auth/session"
import { HeroWash } from "@/features/landing/decor"

// The tabs become the only screen, so Back does not lead out to the welcome.
function enterApp() {
  if (router.canDismiss()) router.dismissAll()
  router.replace("/overview")
}

export default function SignInScreen() {
  const [name, setName] = useState("")
  const [failure, setFailure] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handle = handleFromName(name)
  const typed = name.trim().length > 0
  const error =
    failure ?? (typed && handle === null ? INVALID_NAME_MESSAGE : null)

  async function submit() {
    if (handle === null || submitting) return
    setSubmitting(true)
    try {
      await signIn(name)
      enterApp()
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Could not save your name."
      )
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-secondary">
      <HeroWash />
      <StrandsArt className="absolute inset-0" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-row items-center justify-between px-6 py-5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to home"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/")
            }
            className="size-11 items-center justify-center rounded-full active:bg-muted"
          >
            <Icon as={ChevronLeft} size={24} className="text-foreground" />
          </Pressable>
          <BrandMark />
          <View className="size-11" />
        </View>
        <View className="flex-1 justify-center px-6 pb-20">
          <Card className="w-full max-w-md gap-6 self-center border border-background/80 bg-background/75 py-10 shadow-2xl">
            <CardHeader className="gap-2 px-10">
              <CardTitle className="text-3xl font-light tracking-tight">
                Open your workspace
              </CardTitle>
              <CardDescription className="text-base">
                Compare crop rotations with the past campaigns that started like
                this one.
              </CardDescription>
            </CardHeader>
            <CardContent className="gap-4 px-10">
              <View className="gap-2">
                <Label nativeID="name-label">Your name or handle</Label>
                <Input
                  aria-labelledby="name-label"
                  accessibilityLabel="Your name or handle"
                  aria-invalid={error !== null}
                  autoComplete="nickname"
                  textContentType="nickname"
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="go"
                  value={name}
                  onChangeText={(next) => {
                    setName(next)
                    setFailure(null)
                  }}
                  onSubmitEditing={submit}
                  editable={!submitting}
                />
                {error !== null ? (
                  <Text
                    role="alert"
                    accessibilityLiveRegion="polite"
                    className="text-sm text-destructive"
                  >
                    {error}
                  </Text>
                ) : handle !== null ? (
                  <Text
                    accessibilityLiveRegion="polite"
                    className="text-sm text-muted-foreground"
                  >
                    You will be @{handle}
                  </Text>
                ) : null}
              </View>
              <Button
                size="lg"
                className="w-full"
                disabled={handle === null || submitting}
                onPress={submit}
              >
                <Text>Continue</Text>
                <Icon
                  as={ArrowRight}
                  className="text-primary-foreground"
                  size={16}
                />
              </Button>
              <Button variant="ghost" className="w-full" onPress={enterApp}>
                <Text>Explore the public case without a name</Text>
              </Button>
            </CardContent>
            <CardFooter className="border-t border-border px-10 pt-6">
              <Text className="text-xs text-muted-foreground">
                No account or password. Anyone who types the same name opens the
                same workspace. Cropilot supports the agronomist's judgment and
                never replaces it.
              </Text>
            </CardFooter>
          </Card>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
