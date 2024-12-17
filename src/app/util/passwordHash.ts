import bcrypt from 'bcrypt';

async function hashPassword(password: string) {
	const hashedPassword = await bcrypt.hash(password, 18);
	return hashedPassword;
}

async function comparePassword(password: string, hashedPassword: string) {
	const isPasswordValid = await bcrypt.compare(password, hashedPassword);
	return isPasswordValid;
}

export { hashPassword, comparePassword };
