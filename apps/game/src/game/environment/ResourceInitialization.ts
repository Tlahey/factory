import { resourceRegistry } from "./ResourceRegistry";
import { StoneResource } from "./rock/StoneResource";
import { IronOre } from "./iron_ore/IronOre";
import { CopperOre } from "./copper_ore/CopperOre";
import { GoldOre } from "./gold_ore/GoldOre";
import { IronIngot } from "./iron_ingot/IronIngot";
import { CopperIngot } from "./copper_ingot/CopperIngot";
import { GoldIngot } from "./gold_ingot/GoldIngot";
import { WoodResource } from "./tree/WoodResource";

export function initializeResources() {
  resourceRegistry.register(new StoneResource());
  resourceRegistry.register(new IronOre());
  resourceRegistry.register(new CopperOre());
  resourceRegistry.register(new GoldOre());
  resourceRegistry.register(new IronIngot());
  resourceRegistry.register(new CopperIngot());
  resourceRegistry.register(new GoldIngot());
  resourceRegistry.register(new WoodResource());
}
