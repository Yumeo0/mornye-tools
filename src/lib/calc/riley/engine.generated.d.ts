import type {
	CharacterPanelRequest,
	CharacterPanelResult,
} from "../../characterPanel";
import type { CalculatorCatalog, Scenario, SimulationResult } from "../types";
export function getCatalog(): CalculatorCatalog;
export function evaluate(scenario: Scenario): SimulationResult;
export function evaluateFast(scenario: Scenario): SimulationResult;
export function resolveRotationStats(
	scenario: Scenario,
	targetId?: number,
): Scenario;
export function characterPanel(
	input: CharacterPanelRequest,
): CharacterPanelResult;
