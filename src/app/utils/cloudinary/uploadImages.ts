import cloudinary from './config';

async function uploadImages(files: Express.Multer.File[]) {
	const uploadedImageUrls = [];

	for (const file of files) {
		const base64String = file.buffer.toString('base64');
		const mimeType = file.mimetype;
		const base64DataUri = `data:${mimeType};base64,${base64String}`;

		const result = await cloudinary.uploader.upload(base64DataUri, {
			folder: 'motorix',
		});

		uploadedImageUrls.push(result.secure_url);
	}

	return uploadedImageUrls;
}

export default uploadImages;
