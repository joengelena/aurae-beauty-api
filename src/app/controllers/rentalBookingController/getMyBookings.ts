import { Request, Response } from 'express';
import { getPool } from '../../../config/db';
import { convertQueryPlaceholders } from '../../utils/database/queryHelper';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';

function formatDate(date: Date | null): string {
	if (!date) return '';
	const d = new Date(date);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

async function getMyBookings(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId as string;

	logger.info(`Getting renter bookings for user '${userId}'`);

	const query = convertQueryPlaceholders(`
		SELECT
			db.id,
			db.dress_id_fk,
			db.booking_type,
			db.booking_date,
			db.start_date,
			db.end_date,
			db.renter_name,
			db.renter_email,
			db.renter_phone,
			db.renter_instagram,
			db.total_cost,
			db.deposit_paid,
			db.status,
			db.notes,
			db.created_at,
			db.updated_at,
			ud.brand AS dress_brand,
			ud.style AS dress_style,
			ud.dress_photo_url,
			ud.internal_name AS dress_internal_name
		FROM "dress_bookings" db
		JOIN "user_dresses" ud ON ud.id = db.dress_id_fk
		JOIN "user" u ON u.email = db.renter_email
		WHERE u.id = ?
		  AND db.status NOT IN ('cancelled', 'returned')
		  AND db.end_date >= CURRENT_DATE
		ORDER BY db.start_date ASC
	`);

	try {
		const result = await getPool().query(query, [userId]);

		const bookings = result.rows.map((row: any) => ({
			id: row.id,
			dressIdFk: row.dress_id_fk,
			bookingType: row.booking_type,
			bookingDate: formatDate(row.booking_date),
			startDate: formatDate(row.start_date),
			endDate: formatDate(row.end_date),
			renterName: row.renter_name,
			renterEmail: row.renter_email ?? null,
			renterPhone: row.renter_phone ?? null,
			renterInstagram: row.renter_instagram ?? null,
			totalCost: row.total_cost ? parseFloat(row.total_cost) : 0,
			depositPaid: row.deposit_paid ? parseFloat(row.deposit_paid) : null,
			status: row.status,
			notes: row.notes ?? null,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
			dressBrand: row.dress_brand ?? '',
			dressStyle: row.dress_style ?? '',
			dressPhotoUrl: row.dress_photo_url ?? null,
			dressInternalName: row.dress_internal_name ?? null,
		}));

		res.status(200).json(bookings);
	} catch (error: any) {
		logger.error(`Error fetching renter bookings: ${error.message}`);
		throw new AppError(500, 'Unable to fetch your bookings. Please try again.');
	}
}

export default getMyBookings;
