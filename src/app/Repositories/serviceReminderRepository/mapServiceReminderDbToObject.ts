import { ServiceReminder } from '../../resources/types';
import { RowDataPacket } from 'mysql2';

function mapServiceReminderDbToObject(serviceRemindersDb: RowDataPacket[]): ServiceReminder[] {
	return serviceRemindersDb.map((reminder) => {
		return {
			id: reminder.id,
			vehicleIdFk: reminder.vehicle_id_fk,
			reminderName: reminder.reminder_name,
			description: reminder.description,
			dueDate: reminder.due_date,
			dueMileage: reminder.due_mileage,
			notifyDaysBefore: reminder.notify_days_before,
			notifyKmBefore: reminder.notify_km_before,
			isRecurring: reminder.is_recurring,
			recurrenceIntervalMonths: reminder.recurrence_interval_months,
			recurrenceIntervalKm: reminder.recurrence_interval_km,
			isActive: reminder.is_active,
			completedAt: reminder.completed_at,
			createdAt: reminder.created_at,
			updatedAt: reminder.updated_at,
		};
	});
}

export default mapServiceReminderDbToObject;
