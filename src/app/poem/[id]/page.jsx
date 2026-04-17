// axios
import api from "@axios/axiosServer";

// sections
import Poem from "@sections/Poem";

const Page = async ({ params }) => {
  const { id } = await params;
  const result = await api.get(`/poem/${id}`);
  const poem = result?.data?.data;
  return <Poem voice={process.env.API_BASE_URL + poem.voice} poem={poem} />;
};

export default Page;
