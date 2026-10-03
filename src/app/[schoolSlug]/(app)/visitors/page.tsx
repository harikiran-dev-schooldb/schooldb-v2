import { OperationsModulePage } from "@/features/operations/OperationsModulePage";
export default async function Page({ params }: { params: Promise<{ schoolSlug: string }> }) { return <OperationsModulePage schoolSlug={(await params).schoolSlug} module="visitors" />; }
