export default async function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">프로필</h1>
      <p className="mt-2 text-gray-600">유저 ID: {userId}</p>
    </div>
  );
}
