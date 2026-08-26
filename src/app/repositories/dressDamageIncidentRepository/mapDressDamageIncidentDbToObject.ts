import { DressDamageIncident } from '../../resources/types';

// occurred_at and resolved_at are DATE columns. Returned raw they become JS
// Dates at the server's local midnight, which JSON serializes as UTC — so an
// API running ahead of UTC reports damage as happening the day before it did.
// created_at / updated_at are TIMESTAMPs and are genuine instants, so they are
// left alone. Mirrors the helper in mapDressBookingDbToObject.
function formatDateToString(date: Date | string | null): string | null {
	if (!date) return null;
	if (typeof date === 'string') return date.substring(0, 10);
	const d = new Date(date);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function mapDressDamageIncidentDbToObject(incidentsDb: any[]): DressDamageIncident[] {
	return incidentsDb.map((incident) => {
		return {
			id: incident.id,
			dressIdFk: incident.dress_id_fk,
			bookingIdFk: incident.booking_id_fk,
			description: incident.description,
			photoUrls: incident.photo_urls ?? [],
			occurredAt: formatDateToString(incident.occurred_at),
			isPublic: incident.is_public ?? false,
			resolved: incident.resolved ?? false,
			resolutionNotes: incident.resolution_notes,
			resolvedAt: formatDateToString(incident.resolved_at),
			createdAt: incident.created_at,
			updatedAt: incident.updated_at,
		};
	});
}

export default mapDressDamageIncidentDbToObject;
