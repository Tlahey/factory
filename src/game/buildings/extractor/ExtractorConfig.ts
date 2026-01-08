import { ExtractorConfigType } from "../BuildingConfig";
// import { Extractor } from "./Extractor";
// import { BuildingEntity } from "../../entities/BuildingEntity";

export const EXTRACTOR_CONFIG: ExtractorConfigType = {
  id: "extractor",
  name: "Extractor",
  type: "extractor",
  cost: 10,
  hasMenu: true,
  description: "Extracts resources from the ground. Requires Energy.",
  io: {
    hasInput: false,
    hasOutput: true,
    showArrow: true,
    outputSide: "front", // Output in direction extractor faces
  },
  maxCount: 3,
  extractionRate: 60, // items per minute
  powerConfig: {
    type: "consumer",
    rate: 20,
  },
  upgrades: [],
};
