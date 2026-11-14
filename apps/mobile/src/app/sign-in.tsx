import { useMutation } from "@tanstack/react-query"
import { Button, StyleSheet, Text, View } from "react-native"
import { signInWithGoogle } from "@/features/auth/session"

export default function SignInScreen() {
  const signIn = useMutation({ mutationFn: signInWithGoogle })

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cropilot</Text>
      <Text style={styles.tagline}>
        Decision support for crop rotation planning.
      </Text>
      <Button
        title="Continue with Google"
        disabled={signIn.isPending}
        onPress={() => signIn.mutate()}
      />
      {signIn.error && <Text style={styles.error}>{signIn.error.message}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
  },
  tagline: {
    marginBottom: 12,
    textAlign: "center",
    color: "#737373",
  },
  error: {
    color: "#dc2626",
  },
})
