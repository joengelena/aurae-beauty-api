import { VehicleService } from '../../resources/types';

// Helper function to format Date to YYYY-MM-DD string
function formatDateToString(date: Date | null): string {
	if (!date) return '';
	const d = new Date(date);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function mapVehicleServiceDbToObject(
	servicesDb: any[]
): VehicleService[] {
	return servicesDb.map((service) => {
		return {
			id: service.id,
			vehicleIdFk: service.vehicle_id_fk,
			typeOfService: service.type_of_service,
			serviceDate: formatDateToString(service.service_date),
			serviceProviderName: service.service_provider_name,
			cost: service.cost,
			notes: service.notes,
			createdAt: service.created_at,
			updatedAt: service.updated_at,
		};
	});
}

export default mapVehicleServiceDbToObject;
