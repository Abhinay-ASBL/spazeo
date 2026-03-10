import { FloorPlanEditorShell } from './FloorPlanEditorShell'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function FloorPlanEditPage({ params }: PageProps) {
  const { id } = await params
  return <FloorPlanEditorShell projectId={id} />
}
