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

function mapVehicleDbToObject(vehiclesDb: any[]): UserVehicle[] {
	return vehiclesDb.map((vehicle) => {
		return {
			id: vehicle.id,
			userIdFk: vehicle.user_id_fk,
			make: vehicle.make,
			model: vehicle.model,
			year: vehicle.year,
			nickname: vehicle.nickname,
			licensePlate: vehicle.license_plate,
			color: vehicle.color,
			fuelType: vehicle.fuel_type,
			transmission: vehicle.transmission,
			odometerReading: vehicle.odometer_reading,
			odometerUnit: vehicle.odometer_unit,
			regoExpiryDate: formatDateToString(vehicle.rego_expiry_date) || '',
			wofExpiryDate: formatDateToString(vehicle.wof_expiry_date) || '',
			insuranceExpiryDate: formatDateToString(vehicle.insurance_expiry_date),
			insuranceProvider: vehicle.insurance_provider,
			vehiclePhotoUrl: vehicle.vehicle_photo_url,
			notes: vehicle.notes,
			createdAt: vehicle.created_at,
			updatedAt: vehicle.updated_at,
		};
	});
}

export default mapVehicleDbToObject;
