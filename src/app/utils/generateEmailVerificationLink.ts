function generateEmailVerificationLink(
	emailVerifciationUrl: string,
	jwtToken: string
): string {
	return `${emailVerifciationUrl}/${jwtToken}`;
}

export default generateEmailVerificationLink;
