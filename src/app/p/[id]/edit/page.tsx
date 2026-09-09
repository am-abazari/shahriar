import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PieceComposer } from "@/components/PieceComposer";
import { getStore } from "@/server/storage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ویرایش اثر" };

export default async function EditPiecePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const piece = await getStore().get(id);
  if (!piece) notFound();
  return <PieceComposer piece={piece} />;
}
