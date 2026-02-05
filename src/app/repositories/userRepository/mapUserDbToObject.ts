import { User } from '../../resources/types';

function mapUserDbToObject(usersDb: any[]): User[] {
	return usersDb.map((user) => {
		return {
			id: user.id,
			firstName: user.first_name,
			lastName: user.last_name,
			email: user.email,
			phoneNumber: user.phone_number,
			location: user.location,
			profilePhotoUrl: user.profile_photo_url,
			isEmailVerified: user.is_email_verified,
			isPhoneNumberVerified: user.is_phone_number_verified,
		};
	});
}

export default mapUserDbToObject;
