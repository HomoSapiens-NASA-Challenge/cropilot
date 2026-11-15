import {
  createFarmMutation,
  listFarmsQueryKey,
  zFarmCreate,
} from "@cropilot/api"
import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { View } from "react-native"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Text } from "@/components/ui/text"

export function FarmForm() {
  const queryClient = useQueryClient()
  const createFarm = useMutation({
    ...createFarmMutation(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: listFarmsQueryKey() }),
  })

  const form = useForm({
    defaultValues: { name: "" },
    // Same rules the API enforces: the schema is generated from its contract.
    validators: { onSubmit: zFarmCreate },
    onSubmit: async ({ value, formApi }) => {
      await createFarm.mutateAsync({ body: value })
      formApi.reset()
    },
  })

  return (
    <Card>
      <CardContent className="gap-4">
        <form.Field name="name">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <View className="gap-2">
                <Label nativeID="farm-name">Farm name</Label>
                <Input
                  aria-labelledby="farm-name"
                  aria-invalid={isInvalid}
                  className="bg-card"
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  onBlur={field.handleBlur}
                  autoCorrect={false}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={() => form.handleSubmit()}
                />
                {isInvalid &&
                  field.state.meta.errors.map((error, index) =>
                    error?.message ? (
                      <Text key={index} className="text-sm text-destructive">
                        {error.message}
                      </Text>
                    ) : null
                  )}
                {createFarm.isError ? (
                  <Text className="text-sm text-destructive">
                    Could not save the farm. Try again.
                  </Text>
                ) : null}
              </View>
            )
          }}
        </form.Field>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button
              className="w-full"
              disabled={isSubmitting}
              onPress={() => form.handleSubmit()}
            >
              <Text>Add farm</Text>
            </Button>
          )}
        </form.Subscribe>
      </CardContent>
    </Card>
  )
}
