import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { formatHotkey, hotkeyFromEvent } from "@/lib/hotkeys";
import {
	DEFAULT_MAP_COLLECTED_HOTKEY,
	setMapCollectedHotkey,
	useMapCollectedHotkey,
} from "@/lib/map/hotkey";

export function ShortcutsCard() {
	const { hotkey, loaded, error } = useMapCollectedHotkey();
	const [recording, setRecording] = useState(false);
	const label = formatHotkey(hotkey);
	return (
		<Card>
			<CardHeader>
				<CardTitle>Map shortcuts</CardTitle>
				<CardDescription>
					Shortcuts work while the map is active and you are not typing.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<FieldGroup className="max-w-xl">
					<Field>
						<FieldLabel htmlFor="map-collected-hotkey">
							Toggle selected item’s Collected status
						</FieldLabel>
						<div className="flex flex-wrap items-center gap-2">
							<Button
								id="map-collected-hotkey"
								variant="outline"
								disabled={!loaded}
								aria-pressed={recording}
								aria-describedby="map-collected-hotkey-help"
								onClick={() => setRecording((value) => !value)}
								onBlur={() => setRecording(false)}
								onKeyDown={(event) => {
									if (!recording) return;
									if (event.key === "Tab") {
										setRecording(false);
										return;
									}
									if (event.key === "Escape") {
										event.preventDefault();
										setRecording(false);
										return;
									}
									const next = hotkeyFromEvent(event.nativeEvent);
									event.preventDefault();
									event.stopPropagation();
									if (!next) return;
									setMapCollectedHotkey(next);
									setRecording(false);
								}}
							>
								{recording ? "Press a key…" : label}
							</Button>
							<Button
								variant="ghost"
								disabled={!loaded || label === "C"}
								onClick={() =>
									setMapCollectedHotkey(DEFAULT_MAP_COLLECTED_HOTKEY)
								}
							>
								Reset to C
							</Button>
						</div>
						<FieldDescription id="map-collected-hotkey-help">
							Click the binding, then press a key or key combination. Escape
							cancels. Select a map item before using the shortcut.
						</FieldDescription>
						<p role="status" className="sr-only">
							{recording
								? "Press a new shortcut. Escape cancels."
								: `Current shortcut: ${label}`}
						</p>
					</Field>
					{error && (
						<p role="alert" className="text-xs text-destructive">
							{error}
						</p>
					)}
				</FieldGroup>
			</CardContent>
		</Card>
	);
}
