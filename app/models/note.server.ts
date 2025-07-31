import arc from "@architect/functions";
import { createId } from "@paralleldrive/cuid2";

import type { User } from "./user.server";

export interface Note {
  id: ReturnType<typeof createId>;
  userId: User["id"];
  title: string;
  body: string;
}

interface NoteItem {
  userId: User["id"];
  noteId: `note#${Note["id"]}`;
}

const noteIdToId = (noteId: NoteItem["noteId"]): Note["id"] => noteId.replace(/^note#/, "");
const idTonoteId = (id: Note["id"]): NoteItem["noteId"] => `note#${id}`;

export async function getNote({
  id,
  userId,
}: Pick<Note, "id" | "userId">): Promise<Note | null> {
  const db = await arc.tables();

  const result = await db.note.get({ userId: userId, noteId: idTonoteId(id) });

  if (result) {
    return {
      userId: result.userId,
      id: result.noteId,
      title: result.title,
      body: result.body,
    };
  }
  return null;
}

export async function getNoteListItems({
  userId,
}: Pick<Note, "userId">): Promise<Pick<Note, "id" | "title">[]> {
  const db = await arc.tables();

  const result = await db.note.query({
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: { ":userId": userId },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result.Items.map((n: any) => ({
    title: n.title,
    id: noteIdToId(n.noteId),
  }));
}

export async function createNote({
  body,
  title,
  userId,
}: Pick<Note, "body" | "title" | "userId">): Promise<Note> {
  const db = await arc.tables();

  const result = await db.note.put({
    userId: userId,
    noteId: idTonoteId(createId()),
    title: title,
    body: body,
  });
  return {
    id: noteIdToId(result.noteId),
    userId: result.userId,
    title: result.title,
    body: result.body,
  };
}

export async function deleteNote({ id, userId }: Pick<Note, "id" | "userId">) {
  const db = await arc.tables();
  return db.note.delete({ userId: userId, noteId: idTonoteId(id) });
}
