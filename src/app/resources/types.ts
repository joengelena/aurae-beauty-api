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

// ===== Business / Profile Types =====

type BusinessRole = 'owner' | 'staff';

type Business = {
	id: number;
	name: string;
	category: 'dress_rental';
	ownerUserIdFk: string;
	businessSettings: Record<string, unknown>;
	createdAt: Date;
};

type BusinessMember = {
	id: number;
	businessIdFk: number;
	userIdFk: string;
	role: BusinessRole;
	createdAt: Date;
};

type BusinessInvite = {
	id: number;
	businessIdFk: number;
	role: BusinessRole;
	status: 'pending' | 'redeemed' | 'revoked';
	expiresAt: Date;
	createdAt: Date;
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
	status: 'active' | 'sold';
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
	// The renter's profile, when she booked it herself. NULL for a booking the
	// owner took by DM or phone, which carries only the renter_* contact fields.
	customerUserIdFk: string | null;
	renterName: string;
	renterEmail: string | null;
	renterPhone: string | null;
	renterInstagram: string | null;
	totalCost: number;
	depositPaid: number | null;
	// Required by the transition trigger before a booking can move to 'shipped'.
	trackingNumber: string | null;
	status: string;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export {
	User,
	AppConfiguration,
	ListingAttribute,
	BusinessRole,
	Business,
	BusinessMember,
	BusinessInvite,
	UserDress,
	DressBooking,
	DressDamageIncident,
};
