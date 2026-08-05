import { DressDamageIncident } from '../../resources/types';

function mapDressDamageIncidentDbToObject(incidentsDb: any[]): DressDamageIncident[] {
	return incidentsDb.map((incident) => {
		return {
			id: incident.id,
			dressIdFk: incident.dress_id_fk,
			bookingIdFk: incident.booking_id_fk,
			description: incident.description,
			photoUrls: incident.photo_urls ?? [],
			occurredAt: incident.occurred_at,
			isPublic: incident.is_public ?? false,
			resolved: incident.resolved ?? false,
			resolutionNotes: incident.resolution_notes,
			resolvedAt: incident.resolved_at,
			createdAt: incident.created_at,
			updatedAt: incident.updated_at,
		};
	});
}

export default mapDressDamageIncidentDbToObject;
