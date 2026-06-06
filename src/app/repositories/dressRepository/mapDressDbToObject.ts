import { UserDress } from '../../resources/types';

function formatDateToString(date: Date | null): string | null {
	if (!date) return null;
	const d = new Date(date);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function mapDressDbToObject(dressesDb: any[]): UserDress[] {
	return dressesDb.map((dress) => {
		return {
			id: dress.id,
			userIdFk: dress.user_id_fk,
			brand: dress.brand,
			style: dress.style,
			purchaseYear: dress.purchase_year,
			internalName: dress.internal_name,
			color: dress.color,
			rentalCount: dress.rental_count,
			size: dress.size,
			purchasePrice: dress.purchase_price,
			rentalPricePerDay: dress.rental_price_per_day,
			condition: dress.condition,
			dressPhotoUrl: dress.dress_photo_url,
			notes: dress.notes,
			damageDescription: dress.damage_description,
			damagePhotoUrls: dress.damage_photo_urls ?? [],
			createdAt: dress.created_at,
			updatedAt: dress.updated_at,
		};
	});
}

export default mapDressDbToObject;
