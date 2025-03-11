import { User, UserDBSchema } from '../../resources/types';

function mapUserDbToUserDTO(usersDb: UserDBSchema[]): User[] {
	const users: User[] = [];

	usersDb.forEach((user) => {
		users.push({
			id: user['id'],
			firstName: user['first_name'],
			lastName: user['last_name'],
			username: user['username'],
			email: user['email'],
			password: user['password'],
			phoneNumber: user['phone_number'],
			isEmailVerified: user['is_email_verified'],
			isPhoneNumberVerified: user['is_phone_number_verified'],
		});
	});

	return users;
}

export default mapUserDbToUserDTO;
