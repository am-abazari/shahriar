// axios
import api from "@axios/axiosServer";

const Page = async ({ params }) => {
  const { id } = await params;
  const result = await api.get(`/poem/${id}`);
  const poem = result?.data?.data;
  console.log(poem);
  return (
    <div className={"w-full h-full flex flex-col justify-center"}>
      <div className={"bg-white p-5 rounded-xl"}>
        <p className={"font-bold text-lg text-center"}>{poem.name}</p>
        <p className={"text-sm mt-4 flex justify-center gap-14"}>
          <p>{poem.description}</p>
          {/*<p className={"text-gray-500"}>*/}
          {/*  {new Date(poem.createdAt).toLocaleTimeString("fa-IR")}*/}
          {/*  {" - "}*/}
          {/*  {new Date(poem.createdAt).toLocaleDateString("fa-IR")}*/}
          {/*</p>*/}
        </p>
        <div className={"flex flex-col gap-2 mt-14"}>
          {poem?.couplets?.map((couplet) => {
            return (
              <div key={couplet.id} className={"flex gap-20"}>
                <div className={"grow text-left"}>{couplet.verse1}</div>
                <div className={"grow"}>{couplet.verse2}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Page;
