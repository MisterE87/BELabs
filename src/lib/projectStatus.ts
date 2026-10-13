export const projectStatuses = ['Live', 'In development', 'Friends & family', 'Archived'] as const;

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
	{
		status: 'Archived',
		title: 'Archived',
		description: 'Past builds kept on record after the event or when the live site went offline.',
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
