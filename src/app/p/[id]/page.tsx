import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PieceView } from "@/components/PieceView";
import { getPiece } from "@/server/db/pieces";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const piece = await getPiece(id);
  if (!piece) return { title: "اثر پیدا نشد" };
  return {
    title: piece.title,
    description: piece.poet ? `${piece.title} — ${piece.poet}` : piece.title,
  };
}

export default async function PiecePage({ params }: Props) {
  const { id } = await params;
  const piece = await getPiece(id);
  if (!piece) notFound();
  return <PieceView piece={piece} />;
}
