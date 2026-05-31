import { Listing } from '../../resources/types';

function mapListingsDbToObject(listingsDb: any[]): Listing[] {
	return listingsDb.map((listing) => {
		return {
			id: listing.id,
			userIdFk: listing.user_id_fk,
			status: listing.status,
			viewCount: listing.view_count,
			previewImgUrl: listing.preview_img_url,
			imageUrls: listing.image_urls,
			location: listing.location,
			condition: listing.condition,
			pricePerDay: listing.price_per_day,
			uploadDate: listing.upload_date,
			description: listing.description,
			brand: listing.brand,
			style: listing.style,
			size: listing.size,
			color: listing.color,
			dressType: listing.dress_type,
			isInWatchlist: listing.is_in_watchlist,
		};
	});
}

export default mapListingsDbToObject;
