import Link from "next/link";

// axios
import api from "@axios/axiosServer";

export default async function Page() {
  let poems = [];
  try {
    poems = await api.get("/poem");
  } catch {}
  return (
    <div className={"flex flex-col gap-4 justify-center h-full"}>
      {poems?.data?.data.map((poem) => {
        return (
          <Link
            href={`/poem/${poem.id}`}
            key={poem.id}
            className={"bg-white p-3 rounded-xl shadow-md"}
          >
            <p className={"font-bold text-lg mb-1"}>{poem.name}</p>
            <p>{poem.description}</p>
          </Link>
        );
      })}
    </div>
  );
}
