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

type ListingPhoto = {
	listingIdFk: number;
	photoOrder: number;
	photoPath: string;
};

type Listing = {
	id: number;
	userIdFk: string;
	viewCount: number;
	previewImgUrl: string;
	location: string;
	vehicleCondition: string;
	price: number;
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
	filterValues: string[];
};

export {
	User,
	UserEmailValidationStatus,
	ListingPhoto,
	AppConfiguration,
	Listing,
	ListingQueryParams,
	ListingFilters,
};
