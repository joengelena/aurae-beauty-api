import { DressBooking } from '../../resources/types';

function formatDateToString(date: Date | null): string {
	if (!date) return '';
	const d = new Date(date);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function mapDressBookingDbToObject(
	bookingsDb: any[]
): DressBooking[] {
	return bookingsDb.map((booking) => {
		return {
			id: booking.id,
			dressIdFk: booking.dress_id_fk,
			typeOfService: booking.type_of_service,
			serviceDate: formatDateToString(booking.service_date),
			serviceProviderName: booking.service_provider_name,
			cost: booking.cost ? parseFloat(booking.cost) : null,
			notes: booking.notes,
			createdAt: booking.created_at,
			updatedAt: booking.updated_at,
		};
	});
}

export default mapDressBookingDbToObject;
