import { loadAppData } from "@/lib/data";
import { RishehApp } from "@/risheh/RishehApp";

export default async function Page() {
  const data = await loadAppData();
  return <RishehApp data={data} />;
}
