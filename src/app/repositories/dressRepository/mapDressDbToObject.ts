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
			name: dress.name ?? null,
			brand: dress.brand,
			style: dress.style,
			listingType: dress.listing_type ?? 'rent',
			isPublic: dress.is_public ?? false,
			purchaseYear: dress.purchase_year,
			internalName: dress.internal_name,
			color: dress.color,
			rentalCount: dress.rental_count,
			size: dress.size,
			purchasePrice: dress.purchase_price,
			rentalPricePerDay: dress.rental_price_per_day,
			condition: dress.condition,
			dressPhotoUrls: dress.dress_photo_urls ?? [],
			notes: dress.notes,
			damageDescription: dress.damage_description,
			damagePhotoUrls: dress.damage_photo_urls ?? [],
			createdAt: dress.created_at,
			updatedAt: dress.updated_at,
		};
	});
}

export default mapDressDbToObject;
