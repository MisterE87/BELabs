export const projectStatuses = ['Live', 'In development', 'Friends & family'] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

export const statusSections: {
	status: ProjectStatus;
	title: string;
	description: string;
}[] = [
	{
		status: 'Live',
		title: 'Live',
		description: 'Projects you can visit or use today.',
	},
	{
		status: 'In development',
		title: 'In development',
		description: 'Experiments and apps still being shaped before a wider release.',
	},
	{
		status: 'Friends & family',
		title: 'Friends & family',
		description: 'Small tools built for people close to home — not public products.',
	},
];

export function projectsByStatus<T extends { data: { status: ProjectStatus; title: string } }>(projects: T[]) {
	return statusSections.map((section) => ({
		...section,
		projects: projects
			.filter((project) => project.data.status === section.status)
			.sort((a, b) => a.data.title.localeCompare(b.data.title)),
	}));
}
