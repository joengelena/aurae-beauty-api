import { Listing } from '../../resources/types';
import { RowDataPacket } from 'mysql2';

function mapListingDbToObject(listingsDb: RowDataPacket[]): Listing[] {
	return listingsDb.map((listing) => {
		return {
			id: listing.id,
			userIdFk: listing.user_id_fk,
			viewCount: listing.view_count,
			previewImgUrl: listing.preview_img_url,
			imageUrls: listing.image_urls,
			location: listing.location,
			vehicleCondition: listing.vehicle_condition,
			price: listing.price,
			uploadDate: listing.upload_date,
			description: listing.description,
			endDate: listing.end_date,
			make: listing.make,
			model: listing.model,
			year: listing.year,
			kilometers: listing.kilometers,
			fuelType: listing.fuel_type,
			bodyType: listing.body_type,
			driveType: listing.drive_type,
			orcIncluded: listing.orc_included,
			numberPlate: listing.number_plate,
			seats: listing.seats,
			doors: listing.doors,
			previousOwners: listing.previous_owners,
			color: listing.color,
			engineSize: listing.engine_size,
			transmission: listing.transmission,
			cylinders: listing.cylinders,
			regoExpiryDate: listing.rego_expiry_date,
			wofExpiryDate: listing.wof_expiry_date,
		};
	});
}

export default mapListingDbToObject;
