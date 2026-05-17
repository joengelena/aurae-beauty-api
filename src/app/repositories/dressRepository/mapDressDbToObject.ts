import { UserVehicle } from '../../resources/types';

// Helper function to format Date to YYYY-MM-DD string
function formatDateToString(date: Date | null): string | null {
	if (!date) return null;
	const d = new Date(date);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function mapDressDbToObject(dressesDb: any[]): UserVehicle[] {
	return dressesDb.map((dress) => {
		return {
			id: dress.id,
			userIdFk: dress.user_id_fk,
			make: dress.make,
			model: dress.model,
			year: dress.year,
			nickname: dress.nickname,
			licensePlate: dress.license_plate,
			color: dress.color,
			fuelType: dress.fuel_type,
			transmission: dress.transmission,
			odometerReading: dress.odometer_reading,
			odometerUnit: dress.odometer_unit,
			regoExpiryDate: formatDateToString(dress.rego_expiry_date) || '',
			wofExpiryDate: formatDateToString(dress.wof_expiry_date) || '',
			insuranceExpiryDate: formatDateToString(dress.insurance_expiry_date),
			insuranceProvider: dress.insurance_provider,
			dressPhotoUrl: dress.vehicle_photo_url,
			notes: dress.notes,
			createdAt: dress.created_at,
			updatedAt: dress.updated_at,
		};
	});
}

export default mapDressDbToObject;
