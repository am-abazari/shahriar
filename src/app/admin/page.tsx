import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/AdminPanel";
import { getAdmin, isUsingEnvPassword } from "@/server/auth";
import { isAdmin } from "@/server/session";

export const metadata: Metadata = { title: "حساب ادمین" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/login?next=/admin");

  const [admin, usingEnv] = await Promise.all([getAdmin(), isUsingEnvPassword()]);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <AdminPanel username={admin?.username ?? "admin"} usingEnvPassword={usingEnv} />
    </div>
  );
}
