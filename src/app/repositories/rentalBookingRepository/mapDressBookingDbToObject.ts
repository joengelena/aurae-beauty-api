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
			bookingType: booking.booking_type,
			bookingDate: formatDateToString(booking.booking_date),
			startDate: formatDateToString(booking.start_date),
			endDate: formatDateToString(booking.end_date),
			renterName: booking.renter_name ?? null,
			renterEmail: booking.renter_email ?? null,
			renterPhone: booking.renter_phone ?? null,
			totalCost: booking.total_cost ? parseFloat(booking.total_cost) : 0,
			depositPaid: booking.deposit_paid ? parseFloat(booking.deposit_paid) : null,
			status: booking.status,
			notes: booking.notes ?? null,
			createdAt: booking.created_at,
			updatedAt: booking.updated_at,
		};
	});
}

export default mapDressBookingDbToObject;
