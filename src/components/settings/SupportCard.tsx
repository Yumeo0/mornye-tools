import { SupportLinks } from "@/components/SupportLinks";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export function SupportCard() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Support Mornye Tools</CardTitle>
				<CardDescription>
					Help support development and future updates.
				</CardDescription>
			</CardHeader>
			<CardFooter>
				<SupportLinks />
			</CardFooter>
		</Card>
	);
}
