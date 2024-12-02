import { Response } from 'express';
import { CSRF_TOKEN, JWT_TOKEN } from '../../resources/constants';

function clearCookiesInResponse(res: Response) {
	res.clearCookie(CSRF_TOKEN);
	res.clearCookie(JWT_TOKEN);
}

export default clearCookiesInResponse;
