
import RouteEditor from "@/components/transit/RouteEditor";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditRoutePage({
  params,
}: Props) {
  const { id } = await params;

  return <RouteEditor routeId={id} />;
}
