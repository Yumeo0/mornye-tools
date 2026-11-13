import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";

const SUPPORT_LINKS = [
	{
		label: "Ko-fi",
		href: "https://ko-fi.com/F1F7WLWGA",
		variant: "kofi",
		logo: "/icons/support/kofi.svg",
	},
	{
		label: "Patreon",
		href: "https://patreon.com/yumeo0",
		variant: "patreon",
		logo: "/icons/support/patreon.svg",
	},
] as const;

export function SupportLinks() {
	const [error, setError] = useState<string | null>(null);

	return (
		<div className="flex flex-col gap-2">
			<nav aria-label="Support Mornye Tools" className="flex flex-wrap gap-2">
				{SUPPORT_LINKS.map(({ label, href, variant, logo }) => (
					<a
						key={href}
						href={href}
						target="_blank"
						rel="noopener noreferrer"
						className={buttonVariants({ variant, size: "sm" })}
						onClick={(event) => {
							if (!isTauri()) return;
							event.preventDefault();
							setError(null);
							void openUrl(href).catch(() => {
								setError(`Couldn't open ${label} in your browser.`);
							});
						}}
					>
						<img
							src={logo}
							alt=""
							width={16}
							height={16}
							data-icon="inline-start"
							className="size-4 shrink-0"
						/>
						{label}
						<HugeiconsIcon
							icon={ArrowUpRight01Icon}
							data-icon="inline-end"
							aria-hidden="true"
						/>
					</a>
				))}
			</nav>
			{error && (
				<p role="alert" className="text-xs text-destructive">
					{error}
				</p>
			)}
		</div>
	);
}
