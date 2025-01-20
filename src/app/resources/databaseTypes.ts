type UserDBSchema = {
	id: string;
	first_name: string;
	last_name: string;
	username: string;
	phone_number: string;
	email: string;
	password: string;
	email_validated: number;
	phone_number_validated: number;
	auth_token: string | null;
};

type UserEmailValidationStatus = {
	email_validated: UserDBSchema['email_validated'];
};

export { UserDBSchema, UserEmailValidationStatus };
