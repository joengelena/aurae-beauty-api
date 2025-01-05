import jwt from 'jsonwebtoken';

function generateJwtToken(payload: object, expiresIn: string) {
	const token = jwt.sign(payload, process.env.JWT_SECRET, {
		expiresIn,
	});
	return token;
}

export { generateJwtToken };
