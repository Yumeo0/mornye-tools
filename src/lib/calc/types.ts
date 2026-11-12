// Serializable application contracts. Upstream engine objects stay in the worker.
import type { EchoProp, StatKey } from "@/lib/account";

export interface CalcEcho {
	uid: string;
	typeId: number;
	name: string;
	cost: number;
	setId: number;
	level: number;
	mainStats: EchoProp[];
	substats: EchoProp[];
}
export interface TeamMemberProfile {
	characterId: number;
	name: string;
	loadoutId: number;
	variant: string;
	mainDps: boolean;
	mainEcho: { typeId: number; name: string; engineId: number };
	minSequence: number;
	maxSequence: number;
	weapons: { id: number; name: string; ranks: number[] }[];
	/** Authored signature/preferred weapon; option order has no meaning. */
	defaultWeapon: { id: number; rank: number };
	/** A separate kit stat target, not the energy needed to execute the rotation. */
	kitMinEr: number;
	kitMinCr: number;
	recommendedMains: string[];
}
export interface TeamProfile {
	id: string;
	label: string;
	members: TeamMemberProfile[];
	errors: string[];
	customRotation?: CustomRotation;
	diagnosticDetails?: RotationDiagnostic[];
}
export interface RotationAction {
	id: string;
	/** Shared base press; saved action IDs continue to identify their exact ending. */
	baseId?: string;
	/** Equivalent palette entry; runtime actions and saved IDs remain separate. */
	paletteId?: string;
	/** A selectable sequence of modeled stages; endings remain independent. */
	stages?: { familyId: string; name: string; parts: string[] };
	name: string;
	kind: string;
	seconds: number;
	variant: string;
	mainEchoId?: number;
}
export interface RotationKit {
	member: TeamMemberProfile;
	actions: RotationAction[];
	start: string[];
	opener: string[];
	repeat: string[];
}
export type RotationNode =
	| { id: string; kind: "action"; characterId: number; actionId: string }
	| { id: string; kind: "wait"; characterId: number; seconds: number }
	| { id: string; kind: "loop"; count: number; children: RotationNode[] };
export interface CustomRotation {
	id: string;
	name: string;
	members: { loadoutId: number; mainEchoId: number; mainDps: boolean }[];
	nodes: RotationNode[];
}
export interface CalculatorCatalog {
	revision: string;
	teams: TeamProfile[];
	sets: number[];
	rotationKits?: RotationKit[];
}
export interface MemberBuild {
	characterId: number;
	chain: number;
	weaponId: number;
	weaponRank: number;
	/** Rotation stats are theoretical and never reserve or equip inventory. */
	echoSource?: "equipped" | "rotation";
	rotationStats?: { echoIndex: number; mainstatIndex: number; erRolls: number };
	echoes: CalcEcho[];
}
export interface Scenario {
	profileId: string;
	members: MemberBuild[];
	/** Continuous sections: opener followed by repeat cycles. */
	cycles: number;
	rotation?: CustomRotation;
	/** Builder-only report; inventory searches do not capture playback. */
	capturePlayback?: boolean;
}
export type Objective =
	| { kind: "memberDamage"; characterId: number }
	| { kind: "teamDamage" };
export interface EnergyStatus {
	characterId: number;
	name: string;
	actual: number;
	required: number;
	kitMinimum: number;
	feasible: boolean;
}
export interface OptResultStats {
	atk: number;
	hp: number;
	def: number;
	er: number;
	cr: number;
	cd: number;
	/** Constant panel bonuses, in percent units. Optional for older saved scores. */
	bonuses?: Partial<
		Record<
			| StatKey
			| "physical"
			| "damage"
			| "intro"
			| "outro"
			| "echo"
			| "tuneBreak",
			number
		>
	>;
}
export interface SimulationResult {
	feasible: boolean;
	damageByMember: Record<number, number>;
	teamDamage: number;
	duration: number;
	energy: EnergyStatus[];
	diagnostics: string[];
	diagnosticDetails?: RotationDiagnostic[];
	/** Constant character-panel stats, not a timed combat snapshot. */
	stats: Record<number, OptResultStats>;
	playback?: RotationPlaybackEntry[];
}
export interface RotationDiagnostic {
	message: string;
	nodeId?: string;
	/** First actionable problem, without the character/action context already on the block. */
	summary?: string;
}
export interface RotationPlaybackEntry {
	id: string;
	characterId: number;
	name: string;
	kind: string;
	time: number;
	duration: number;
	damage: number;
	automatic: boolean;
	source?: string;
}
export interface OptResultEntry {
	uids: string[];
	damage: number;
	stats: OptResultStats | null;
	energy?: EnergyStatus[];
}
export interface OptPrgr {
	processed: number;
	total: number;
	elapsedMs: number;
	remainingMs: number;
	progress: number;
	speed: number;
}
export interface SearchRequest {
	scenario: Scenario;
	targetId: number;
	objective: Objective;
	inventory: CalcEcho[];
	mainTypeId: number;
	resultsLimit: number;
	budget: number;
}
export interface SearchUpdate {
	results: OptResultEntry[];
	baseline: OptResultEntry | null;
	baselineEvaluation: SimulationResult | null;
	baselineError: string | null;
	progress: OptPrgr;
	status: "searching" | "complete" | "budget" | "cancelled";
}
