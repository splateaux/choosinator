import arc from "@architect/functions";

export async function castVote({
  pollId,
  userId,
  optionId,
}: {
  pollId: string;
  userId: string;
  optionId: string;
}): Promise<void> {
  const db = await arc.tables();
  const pk = `POLL#${pollId}`;
  const sk = `VOTE#${optionId}#${userId}`;
  await db.pollVote.put({
    pk,
    sk,
    userId,
    optionId,
    updatedAt: new Date().toISOString(),
  });
}
