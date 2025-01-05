function generateEmailVerificationLink(url: string, jwtToken: string): string {
	return `${url}?token=${jwtToken}`;
}

export default generateEmailVerificationLink;
