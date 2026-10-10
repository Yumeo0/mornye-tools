// In-game rarity colors shared by cards and filter chips:
// 5★ gold, 4★ purple, 3★ blue, 2★ green, 1★ gray.
export const RARITY_TEXT_CLASSES: Record<number, string> = {
	5: "text-amber-400",
	4: "text-purple-400",
	3: "text-sky-400",
	2: "text-emerald-400",
	1: "text-zinc-400",
};

export function rarityTextClass(rarity: number | undefined): string {
	return RARITY_TEXT_CLASSES[rarity ?? 0] ?? "text-muted-foreground";
}

// In-game quality gradients (ImgQuality): rarity-tinted bottom overlay
const QUALITY_GRADIENTS: Record<number, string> = {
	5: "/wuwa-assets/UI/UIResources/Common/Image/ImgQuality/T_QualityGold.webp",
	4: "/wuwa-assets/UI/UIResources/Common/Image/ImgQuality/T_QualityPurple.webp",
	3: "/wuwa-assets/UI/UIResources/Common/Image/ImgQuality/T_QualityBlue.webp",
	2: "/wuwa-assets/UI/UIResources/Common/Image/ImgQuality/T_QualityGreen.webp",
	1: "/wuwa-assets/UI/UIResources/Common/Image/ImgQuality/T_QualityGrey.webp",
};

export function qualityGradient(rarity: number | undefined): string {
	return QUALITY_GRADIENTS[rarity ?? 4] ?? QUALITY_GRADIENTS[4];
}
