import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import WorldTooltip from "./WorldTooltip";
import { useGameStore } from "../../game/state/store";
import { IWorld } from "../../game/entities/types";

// Mock store
vi.mock("../../game/state/store", () => ({
  useGameStore: vi.fn(),
}));

// Mock translation
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock window.game
const mockGetBuilding = vi.fn();
const mockGetConnectionsCount = vi.fn();

Object.defineProperty(window, "game", {
  value: {
    world: {
      getBuilding: mockGetBuilding,
      getConnectionsCount: mockGetConnectionsCount,
    } as unknown as IWorld,
  },
  writable: true,
});

describe("WorldTooltip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useGameStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector) =>
        selector({
          hoveredEntityKey: null,
          selectedBuilding: "select",
          openedEntityKey: null,
        }),
    );
  });

  test("renders nothing if no entity is hovered", () => {
    const { container } = render(<WorldTooltip />);
    expect(container).toBeEmptyDOMElement();
  });

  test("renders nothing if building not found", () => {
    (useGameStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector) =>
        selector({
          hoveredEntityKey: "10,10",
          selectedBuilding: "select",
          openedEntityKey: null,
        }),
    );
    mockGetBuilding.mockReturnValue(null);

    const { container } = render(<WorldTooltip />);
    expect(container).toBeEmptyDOMElement();
  });

  test("renders tooltip for hovered building", async () => {
    (useGameStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector) =>
        selector({
          hoveredEntityKey: "10,10",
          selectedBuilding: "select",
          openedEntityKey: null,
        }),
    );

    mockGetBuilding.mockReturnValue({
      getType: () => "extractor",
      getConfig: () => ({ id: "extractor", name: "Extractor" }),
    });

    render(<WorldTooltip />);

    expect(screen.getByText("building.extractor.name")).toBeInTheDocument();
  });

  test("renders connection count for electric pole", () => {
    (useGameStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector) =>
        selector({
          hoveredEntityKey: "5,5",
          selectedBuilding: "select",
          openedEntityKey: null,
        }),
    );

    mockGetBuilding.mockReturnValue({
      getType: () => "electric_pole",
      getConfig: () => ({
        id: "electric_pole",
        name: "Pole",
        maxConnections: 5,
      }),
      maxConnections: 5,
    });
    mockGetConnectionsCount.mockReturnValue(3);

    render(<WorldTooltip />);

    expect(screen.getByText("building.electric_pole.name")).toBeInTheDocument();
    expect(screen.getByText("3 / 5")).toBeInTheDocument();
  });

  test("updates position on mouse move", () => {
    (useGameStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector) =>
        selector({
          hoveredEntityKey: "10,10",
          selectedBuilding: "select",
          openedEntityKey: null,
        }),
    );

    mockGetBuilding.mockReturnValue({
      getType: () => "extractor",
      getConfig: () => ({ id: "extractor", name: "Extractor" }),
    });

    const { container } = render(<WorldTooltip />);

    // Initially positioned off-screen or default
    const tooltip = container.firstChild as SimpleElement;

    // Trigger mouse move
    act(() => {
      fireEvent.mouseMove(window, { clientX: 100, clientY: 200 });
    });

    // Style is inline, so we check it
    // left: 100 + 15 = 115
    // top: 200 + 15 = 215
    expect(tooltip).toHaveStyle({ left: "115px", top: "215px" });
  });

  test("hides if placing a building (other than select/delete/cable)", () => {
    (useGameStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector) =>
        selector({
          hoveredEntityKey: "10,10",
          selectedBuilding: "extractor", // Placing extractor
          openedEntityKey: null,
        }),
    );
    mockGetBuilding.mockReturnValue({
      getType: () => "extractor",
      getConfig: () => ({ id: "extractor" }),
    });

    const { container } = render(<WorldTooltip />);
    expect(container).toBeEmptyDOMElement();
  });
});

type SimpleElement = HTMLElement & { style: CSSStyleDeclaration };
