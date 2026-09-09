import type { Metadata } from "next";
import { PieceComposer } from "@/components/PieceComposer";

export const metadata: Metadata = { title: "افزودن اثر" };

export default function NewPiecePage() {
  return <PieceComposer />;
}
