type User = {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	phoneNumber: string;
	location: string;
	instagram: string | null;
	profilePhotoUrl: string | null;
	isEmailVerified: 0 | 1;
	isPhoneNumberVerified: 0 | 1;
	deliveryOption?: 'pickup' | 'postal' | 'both' | null;
};

type AppConfiguration = {
	id: number;
	name: string;
	value: string;
};

type ListingAttribute = {
	name: string;
	attributeValues: string[] | number[];
};

// ===== Dress Management Types =====

type UserDress = {
	id: number;
	userIdFk: string;
	name: string | null;
	brand: string;
	style: string;
	dressType: string | null;
	listingType: 'rent' | 'sell';
	isPublic: boolean;
	purchaseYear: number | null;
	internalName: string | null;
	color: string | null;
	rentalCount: number | null;
	size: string | null;
	fitNote: string | null;
	recommendedSizes: string[];
	purchasePrice: number | null;
	rentalPricePerDay: number | null;
	availableFrom: string | null;
	condition: string | null;
	dressPhotoUrls: string[];
	blockedDateRanges?: { startDate: string; endDate: string }[];
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
};

type DressDamageIncident = {
	id: number;
	dressIdFk: number;
	bookingIdFk: number | null;
	description: string;
	photoUrls: string[];
	occurredAt: string;
	isPublic: boolean;
	resolved: boolean;
	resolutionNotes: string | null;
	resolvedAt: string | null;
	createdAt: Date;
	updatedAt: Date;
};

type DressBooking = {
	id: number;
	dressIdFk: number;
	bookingType: string;
	bookingDate: string;
	startDate: string;
	endDate: string;
	renterName: string;
	renterEmail: string | null;
	renterPhone: string | null;
	renterInstagram: string | null;
	totalCost: number;
	depositPaid: number | null;
	status: string;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
};

type ServiceHistory = {
	id: number;
	vehicleIdFk: number;
	serviceType: string;
	serviceName: string | null;
	serviceDate: string;
	odometerAtService: number | null;
	serviceProviderName: string | null;
	serviceProviderContact: string | null;
	cost: number | null;
	receiptUrl: string | null;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
};

type ServiceReminder = {
	id: number;
	vehicleIdFk: number;
	reminderName: string;
	description: string | null;
	dueDate: string | null;
	dueMileage: number | null;
	notifyDaysBefore: number;
	notifyKmBefore: number;
	isRecurring: 0 | 1;
	recurrenceIntervalMonths: number | null;
	recurrenceIntervalKm: number | null;
	isActive: 0 | 1;
	completedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

type NotificationPreferences = {
	userIdFk: string;
	regoRemindAtDays: number[] | null;
	wofRemindAtDays: number[] | null;
	pushEnabled: 0 | 1;
	emailEnabled: 0 | 1;
	notificationTime: string;
	timezone: string;
	createdAt: Date;
	updatedAt: Date;
};

type DeviceToken = {
	id: number;
	userIdFk: string;
	token: string;
	platform: string;
	deviceName: string | null;
	isActive: 0 | 1;
	lastUsedAt: Date;
	createdAt: Date;
};

type NotificationLog = {
	id: number;
	userIdFk: string;
	vehicleIdFk: number | null;
	serviceReminderIdFk: number | null;
	notificationType: string;
	title: string | null;
	message: string | null;
	sentAt: Date;
	readAt: Date | null;
	dismissedAt: Date | null;
	platform: string | null;
};

export {
	User,
	AppConfiguration,
	ListingAttribute,
	UserDress,
	DressBooking,
	DressDamageIncident,
	ServiceHistory,
	ServiceReminder,
	NotificationPreferences,
	DeviceToken,
	NotificationLog,
};
