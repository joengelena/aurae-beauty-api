import { Business } from '../../resources/types';

function mapBusinessDbToObject(businessesDb: any[]): Business[] {
	return businessesDb.map((business) => {
		return {
			id: business.id,
			name: business.name,
			category: business.category,
			ownerUserIdFk: business.owner_user_id_fk,
			businessSettings: business.business_settings ?? {},
			createdAt: business.created_at,
		};
	});
}

export default mapBusinessDbToObject;
