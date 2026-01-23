"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGameContext } from "../providers/GameProvider";
import { BuildingEntity } from "../entities/BuildingEntity";

import { ConveyorView } from "./buildings/ConveyorView";
import { SawmillView } from "./buildings/SawmillView";
import { ExtractorView } from "./buildings/ExtractorView";
import { FurnaceView } from "./buildings/FurnaceView";
import { HubView } from "./buildings/HubView";
import { ChestView } from "./buildings/ChestView";
import { BatteryView } from "./buildings/BatteryView";
import { BiomassPlantView } from "./buildings/BiomassPlantView";
import { ElectricPoleView } from "./buildings/ElectricPoleView";
import { ConveyorMergerView } from "./buildings/ConveyorMergerView";
import { ConveyorSplitterView } from "./buildings/ConveyorSplitterView";
import { useState } from "react";
import { ParticleSystem } from "../visuals/helpers/ParticleSystem";
import { Conveyor } from "../buildings/conveyor/Conveyor";
import { Sawmill } from "../buildings/sawmill/Sawmill";
import { Extractor } from "../buildings/extractor/Extractor";
import { Furnace } from "../buildings/furnace/Furnace";
import { Hub } from "../buildings/hub/Hub";
import { Chest } from "../buildings/chest/Chest";
import { Battery } from "../buildings/battery/Battery";
import { BiomassPlant } from "../buildings/biomass-plant/BiomassPlant";
import { ElectricPole } from "../buildings/electric-pole/ElectricPole";
import { ConveyorMerger } from "../buildings/conveyor-merger/ConveyorMerger";
import { ConveyorSplitter } from "../buildings/conveyor-splitter/ConveyorSplitter";

/**
 * BuildingsRenderer Component
 *
 * Orchestrates all building visuals in R3F.
 *
 * This is a "bridge" component that:
 * 1. Listens for building changes in the World
 * 2. Creates/destroys visual instances using existing BuildingFactory
 * 3. Updates all visuals each frame via useFrame
 *
 * The visuals are still class-based (VisualEntity) - we just wrap them in R3F.
 * Full migration to declarative components would happen in a later phase.
 */
export function BuildingsRenderer() {
  const { world } = useGameContext();
  const { scene } = useThree();

  // We need to force a re-render when the building list changes
  // Since 'world.buildings' is a map, we can track its size or use a signal
  const [buildingList, setBuildingList] = useState<BuildingEntity[]>([]);
  const lastCountRef = useRef(0);

  // Particle System (Shared Resource)
  // Particle System (Shared Resource)
  const [particleSystem, setParticleSystem] = useState<ParticleSystem | null>(
    null,
  );

  // Initialize Particles
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setParticleSystem(new ParticleSystem(scene));
  }, [scene]);

  // Track last sync version to avoid expensive Map iterations every frame
  const lastSyncStateRef = useRef<string>("");

  // Update Visual List Frame Loop
  useFrame((_, delta) => {
    particleSystem?.update(delta);

    // Robust check: compare a serialized state string of building IDs
    // This is faster than building the full list every frame
    // Deduplicate buildings (multi-tile buildings exist in multiple map entries)
    const uniqueBuildings = new Map<string, BuildingEntity>();
    world.buildings.forEach((b) => {
      if (!uniqueBuildings.has(b.id)) {
        uniqueBuildings.set(b.id, b);
      }
    });

    // Create a simple identity string to detect changes
    // Format: "id1,id2,id3..." sorted to be order-independent
    const currentIds = Array.from(uniqueBuildings.keys()).sort().join(",");

    if (currentIds !== lastSyncStateRef.current) {
      setBuildingList(Array.from(uniqueBuildings.values()));
      lastSyncStateRef.current = currentIds;
      lastCountRef.current = world.buildings.size;
    }
  });

  return (
    <group>
      {buildingList.map((building) => {
        const isConveyor = building.getType() === "conveyor";

        // Key needs to be stable for the specific building instance
        // building.id is a UUID created on instantiation
        const key = building.id;

        if (isConveyor) {
          return (
            <ConveyorView key={key} entity={building as unknown as Conveyor} />
          );
        } else if (building.getType() === "sawmill") {
          return (
            <SawmillView
              key={key}
              entity={building as unknown as Sawmill}
              particleSystem={particleSystem!}
            />
          );
        } else if (building.getType() === "extractor") {
          return (
            <ExtractorView
              key={key}
              entity={building as unknown as Extractor}
              particleSystem={particleSystem!}
            />
          );
        } else if (building.getType() === "furnace") {
          return (
            <FurnaceView
              key={key}
              entity={building as unknown as Furnace}
              particleSystem={particleSystem!}
            />
          );
        } else if (building.getType() === "hub") {
          return <HubView key={key} entity={building as unknown as Hub} />;
        } else if (building.getType() === "chest") {
          return <ChestView key={key} entity={building as unknown as Chest} />;
        } else if (building.getType() === "battery") {
          return (
            <BatteryView key={key} entity={building as unknown as Battery} />
          );
        } else if (building.getType() === "biomass_plant") {
          return (
            <BiomassPlantView
              key={key}
              entity={building as unknown as BiomassPlant}
            />
          );
        } else if (building.getType() === "electric_pole") {
          return (
            <ElectricPoleView
              key={key}
              entity={building as unknown as ElectricPole}
            />
          );
        } else if (building.getType() === "conveyor_merger") {
          return (
            <ConveyorMergerView
              key={key}
              entity={building as unknown as ConveyorMerger}
            />
          );
        } else if (building.getType() === "conveyor_splitter") {
          return (
            <ConveyorSplitterView
              key={key}
              entity={building as unknown as ConveyorSplitter}
            />
          );
        } else {
          return null;
        }
      })}
    </group>
  );
}
