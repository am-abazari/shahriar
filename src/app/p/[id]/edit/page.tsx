import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PieceComposer } from "@/components/PieceComposer";
import { getPiece } from "@/server/db/pieces";
import { isAdmin } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ویرایش اثر" };

export default async function EditPiecePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await isAdmin())) redirect(`/login?next=/p/${id}/edit`);

  const piece = await getPiece(id);
  if (!piece) notFound();
  return <PieceComposer piece={piece} />;
}
