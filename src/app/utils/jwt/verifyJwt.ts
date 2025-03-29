import jwt from 'jsonwebtoken';

enum JwtStatus {
	VALID = 'valid',
	INVALID = 'invalid',
	EXPIRED = 'expired',
}

function verifyJwt(jwtToken: string) {
	try {
		const validJwt = jwt.verify(jwtToken, process.env.JWT_SECRET);
		return { status: JwtStatus.VALID, data: validJwt };
	} catch (error) {
		if (error.code === 'TokenExpiredError') {
			return { status: JwtStatus.EXPIRED, data: '' };
		}

		if (error.code === 'JsonWebTokenError') {
			return { status: JwtStatus.INVALID, data: '' };
		}

		return { status: JwtStatus.INVALID, data: '' };
	}
}

export default verifyJwt;
export { JwtStatus };
