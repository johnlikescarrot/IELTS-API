import { describe, expect, it } from "vitest";
import { expectApiError, getJson } from "./helpers/http.ts";

interface Mistake {
  id: number;
  category: string;
  incorrect: string;
  correct: string;
  explanation: string;
}

interface ListBody {
  data: Mistake[];
  meta: { total: number };
}

describe("GET /v1/mistakes", () => {
  it("lists all mistakes by default", async () => {
    const { status, body } = await getJson<ListBody>("/v1/mistakes");
    expect(status).toBe(200);
    expect(body.meta.total).toBe(40);
    expect(body.data[0]?.incorrect).toContain("People");
  });

  it("filters by category", async () => {
    const spelling = await getJson<ListBody>("/v1/mistakes?category=spelling");
    expect(spelling.body.meta.total).toBe(7);
    expect(spelling.body.data.every((item) => item.category === "spelling")).toBe(true);

    const style = await getJson<ListBody>("/v1/mistakes?category=style&per_page=100");
    expect(style.body.meta.total).toBe(6);
  });

  it("searches corrections and explanations", async () => {
    const { body } = await getJson<ListBody>("/v1/mistakes?q=received");
    expect(body.meta.total).toBe(1);
    expect(body.data[0]?.correct).toContain("received");
  });

  it("sorts by category with id tiebreaks", async () => {
    const { body } = await getJson<ListBody>("/v1/mistakes?sort=category&order=desc&per_page=5");
    const categories = body.data.map((item) => item.category);
    expect(categories).toEqual([...categories].sort().reverse());
  });

  it("rejects invalid category, sort, order and pagination", async () => {
    await expectApiError("/v1/mistakes?category=typos", 400, "invalid_parameter");
    await expectApiError("/v1/mistakes?sort=severity", 400, "invalid_parameter");
    await expectApiError("/v1/mistakes?order=up", 400, "invalid_parameter");
    await expectApiError("/v1/mistakes?page=0", 400, "invalid_parameter");
    await expectApiError("/v1/mistakes?per_page=1000", 400, "invalid_parameter");
  });
});
