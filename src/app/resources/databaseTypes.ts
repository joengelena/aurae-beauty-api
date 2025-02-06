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

type UserEmailValidationStatus = {
	is_email_verified: UserDBSchema['is_email_verified'];
};

type AppConfigurationDBSchema = {
	id: number;
	name: string;
	value: string;
};

export { UserDBSchema, UserEmailValidationStatus, AppConfigurationDBSchema };
