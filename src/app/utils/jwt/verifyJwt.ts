import jwt from 'jsonwebtoken';

function verifyJwt(jwtToken: string) {
	try {
		const validJwt = jwt.verify(jwtToken, process.env.JWT_SECRET);
		return { status: 'valid', data: validJwt };
	} catch (error) {
		if (error.code === 'TokenExpiredError') {
			return { status: 'expired', data: '' };
		}

		if (error.code === 'JsonWebTokenError') {
			return { status: 'invalid', data: '' };
		}

		return { status: 'invalid', data: '' };
	}
}

export default verifyJwt;
