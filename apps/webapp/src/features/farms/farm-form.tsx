import {
  createFarmMutation,
  listFarmsQueryKey,
  zFarmCreate,
} from "@cropilot/api"
import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

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
    <form
      className="flex items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.Field name="name">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Farm name</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={isInvalid}
                autoComplete="off"
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
              {createFarm.isError && (
                <FieldError>Could not save the farm. Try again.</FieldError>
              )}
            </Field>
          )
        }}
      </form.Field>
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button type="submit" disabled={isSubmitting}>
            Add farm
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
