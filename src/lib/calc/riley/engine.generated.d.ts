import type {
	CharacterPanelRequest,
	CharacterPanelResult,
} from "../../characterPanel";
import type {
	CalculatorCatalog,
	PlaybackScenario,
	PlaybackSimulationResult,
	ResolvedScenario,
	Scenario,
	SimulationResult,
} from "../types";
export function getCatalog(): CalculatorCatalog;
export function evaluate(scenario: PlaybackScenario): PlaybackSimulationResult;
export function evaluate(scenario: Scenario): SimulationResult;
export function evaluateFast(scenario: Scenario): SimulationResult;
export function resolveRotationStats<T extends Scenario>(
	scenario: T,
	targetId?: number,
): ResolvedScenario<T>;
export function characterPanel(
	input: CharacterPanelRequest,
): CharacterPanelResult;
