import { Response } from 'express';

function clearCookiesInResponse(res: Response) {
	res.clearCookie('authToken');
	res.clearCookie('jwt');
}

export default clearCookiesInResponse;
