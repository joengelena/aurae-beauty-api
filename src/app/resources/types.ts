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

export {
	User,
	ListingPhoto,
	AppConfiguration,
	Listing,
	ListingQueryParams,
	ListingAttribute,
};
