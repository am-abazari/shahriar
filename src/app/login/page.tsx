import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { isAdmin } from "@/server/session";

export const metadata: Metadata = { title: "ورود" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/new");

  return (
    <div className="mx-auto grid min-h-[70dvh] w-full max-w-6xl place-items-center px-5 py-12">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
