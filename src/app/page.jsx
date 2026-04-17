// axios
import api from "@axios/axiosServer";
import Link from "next/link";

export default async function Home() {
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
            <div className={"flex justify-between items-center gap-2"}>
              <p
                className={"font-bold text-lg mb-1 text-(--text-primary) grow"}
              >
                {poem.name}
              </p>
              <p className={"shrink-0"}>{poem.poet}</p>
            </div>
            <div className={"mt-3 text-gray-700 flex justify-between gap-2"}>
              <p className={"grow"}>{poem.description}</p>
              <p className={"shrink-0 text-gray-400 text-xs"}>
                {new Date(poem.createdAt).toLocaleTimeString("fa-IR")}
                {" - "}
                {new Date(poem.createdAt).toLocaleDateString("fa-IR")}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
