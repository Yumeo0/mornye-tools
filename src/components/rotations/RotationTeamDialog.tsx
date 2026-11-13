import { useMemo, useState } from "react";
import { FilterSelect } from "@/components/filters";
import { RotationMemberArt } from "@/components/optimizer/RotationMemberArt";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type {
	CalculatorCatalog,
	CustomRotation,
	RotationKit,
	RotationNode,
} from "@/lib/calc/types";
import { charactersById, echoesByMonsterId } from "@/lib/catalog";
import { rotationKits } from "@/lib/customRotations";

export function RotationTeamDialog({
	initial,
	catalog,
	creating,
	onSave,
	onClose,
}: {
	initial: CustomRotation;
	catalog: CalculatorCatalog;
	creating: boolean;
	onSave: (rotation: CustomRotation) => void;
	onClose: () => void;
}) {
	const [draft, setDraft] = useState(initial);
	const kits = rotationKits(draft, catalog);
	const characters = useMemo(
		() =>
			[
				...new Map(
					(catalog.rotationKits ?? []).map((k) => [
						k.member.characterId,
						k.member,
					]),
				).values(),
			].toSorted((a, b) => a.name.localeCompare(b.name)),
		[catalog],
	);
	const setKit = (index: number, nextKit: RotationKit) => {
		const previous = kits[index];
		const remove = (nodes: RotationNode[]): RotationNode[] =>
			nodes.flatMap<RotationNode>((node) =>
				node.kind === "loop"
					? [{ ...node, children: remove(node.children) }]
					: node.characterId === previous?.member.characterId
						? []
						: [node],
			);
		const members = [...draft.members];
		members[index] = {
			loadoutId: nextKit.member.loadoutId,
			mainEchoId: nextKit.member.mainEcho.engineId,
			mainDps: members[index]?.mainDps ?? index === 0,
		};
		setDraft({
			...draft,
			members,
			nodes:
				previous && previous.member.characterId !== nextKit.member.characterId
					? remove(draft.nodes)
					: draft.nodes,
		});
	};
	const complete =
		kits.length === 3 &&
		new Set(kits.map((k) => k.member.characterId)).size === 3;
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent className="max-h-[min(90vh,100%)] overflow-y-auto sm:max-w-4xl">
				<DialogHeader>
					<DialogTitle>
						{creating ? "Create rotation" : "Edit team"}
					</DialogTitle>
					<DialogDescription className="sr-only">
						Choose three Resonators, their variants, main echoes and roles.
					</DialogDescription>
				</DialogHeader>
				{creating && (
					<Field>
						<FieldLabel htmlFor="new-rotation-name" className="sr-only">
							Rotation name
						</FieldLabel>
						<Input
							id="new-rotation-name"
							value={draft.name}
							maxLength={100}
							onChange={(e) => setDraft({ ...draft, name: e.target.value })}
						/>
					</Field>
				)}
				<div className="grid gap-3 md:grid-cols-3">
					{[0, 1, 2].map((index) => {
						const current = kits[index];
						const alternatives =
							catalog.rotationKits?.filter(
								(k) => k.member.characterId === current?.member.characterId,
							) ?? [];
						const variants = [
							...new Map(
								alternatives.map((k) => [k.member.loadoutId, k.member]),
							).values(),
						].toSorted((a, b) => a.variant.localeCompare(b.variant));
						return (
							<section
								key={index}
								aria-label={`Team slot ${index + 1}`}
								className="flex min-w-0 flex-col gap-3 border bg-card p-3"
							>
								<div className="flex h-16 items-center justify-center">
									{current ? (
										<RotationMemberArt member={current.member} compact />
									) : (
										<span className="flex size-14 items-center justify-center border border-dashed text-2xl text-muted-foreground">
											{index + 1}
										</span>
									)}
								</div>
								<FieldGroup className="gap-2">
									<Field>
										<FilterSelect
											label={`Resonator ${index + 1}`}
											hideLabel
											iconSize="lg"
											value={
												current ? String(current.member.characterId) : "none"
											}
											disabled={index > draft.members.length}
											options={[
												{ value: "none", label: "Select Resonator" },
												...characters
													.filter(
														(c) =>
															!kits.some(
																(k, i) =>
																	i !== index &&
																	k.member.characterId === c.characterId,
															),
													)
													.map((c) => ({
														value: String(c.characterId),
														label: c.name,
														icon: charactersById.get(c.characterId)
															?.icon_head_256,
														preview: charactersById.get(c.characterId)?.preview,
													})),
											]}
											onChange={(id) => {
												const next = catalog.rotationKits?.find(
													(k) => k.member.characterId === Number(id),
												);
												if (next) setKit(index, next);
											}}
										/>
									</Field>
									{current && (
										<>
											<Field>
												<FilterSelect
													label="Variant"
													hideLabel
													value={String(current.member.loadoutId)}
													options={variants.map((m) => ({
														value: String(m.loadoutId),
														label: m.variant,
													}))}
													onChange={(id) => {
														const next = alternatives.find(
															(k) => k.member.loadoutId === Number(id),
														);
														if (next) setKit(index, next);
													}}
												/>
											</Field>
											<Field>
												<FilterSelect
													label="Main echo"
													hideLabel
													value={String(current.member.mainEcho.engineId)}
													options={alternatives
														.filter(
															(k) =>
																k.member.loadoutId === current.member.loadoutId,
														)
														.toSorted((a, b) =>
															a.member.mainEcho.name.localeCompare(
																b.member.mainEcho.name,
															),
														)
														.map((k) => ({
															value: String(k.member.mainEcho.engineId),
															label: k.member.mainEcho.name,
															icon: echoesByMonsterId.get(
																k.member.mainEcho.typeId,
															)?.icon_middle,
														}))}
													onChange={(id) => {
														const next = alternatives.find(
															(k) =>
																k.member.loadoutId ===
																	current.member.loadoutId &&
																k.member.mainEcho.engineId === Number(id),
														);
														if (next) setKit(index, next);
													}}
												/>
											</Field>
											<Field>
												<FilterSelect
													label="Role"
													hideLabel
													value={
														draft.members[index].mainDps ? "dps" : "support"
													}
													options={[
														{ value: "dps", label: "DPS" },
														{ value: "support", label: "Support" },
													]}
													onChange={(role) =>
														setDraft({
															...draft,
															members: draft.members.map((m, i) =>
																i === index
																	? { ...m, mainDps: role === "dps" }
																	: m,
															),
														})
													}
												/>
											</Field>
										</>
									)}
								</FieldGroup>
							</section>
						);
					})}
				</div>
				<DialogFooter>
					<Button variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button disabled={!complete} onClick={() => onSave(draft)}>
						{creating ? "Create rotation" : "Save changes"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
