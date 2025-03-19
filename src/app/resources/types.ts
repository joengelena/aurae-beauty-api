type User = {
	id: string;
	firstName: string;
	lastName: string;
	username: string;
	email: string;
	password: string;
	phoneNumber: string;
	isEmailVerified: 0 | 1;
	isPhoneNumberVerified: 0 | 1;
};

type UserEmailValidationStatus = {
	is_email_verified: 0 | 1;
};

type VehiclePhotoDBSchema = {
	vehicle_listing_id_fk: number;
	photo_order: number;
	photo_path: string;
};

type VehiclePhoto = {
	vehicleListingIdFk: VehiclePhotoDBSchema['vehicle_listing_id_fk'];
	photoOrder: VehiclePhotoDBSchema['photo_order'];
	photoPath: VehiclePhotoDBSchema['photo_path'];
};

type VehicleListing = {
	id: number;
	userIdFk: string;
	location: string;
	vehicleCondition: string;
	price: number;
	uploadDate: Date;
	description: string;
	endDate: string;
	endTime: string;
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
};

type AppConfiguration = {
	id: number;
	name: string;
	value: string;
};

type testQuery = {
	searchString: string;
	sortBy:
		| 'priceDesc'
		| 'priceAsc'
		| 'uploadDateDesc'
		| 'uploadDateAsc'
		| 'kilometersDesc'
		| 'kilometersAsc'
		| 'yearDesc'
		| 'yearAsc'
		| 'endDateDesc'
		| 'endDateAsc';
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
	vehicleCondition: string;
	uploadDate: string;
	make: string;
	model: string;
	fuelType: string;
	bodyType: string;
	driveType: string;
	color: string;
	transmission: string;
};

type ListingFilters = {
	name: string;
	filterValues: string;
};

export {
	User,
	UserEmailValidationStatus,
	VehiclePhotoDBSchema,
	VehiclePhoto,
	AppConfiguration,
	VehicleListing,
	testQuery,
	ListingFilters,
};
