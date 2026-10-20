import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { type CollectionState, itemLabel } from "@/lib/map/collection";
import { KIND_LABELS, type MapReward } from "@/lib/map/types";
import { useWutheringComments, wutheringImageUrl } from "@/lib/map/wuthering";

export function RewardDetails({
	reward,
	collection,
	disabled,
	error,
	onCollectedChange,
	onClose,
}: {
	reward: MapReward;
	collection: CollectionState;
	disabled: boolean;
	error: string | null;
	onCollectedChange: (collected: boolean) => void;
	onClose: () => void;
}) {
	const notes = useWutheringComments(reward);
	const [noteImage, setNoteImage] = useState<string | null>(null);
	const [noteSize, setNoteSize] = useState<{ w: number; h: number } | null>(
		null,
	);
	return (
		<>
			<section
				className="absolute right-3 top-3 flex max-h-[calc(100%-5rem)] w-72 flex-col gap-3 overflow-auto border bg-background/95 p-4 shadow-xl max-[1000px]:w-60"
				aria-label="Reward details"
			>
				<div className="flex items-start gap-2">
					<img
						src={reward.icon}
						alt=""
						className="size-10 bg-[#273134] p-1.5"
					/>
					<div className="min-w-0 flex-1">
						<p className="text-[9px] tracking-widest text-muted-foreground">
							{KIND_LABELS[reward.kind].toUpperCase()}
						</p>
						<h2 className="mt-1 text-sm font-medium">{itemLabel(reward)}</h2>
					</div>
					<Button
						variant="ghost"
						size="icon-xs"
						aria-label="Close reward details"
						onClick={onClose}
					>
						×
					</Button>
				</div>
				{reward.kind !== "collection" && (
					<div className="flex items-center justify-between gap-3 border-t pt-3 text-xs">
						<span className="flex items-center gap-2">
							<span className={`map-state-dot state-${collection.state}`} />
							<span>Collected</span>
						</span>
						<Switch
							aria-label="Collected"
							checked={collection.state === "collected"}
							disabled={disabled}
							onCheckedChange={onCollectedChange}
						/>
					</div>
				)}
				{error && <p className="text-[10px] text-destructive">{error}</p>}
				<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 border-t pt-3 text-[10px]">
					<dt className="text-muted-foreground">Area</dt>
					<dd>{reward.area}</dd>
					<dt className="text-muted-foreground">Entity</dt>
					<dd>{reward.key}</dd>
					<dt className="text-muted-foreground">Position</dt>
					<dd>
						{Math.round(reward.x)}, {Math.round(reward.y)}
					</dd>
					<dt className="text-muted-foreground">Elevation</dt>
					<dd>{Math.round(reward.z)}</dd>
					{collection.at !== null && (
						<>
							<dt className="text-muted-foreground">
								{collection.state === "collected" ? "Collected" : "Uncollected"}
							</dt>
							<dd>{new Date(collection.at).toLocaleString()}</dd>
						</>
					)}
				</dl>
				{reward.hidden && (
					<Badge variant="outline">Hidden or gated placement</Badge>
				)}
				<section
					className="flex flex-col gap-2 border-t pt-3"
					aria-label="Community comments"
				>
					<div className="flex items-baseline justify-between gap-2">
						<h3 className="text-[10px] tracking-[.15em] text-muted-foreground">
							COMMUNITY NOTES
						</h3>
						<span className="text-[9px] text-muted-foreground">
							wuthering.gg
						</span>
					</div>
					{notes.state.status === "loading" && (
						<p className="text-[10px] text-muted-foreground">Loading notes…</p>
					)}
					{notes.state.status === "error" && (
						<p className="text-[10px] text-muted-foreground">
							Notes are unavailable right now.{" "}
							<button
								type="button"
								className="underline underline-offset-2 hover:text-foreground"
								onClick={notes.retry}
							>
								Retry
							</button>
						</p>
					)}
					{notes.state.status === "ready" &&
						(notes.state.comments.length ? (
							<ul className="flex flex-col gap-3">
								{notes.state.comments.map((comment) => (
									<li key={comment.id} className="flex flex-col gap-1.5">
										<p className="text-[11px] leading-relaxed">
											{comment.content}
										</p>
										{comment.image && (
											<button
												type="button"
												className="cursor-zoom-in"
												aria-label="View image fullscreen"
												title="View fullscreen"
												onClick={(event) => {
													const thumb =
														event.currentTarget.querySelector("img");
													setNoteSize(
														thumb?.naturalWidth && thumb.naturalHeight
															? {
																	w: thumb.naturalWidth,
																	h: thumb.naturalHeight,
																}
															: null,
													);
													setNoteImage(comment.image);
												}}
											>
												<img
													src={wutheringImageUrl(comment.image)}
													alt=""
													loading="lazy"
													className="max-h-28 w-full border object-cover"
												/>
											</button>
										)}
										<span className="text-[9px] text-muted-foreground">
											{comment.username} · {comment.votes}{" "}
											{comment.votes === 1 ? "vote" : "votes"}
											{comment.createdAt
												? ` · ${new Date(comment.createdAt * 1000).toLocaleDateString()}`
												: ""}
										</span>
									</li>
								))}
							</ul>
						) : (
							<p className="text-[10px] text-muted-foreground">
								No community notes for this spot yet.
							</p>
						))}
				</section>
			</section>
			{noteImage && (
				<Modal
					className="w-fit max-w-[calc(100vw_-_2rem)] items-center gap-0 p-0"
					onClose={() => setNoteImage(null)}
				>
					<img
						src={wutheringImageUrl(noteImage)}
						alt=""
						className="block h-auto w-auto max-h-[calc(100vh_-_2rem)] max-w-[calc(100vw_-_2rem)] object-contain"
						style={
							noteSize
								? {
										// A bit larger than the source, never past the viewport.
										width: `min(${Math.round(noteSize.w * 1.3)}px, calc(100vw - 2rem), calc(${noteSize.w / noteSize.h} * (100vh - 2rem)))`,
									}
								: undefined
						}
					/>
					<Button
						variant="ghost"
						size="icon"
						aria-label="Close image"
						title="Close"
						className="absolute right-2 top-2 bg-background/80"
						onClick={() => setNoteImage(null)}
					>
						<HugeiconsIcon icon={Cancel01Icon} />
					</Button>
				</Modal>
			)}
		</>
	);
}
