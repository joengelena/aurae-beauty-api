import { User } from '../../resources/types';
import { RowDataPacket } from 'mysql2';

function mapUserDbToObject(usersDb: RowDataPacket[]): User[] {
	return usersDb.map((user) => {
		return {
			id: user.id,
			firstName: user.first_name,
			lastName: user.last_name,
			username: user.username,
			email: user.email,
			password: user.password,
			phoneNumber: user.phone_number,
			isEmailVerified: user.is_email_verified,
			isPhoneNumberVerified: user.is_phone_number_verified,
		};
	});
}

export default mapUserDbToObject;
