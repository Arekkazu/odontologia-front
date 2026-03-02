import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const trabajoId = Number(params.id);
	return {
		trabajoId: Number.isNaN(trabajoId) ? null : trabajoId
	};
};
