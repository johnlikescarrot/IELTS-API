import type { FastifyInstance } from "fastify";
import { getBandDescriptorById, getBandDescriptors } from "../data/band-descriptors.js";
import { optionalInt, optionalSkill } from "../lib/params.js";
import { registerResource } from "../lib/register-resource.js";

export default async function bandDescriptorRoutes(app: FastifyInstance): Promise<void> {
  registerResource(
    app,
    "/api/v1/band-descriptors",
    (params) => getBandDescriptors(optionalSkill(params.skill), optionalInt(params.band)),
    getBandDescriptorById,
  );
}
