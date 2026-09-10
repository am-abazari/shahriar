import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PieceComposer } from "@/components/PieceComposer";
import { isAdmin } from "@/server/session";

export const metadata: Metadata = { title: "افزودن اثر" };
export const dynamic = "force-dynamic";

export default async function NewPiecePage() {
  if (!(await isAdmin())) redirect("/login?next=/new");
  return <PieceComposer />;
}
