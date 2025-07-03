class AppError extends Error {
	status: number;

	constructor(status = 400, message: string) {
		super(message);
		this.status = status;
		// Maintain proper stack trace (only on V8)
		if (Error.captureStackTrace) Error.captureStackTrace(this, AppError);
	}
}

export default AppError;
