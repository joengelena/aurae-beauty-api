import { User } from '../../resources/types';

function mapUserDbToObject(usersDb: any[]): User[] {
	return usersDb.map((user) => {
		return {
			id: user.id,
			firstName: user.first_name,
			lastName: user.last_name,
			email: user.email,
			phoneNumber: user.phone_number,
			isEmailVerified: user.is_email_verified,
			isPhoneNumberVerified: user.is_phone_number_verified,
			location: user.location,
		};
	});
}

export default mapUserDbToObject;
