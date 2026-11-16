import {
  getWorkspaceQueryKey,
  listRegionsOptions,
  type Region,
  saveWorkspaceMutation,
} from "@cropilot/api"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { RegionPicker } from "@/components/region-picker"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useI18n } from "@/lib/i18n"

/** Changes the region the workspace is scoped to, without leaving the page. */
export function RegionDialog({
  currentRegion,
  open,
  onOpenChange,
}: {
  currentRegion: Region
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-6 p-6 sm:max-w-5xl">
        {/* The popup unmounts when closed, so every opening starts from the saved region. */}
        <RegionDialogBody
          currentRegion={currentRegion}
          onSaved={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function RegionDialogBody({
  currentRegion,
  onSaved,
}: {
  currentRegion: Region
  onSaved: () => void
}) {
  const { t } = useI18n("app")

  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: regions } = useSuspenseQuery(listRegionsOptions())
  const [selectedRegionId, setSelectedRegionId] = useState(currentRegion.id)
  const saveWorkspace = useMutation({
    ...saveWorkspaceMutation(),
    onSuccess: async (savedWorkspace) => {
      queryClient.setQueryData(getWorkspaceQueryKey(), savedWorkspace)
      // The signed-in layout reads the region in `beforeLoad`; rerun it so every page follows.
      await router.invalidate()
      onSaved()
    },
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-light tracking-tight">
          {t("Change region")}
        </DialogTitle>
        <DialogDescription>
          {t(
            "Cropilot scopes every analysis to one department: its NASA POWER climate cell, its soil and its MAGyP yields."
          )}
        </DialogDescription>
      </DialogHeader>
      <RegionPicker
        regions={regions}
        selectedRegionId={selectedRegionId}
        onSelect={setSelectedRegionId}
      />
      <DialogFooter className="-mx-6 -mb-6 px-6">
        {saveWorkspace.isError && (
          <p role="alert" className="text-sm text-destructive sm:mr-auto">
            {t("Could not save the region. Try again.")}
          </p>
        )}
        <DialogClose render={<Button variant="outline" />}>
          {t("Cancel")}
        </DialogClose>
        <Button
          disabled={
            saveWorkspace.isPending || selectedRegionId === currentRegion.id
          }
          onClick={() =>
            saveWorkspace.mutate({ body: { region_id: selectedRegionId } })
          }
        >
          {saveWorkspace.isPending ? t("Saving…") : t("Save region")}
        </Button>
      </DialogFooter>
    </>
  )
}
