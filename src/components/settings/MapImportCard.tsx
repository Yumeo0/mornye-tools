import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export function MapImportCard({ onImport }: { onImport: () => void }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Import map progress</CardTitle>
				<CardDescription>
					Continue exploring with the locations you already marked on another
					map.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p>
					GHZS is currently supported. The guide takes you through exporting,
					uploading, and reviewing your marked locations.
				</p>
				<p className="mt-2 text-muted-foreground">
					Progress merges into your connected game account and preserves
					existing marks.
				</p>
			</CardContent>
			<CardFooter className="justify-end">
				<Button onClick={onImport}>Start import</Button>
			</CardFooter>
		</Card>
	);
}
