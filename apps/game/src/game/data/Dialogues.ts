export interface DialogueConfig {
  id: string;
  titleKey: string;
  textKey: string | string[];
  image?: string; // Path to image
  blocking?: boolean; // If true, pauses game or prevents interaction (optional implementation)
  next?: string; // ID of the next dialogue to show automatically
  focusElement?: string | (string | null)[]; // ID(s) of the DOM element to highlight (can be array for pages)
  repeatable?: boolean; // If true, can show even if already seen
}

export const DIALOGUES: Record<string, DialogueConfig> = {
  welcome: {
    id: "welcome",
    titleKey: "dialogue.welcome_intro.title",
    textKey: ["dialogue.welcome_intro.text", "dialogue.welcome_task.text"],
    focusElement: [null, "control-bar-build"],
  },
  first_selection: {
    id: "first_selection",
    titleKey: "dialogue.first_selection.title",
    textKey: "dialogue.first_selection.text",
  },
  electricity: {
    id: "electricity",
    titleKey: "dialogue.electricity.title",
    textKey: "dialogue.electricity.text",
  },
  hub_placed: {
    id: "hub_placed",
    titleKey: "dialogue.hub_placed.title",
    textKey: "dialogue.hub_placed.text",
  },
  hub_info_overview: {
    id: "hub_info_overview",
    titleKey: "dialogue.hub_info_overview.title",
    textKey: [
      "dialogue.hub_info_overview.text_1",
      "dialogue.hub_info_overview.text_2",
      "dialogue.hub_info_overview.text_3",
    ],
    focusElement: [
      "hub-overview-panel",
      "hub-skill-tree-panel",
      "hub-skill-tree-panel",
    ],
    blocking: false,
  },
  hub_info_tree: {
    id: "hub_info_tree",
    titleKey: "dialogue.hub_info_tree.title",
    textKey: "dialogue.hub_info_tree.text",
    focusElement: "hub-skill-tree-panel",
  },
  extractor_no_power: {
    id: "extractor_no_power",
    titleKey: "dialogue.extractor_no_power.title",
    textKey: "dialogue.extractor_no_power.text",
  },
  extractor_no_resources: {
    id: "extractor_no_resources",
    titleKey: "dialogue.extractor_no_resources.title",
    textKey: "dialogue.extractor_no_resources.text",
  },
  mined_stone: {
    id: "mined_stone",
    titleKey: "dialogue.mined_stone.title",
    textKey: "dialogue.mined_stone.text",
  },
  mined_iron: {
    id: "mined_iron",
    titleKey: "dialogue.mined_iron.title",
    textKey: "dialogue.mined_iron.text",
  },
  building_menu_intro: {
    id: "building_menu_intro",
    titleKey: "dialogue.building_menu_intro.title",
    textKey: [
      "dialogue.building_menu_intro.text_1",
      "dialogue.building_menu_intro.text_2",
      "dialogue.building_menu_intro.text_3",
    ],
    focusElement: [
      "building-menu-grid",
      "building-menu-details-panel",
      "hub-card",
    ],
    blocking: false,
    repeatable: true,
  },
  hub_shop_intro: {
    id: "hub_shop_intro",
    titleKey: "dialogue.hub_shop_intro.title",
    textKey: [
      "dialogue.hub_shop_intro.text_1",
      "dialogue.hub_shop_intro.text_2",
    ],
    focusElement: ["hub-shop-tab", "hub-shop-panel"],
    blocking: false,
  },
};
