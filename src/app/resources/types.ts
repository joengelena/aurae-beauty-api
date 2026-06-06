type User = {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	phoneNumber: string;
	location: string;
	profilePhotoUrl: string | null;
	isEmailVerified: 0 | 1;
	isPhoneNumberVerified: 0 | 1;
};

type ListingPhoto = {
	dressIdFk: number;
	photoOrder: number;
	photoPath: string;
};

type Listing = {
	id: number;
	userIdFk: string;
	status: 'active' | 'rented' | 'sold';
	viewCount: number;
	previewImgUrl: string;
	imageUrls: string[];
	location: string;
	condition: string;
	pricePerDay: number;
	uploadDate: Date;
	description: string;
	brand: string;
	style: string;
	size: string;
	color: string | null;
	dressType: string | null;
	isInWatchlist?: number;
};

type AppConfiguration = {
	id: number;
	name: string;
	value: string;
};

type ListingQueryParams = {
	searchString: string;
	sortBy:
		| 'priceDesc'
		| 'priceAsc'
		| 'uploadDateDesc'
		| 'uploadDateAsc';
	limit: string;
	pageNumber: string;
	// Between filters
	priceFrom: string;
	priceTo: string;
	// Equal filters
	userIdFk: string;
	location: string;
	status: string;
	condition: string;
	uploadDate: string;
	brand: string;
	style: string;
	size: string;
	color: string;
	dressType: string;
	currentUserId?: string;
};

type ListingAttribute = {
	name: string;
	attributeValues: string[] | number[];
};

// ===== Dress Management Types =====

type UserDress = {
	id: number;
	userIdFk: string;
	brand: string;
	style: string;
	purchaseYear: number | null;
	internalName: string | null;
	color: string | null;
	rentalCount: number | null;
	size: string | null;
	purchasePrice: number | null;
	rentalPricePerDay: number | null;
	condition: string | null;
	dressPhotoUrl: string | null;
	notes: string | null;
	damageDescription: string | null;
	damagePhotoUrls: string[] | null;
	createdAt: Date;
	updatedAt: Date;
};

type DressBooking = {
	id: number;
	dressIdFk: number;
	typeOfService: string;
	serviceDate: string;
	serviceProviderName: string | null;
	cost: number | null;
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
	ListingPhoto,
	AppConfiguration,
	Listing,
	ListingQueryParams,
	ListingAttribute,
	UserDress,
	DressBooking,
	ServiceHistory,
	ServiceReminder,
	NotificationPreferences,
	DeviceToken,
	NotificationLog,
};
