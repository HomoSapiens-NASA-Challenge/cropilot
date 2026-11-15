import { router } from "expo-router"
import { ArrowLeft, ArrowRight } from "lucide-react-native"
import { Pressable, View } from "react-native"
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
import { Text } from "@/components/ui/text"
import { HeroWash } from "@/features/landing/decor"

// Demo build: the sign-in is decorative. Any press on the screen goes in.
function enterDemo() {
  router.replace("/overview")
}

export default function SignInScreen() {
  return (
    <SafeAreaView className="flex-1 bg-secondary">
      <HeroWash />
      <StrandsArt className="absolute inset-0" />
      <Pressable
        className="flex-1"
        accessibilityLabel="Enter the demo"
        onPress={enterDemo}
      >
        <View className="flex-row items-center justify-between px-6 py-5">
          <BrandMark />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/")}
            className="flex-row items-center gap-1 rounded-lg"
          >
            <Icon as={ArrowLeft} size={16} className="text-muted-foreground" />
            <Text className="text-sm text-muted-foreground">Back to home</Text>
          </Pressable>
        </View>
        <View className="flex-1 justify-center px-6 pb-20">
          <Card className="w-full max-w-md gap-6 self-center border border-background/80 bg-background/75 py-10 shadow-2xl">
            <CardHeader className="gap-2 px-10">
              <CardTitle className="text-3xl font-light tracking-tight">
                Sign in to Cropilot
              </CardTitle>
              <CardDescription className="text-base">
                Compare crop rotations with the past campaigns that started like
                this one.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-10">
              <Button size="lg" className="w-full" onPress={enterDemo}>
                <Text>Continue with Google</Text>
                <Icon
                  as={ArrowRight}
                  className="text-primary-foreground"
                  size={16}
                />
              </Button>
            </CardContent>
            <CardFooter className="border-t border-border px-10 pt-6">
              <Text className="text-xs text-muted-foreground">
                New here? Signing in with Google creates your account. Cropilot
                supports the agronomist's judgment and never replaces it.
              </Text>
            </CardFooter>
          </Card>
        </View>
      </Pressable>
    </SafeAreaView>
  )
}
