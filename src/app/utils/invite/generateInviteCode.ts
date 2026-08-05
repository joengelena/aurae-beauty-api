import crypto from 'crypto';

// Excludes 0/O and 1/I/L — ambiguous when read aloud or handwritten
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

export function hashInviteCode(code: string): string {
	return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
}

export function generateInviteCode(): { code: string; codeHash: string } {
	const bytes = crypto.randomBytes(CODE_LENGTH);
	const code = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
	return { code, codeHash: hashInviteCode(code) };
}
