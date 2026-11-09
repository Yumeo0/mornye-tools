import { isTauri } from "@tauri-apps/api/core";
import { useId, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	type AccountImportPreview,
	importAccountBackup,
	previewAccountImport,
	useAccount,
} from "@/lib/account";
import { EXPORT_PART_LABELS, type ExportPart } from "@/lib/accountExport";

const MAX_BYTES = 32 * 1024 * 1024;
type Review = {
	preview: AccountImportPreview;
	json: string;
	profileId: string;
};

export function ImportCard() {
	const id = useId();
	const { snapshot } = useAccount();
	const profileId = snapshot.profile?.id;
	const [json, setJson] = useState("");
	const [review, setReview] = useState<Review | null>(null);
	const [selected, setSelected] = useState<ExportPart[]>([]);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const request = useRef(0);
	const activeReview = review?.profileId === profileId ? review : null;
	const available = isTauri() && Boolean(profileId);

	const changeJson = (value: string) => {
		request.current++;
		setJson(value);
		setReview(null);
		setError(null);
		setSuccess(null);
	};
	const readFile = async (file: File) => {
		changeJson("");
		if (file.size > MAX_BYTES) {
			setError("Choose an export smaller than 32 MB.");
			return;
		}
		const token = ++request.current;
		setBusy(true);
		try {
			const text = await file.text();
			if (token === request.current) setJson(text);
		} catch (cause) {
			if (token === request.current)
				setError(`Could not read this file: ${String(cause)}`);
		} finally {
			setBusy(false);
		}
	};
	const inspect = async () => {
		if (!profileId) return;
		const token = ++request.current;
		setBusy(true);
		setError(null);
		setSuccess(null);
		try {
			const preview = await previewAccountImport(json, profileId);
			if (token !== request.current) return;
			setReview({ preview, json, profileId });
			setSelected(preview.parts.map(({ part }) => part));
		} catch (cause) {
			if (token === request.current) {
				setReview(null);
				setError(String(cause));
			}
		} finally {
			setBusy(false);
		}
	};
	const restore = async () => {
		if (!activeReview || selected.length === 0) return;
		setBusy(true);
		setError(null);
		try {
			await importAccountBackup({
				json: activeReview.json,
				profileId: activeReview.profileId,
				targetId: activeReview.preview.profile.id,
				parts: selected,
			});
			setSuccess(
				`Imported ${selected.map((part) => EXPORT_PART_LABELS[part]).join(", ")} for ${activeReview.preview.name || "Player"} (${activeReview.preview.profile.playerId || "Local"}).`,
			);
			setReview(null);
		} catch (cause) {
			setError(String(cause));
		} finally {
			setBusy(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Import Mornye JSON</CardTitle>
				<CardDescription>
					Restore account data and map progress from a Mornye export.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-5">
				<FieldGroup>
					<Field data-disabled={!available || busy}>
						<FieldLabel htmlFor={`${id}-file`}>Choose a JSON export</FieldLabel>
						<Input
							id={`${id}-file`}
							type="file"
							accept=".json,application/json"
							disabled={!available || busy}
							onChange={(event) => {
								const file = event.target.files?.[0];
								event.target.value = "";
								if (file) void readFile(file);
							}}
						/>
					</Field>
					<Field data-disabled={!available || busy}>
						<FieldLabel htmlFor={`${id}-json`}>Or paste JSON</FieldLabel>
						<Textarea
							id={`${id}-json`}
							value={json}
							rows={6}
							className="max-h-64 resize-y"
							disabled={!available || busy}
							placeholder='{"version": 1, ...}'
							onChange={(event) => changeJson(event.target.value)}
						/>
						<FieldDescription>
							Review the file, then choose which data to import.
						</FieldDescription>
					</Field>
				</FieldGroup>
				{activeReview && (
					<>
						<Alert>
							<AlertTitle>
								{activeReview.preview.newProfile
									? "Create player profile"
									: "Import into player profile"}
							</AlertTitle>
							<AlertDescription>
								{activeReview.preview.name || "Player"} ·{" "}
								{activeReview.preview.profile.playerId || "Local"} ·{" "}
								{activeReview.preview.profile.region}
								<p>
									Matching IDs are updated. Other entries are kept. Map progress
									keeps the newer timestamp.
								</p>
							</AlertDescription>
						</Alert>
						<FieldSet disabled={busy}>
							<FieldLegend>Data to import</FieldLegend>
							<FieldGroup>
								{activeReview.preview.parts.map(({ part, count }) => (
									<Field key={part} orientation="horizontal">
										<Checkbox
											id={`${id}-${part}`}
											checked={selected.includes(part)}
											disabled={busy}
											onCheckedChange={(checked) =>
												setSelected((previous) =>
													checked
														? [...previous, part]
														: previous.filter((value) => value !== part),
												)
											}
										/>
										<FieldLabel htmlFor={`${id}-${part}`}>
											{EXPORT_PART_LABELS[part]} · {count.toLocaleString()}{" "}
											{count === 1 ? "entry" : "entries"}
										</FieldLabel>
									</Field>
								))}
							</FieldGroup>
						</FieldSet>
					</>
				)}
				{!isTauri() && (
					<FieldDescription>
						JSON import is available in the desktop app.
					</FieldDescription>
				)}
				{error && (
					<Alert variant="destructive">
						<AlertTitle>Import could not finish</AlertTitle>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
				{success && (
					<Alert>
						<AlertTitle>Import complete</AlertTitle>
						<AlertDescription>{success}</AlertDescription>
					</Alert>
				)}
			</CardContent>
			<CardFooter className="gap-2">
				<Button
					variant="outline"
					disabled={!available || busy || !json.trim()}
					onClick={() => void inspect()}
				>
					{busy ? "Working…" : "Review JSON"}
				</Button>
				{activeReview && (
					<Button
						disabled={busy || selected.length === 0}
						onClick={() => void restore()}
					>
						Import selected data
					</Button>
				)}
			</CardFooter>
		</Card>
	);
}
