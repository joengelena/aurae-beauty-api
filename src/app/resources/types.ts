type User = {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	phoneNumber: string;
	isEmailVerified: 0 | 1;
	isPhoneNumberVerified: 0 | 1;
};

type ListingPhoto = {
	listingIdFk: number;
	photoOrder: number;
	photoPath: string;
};

type Listing = {
	id: number;
	userIdFk: string;
	status: 'active' | 'sold' | 'expired';
	viewCount: number;
	previewImgUrl: string;
	imageUrls: string;
	location: string;
	vehicleCondition: string;
	originalPrice: number;
	discountedPrice: number | null;
	uploadDate: Date;
	description: string;
	endDate: string;
	make: string;
	model: string;
	year: string;
	kilometers: number;
	fuelType: string;
	bodyType: string;
	driveType: string;
	orcIncluded: number;
	numberPlate: string | null;
	seats: number | null;
	doors: number | null;
	previousOwners: number | null;
	color: string | null;
	engineSize: number | null;
	transmission: string | null;
	cylinders: number | null;
	regoExpiryDate: string | null;
	wofExpiryDate: string | null;
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
		| 'uploadDateAsc'
		| 'kilometersDesc'
		| 'kilometersAsc'
		| 'yearDesc'
		| 'yearAsc';
	limit: string;
	pageNumber: string;
	// Between filters
	priceFrom: string;
	priceTo: string;
	yearFrom: string;
	yearTo: string;
	kilometersFrom: string;
	kilometersTo: string;
	seatsFrom: string;
	seatsTo: string;
	doorsFrom: string;
	doorsTo: string;
	engineSizeFrom: string;
	engineSizeTo: string;
	// Equal filters
	userIdFk: string;
	location: string;
	status: string;
	vehicleCondition: string;
	uploadDate: string;
	make: string;
	model: string;
	fuelType: string;
	bodyType: string;
	driveType: string;
	color: string;
	transmission: string;
	currentUserId?: string;
};

type ListingAttribute = {
	name: string;
	attributeValues: string[];
};

// ===== Vehicle Management Types =====

type UserVehicle = {
	id: number;
	userIdFk: string;
	make: string;
	model: string;
	year: number;
	licensePlate: string | null;
	color: string | null;
	fuelType: string | null;
	transmission: string | null;
	odometerReading: number | null;
	odometerUnit: string;
	vehiclePhotoUrl: string | null;
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
	UserVehicle,
	ServiceHistory,
	ServiceReminder,
	NotificationPreferences,
	DeviceToken,
	NotificationLog,
};
