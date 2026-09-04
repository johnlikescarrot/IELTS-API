import { describe, expect, it } from "vitest";
import { expectApiError, getJson } from "./helpers/http.ts";

interface Tip {
  id: number;
  skill: string;
  title: string;
  detail: string;
}

interface ListBody {
  data: Tip[];
  meta: { total: number };
}

describe("GET /v1/tips", () => {
  it("lists all tips by default", async () => {
    const { status, body } = await getJson<ListBody>("/v1/tips");
    expect(status).toBe(200);
    expect(body.meta.total).toBe(24);
  });

  it("filters by skill and echoes it in pagination links", async () => {
    const { body } = await getJson<ListBody>("/v1/tips?skill=speaking");
    expect(body.meta.total).toBe(5);
    expect(body.data.every((tip) => tip.skill === "speaking")).toBe(true);

    const general = await getJson<ListBody>("/v1/tips?skill=general");
    expect(general.body.meta.total).toBe(4);
  });

  it("paginates", async () => {
    const { body } = await getJson<ListBody>("/v1/tips?per_page=10&page=2");
    expect(body.data).toHaveLength(10);
    expect(body.meta.totalPages).toBe(3);
  });

  it("treats an empty skill filter as absent", async () => {
    const { body } = await getJson<ListBody>("/v1/tips?skill=");
    expect(body.meta.total).toBe(24);
  });

  it("rejects invalid skill and pagination", async () => {
    await expectApiError("/v1/tips?skill=spelling", 400, "invalid_parameter");
    await expectApiError("/v1/tips?page=0", 400, "invalid_parameter");
    await expectApiError("/v1/tips?per_page=101", 400, "invalid_parameter");
  });
});
