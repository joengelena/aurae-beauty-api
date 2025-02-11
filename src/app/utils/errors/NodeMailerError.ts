class NodeMailerError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'NodeMailerError';
	}
}

export default NodeMailerError;
