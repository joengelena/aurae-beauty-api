import { UserDress } from '../../resources/types';

function formatDateToString(date: Date | null): string | null {
	if (!date) return null;
	const d = new Date(date);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function mapDressDbToObject(
	dressesDb: any[]
): (UserDress & { unresolvedDamageCount: number; pendingBookingCount: number })[] {
	return dressesDb.map((dress) => {
		return {
			id: dress.id,
			userIdFk: dress.user_id_fk,
			name: dress.name ?? null,
			brand: dress.brand,
			style: dress.style,
			dressType: dress.dress_type ?? null,
			listingType: dress.listing_type ?? 'rent',
			status: dress.status ?? 'active',
			isPublic: dress.is_public ?? false,
			purchaseYear: dress.purchase_year,
			internalName: dress.internal_name,
			color: dress.color,
			rentalCount: dress.rental_count,
			size: dress.size,
			fitNote: dress.fit_note ?? null,
			recommendedSizes: dress.recommended_sizes ?? [],
			purchasePrice: dress.purchase_price,
			rentalPricePerDay: dress.rental_price_per_day,
			availableFrom: formatDateToString(dress.available_from),
			condition: dress.condition,
			dressPhotoUrls: dress.dress_photo_urls ?? [],
			blockedDateRanges: dress.blocked_date_ranges ?? [],
			notes: dress.notes,
			unresolvedDamageCount: dress.unresolved_damage_count != null
				? parseInt(dress.unresolved_damage_count, 10)
				: 0,
			pendingBookingCount: dress.pending_booking_count != null
				? parseInt(dress.pending_booking_count, 10)
				: 0,
			createdAt: dress.created_at,
			updatedAt: dress.updated_at,
		};
	});
}

export default mapDressDbToObject;
