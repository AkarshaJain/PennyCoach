import { getAdvisorSnapshot } from "@/lib/advisor-service";
import { httpOk } from "@/lib/api";

export async function GET() {
  const { advisor, inputs } = await getAdvisorSnapshot();
  return httpOk({ advisor, inputs });
}
