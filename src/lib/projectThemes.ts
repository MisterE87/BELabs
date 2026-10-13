export const projectThemeIds = ['cartographer'] as const;

export type ProjectThemeId = (typeof projectThemeIds)[number];

/** Accent presets that mirror a shipped product’s visual identity on BELabs showcase pages. */
export const projectThemes: Record<
	ProjectThemeId,
	{
		label: string;
		accent: string;
		accentDark: string;
		secondary: string;
		ink: string;
	}
> = {
	cartographer: {
		label: 'Cartographer',
		accent: '#3d5a80',
		accentDark: '#243447',
		secondary: '#c9a227',
		ink: '#0f1724',
	},
};
