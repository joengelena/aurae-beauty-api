import jwt from 'jsonwebtoken';
function generateJwtToken(payload: object) {
	const token = jwt.sign(payload, process.env.JWT_SECRET, {
		expiresIn: '5s',
	});
	return token;
}

export { generateJwtToken };
