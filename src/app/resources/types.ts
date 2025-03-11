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

type VehicleListingDBSchema = {
	id: number;
	user_id_fk: string;
	location: string;
	vehicle_condition: string;
	price: number;
	upload_date: Date;
	description: string;
	end_date: string;
	end_time: string;
	make: string;
	model: string;
	year: string;
	kilometers: number;
	fuel_type: string;
	body_type: string;
	drive_type: string;
	orc_included: number;
	number_plate: string | null;
	seats: number | null;
	doors: number | null;
	previous_owners: number | null;
	color: string | null;
	engine_size: number | null;
	transmission: string | null;
	cylinders: number | null;
	rego_expiry_date: string | null;
	wof_expiry_date: string | null;
};

type Vehicle = {
	id: VehicleListingDBSchema['id'];
	userIdFk: VehicleListingDBSchema['user_id_fk'];
	location: VehicleListingDBSchema['location'];
	vehicleCondition: VehicleListingDBSchema['vehicle_condition'];
	price: VehicleListingDBSchema['price'];
	uploadDate: VehicleListingDBSchema['upload_date'];
	description: VehicleListingDBSchema['description'];
	endDate: VehicleListingDBSchema['end_date'];
	endTime: VehicleListingDBSchema['end_time'];
	make: VehicleListingDBSchema['make'];
	model: VehicleListingDBSchema['model'];
	year: VehicleListingDBSchema['year'];
	kilometers: VehicleListingDBSchema['kilometers'];
	fuelType: VehicleListingDBSchema['fuel_type'];
	bodyType: VehicleListingDBSchema['body_type'];
	driveType: VehicleListingDBSchema['drive_type'];
	orcIncluded: VehicleListingDBSchema['orc_included'];
	numberPlate: VehicleListingDBSchema['number_plate'];
	seats: VehicleListingDBSchema['seats'];
	doors: VehicleListingDBSchema['doors'];
	previousOwners: VehicleListingDBSchema['previous_owners'];
	color: VehicleListingDBSchema['color'];
	engineSize: VehicleListingDBSchema['engine_size'];
	transmission: VehicleListingDBSchema['transmission'];
	cylinders: VehicleListingDBSchema['cylinders'];
	regoExpiryDate: VehicleListingDBSchema['rego_expiry_date'];
	wofExpiryDate: VehicleListingDBSchema['wof_expiry_date'];
};

type AppConfigurationDBSchema = {
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
	AppConfigurationDBSchema,
	VehicleListingDBSchema,
	Vehicle,
	testQuery,
	ListingFilters,
};
