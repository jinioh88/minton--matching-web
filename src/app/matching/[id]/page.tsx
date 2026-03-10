export default async function MatchingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">매칭 상세</h1>
      <p className="mt-2 text-gray-600">매칭 ID: {id}</p>
    </div>
  );
}
