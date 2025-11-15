import { ServiceHistory } from '../../resources/types';
import { RowDataPacket } from 'mysql2';

function mapServiceHistoryDbToObject(serviceHistoryDb: RowDataPacket[]): ServiceHistory[] {
	return serviceHistoryDb.map((record) => {
		return {
			id: record.id,
			vehicleIdFk: record.vehicle_id_fk,
			serviceType: record.service_type,
			serviceName: record.service_name,
			serviceDate: record.service_date,
			odometerAtService: record.odometer_at_service,
			serviceProviderName: record.service_provider_name,
			serviceProviderContact: record.service_provider_contact,
			cost: record.cost,
			receiptUrl: record.receipt_url,
			notes: record.notes,
			createdAt: record.created_at,
			updatedAt: record.updated_at,
		};
	});
}

export default mapServiceHistoryDbToObject;
