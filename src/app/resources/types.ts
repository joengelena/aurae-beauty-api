import { off } from 'process';

type UserDBSchema = {
	id: string;
	first_name: string;
	last_name: string;
	username: string;
	phone_number: string;
	email: string;
	password: string;
	is_email_verified: 0 | 1;
	is_phone_number_verified: 0 | 1;
	auth_token: string | null;
};

type User = {
	id: UserDBSchema['id'];
	firstName: UserDBSchema['first_name'];
	lastName: UserDBSchema['last_name'];
	username: UserDBSchema['username'];
	email: UserDBSchema['email'];
	password: UserDBSchema['password'];
	phoneNumber: UserDBSchema['phone_number'];
	isEmailVerified: UserDBSchema['is_email_verified'];
	isPhoneNumberVerified: UserDBSchema['is_phone_number_verified'];
};

type UserEmailValidationStatus = {
	is_email_verified: UserDBSchema['is_email_verified'];
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
	photo_paths: string;
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
	photoPaths: VehicleListingDBSchema['photo_paths'];
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

type FromAndTo = {
	from: number | string;
	to: number | string;
};

type VehicleBetweenFilters = {
	price: FromAndTo;
	year: FromAndTo;
	kilometers: FromAndTo;
	seats: FromAndTo;
	doors: FromAndTo;
	engineSize: FromAndTo;
};

type VehicleEqualFilters = {
	userIdFk: VehicleListingDBSchema['user_id_fk'];
	location: VehicleListingDBSchema['location'];
	vehicleCondition: VehicleListingDBSchema['vehicle_condition'];
	uploadDate: VehicleListingDBSchema['upload_date'];
	make: VehicleListingDBSchema['make'];
	model: VehicleListingDBSchema['model'];
	fuelType: VehicleListingDBSchema['fuel_type'];
	bodyType: VehicleListingDBSchema['body_type'];
	driveType: VehicleListingDBSchema['drive_type'];
	color: VehicleListingDBSchema['color'];
	transmission: VehicleListingDBSchema['transmission'];
};

type VehicleFilters = {
	betweenFilters: VehicleBetweenFilters;
	equalFilters: VehicleEqualFilters;
};

type SortDirection = 'asc' | 'desc';

type VehicleSortBy =
	| { price: SortDirection }
	| { uploadDate: SortDirection }
	| { kilometers: SortDirection }
	| { year: SortDirection }
	| { endDate: SortDirection };

type Pagination = {
	limit: number; // The number of items shown per page
	pageNumber: number;
};

export {
	UserDBSchema,
	User,
	UserEmailValidationStatus,
	VehiclePhotoDBSchema,
	VehiclePhoto,
	AppConfigurationDBSchema,
	VehicleListingDBSchema,
	Vehicle,
	VehicleEqualFilters,
	VehicleBetweenFilters,
	VehicleFilters,
	VehicleSortBy,
	Pagination,
};
