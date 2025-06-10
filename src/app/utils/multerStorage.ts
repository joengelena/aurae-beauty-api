import multer from 'multer';

const storage = multer.memoryStorage();
const multerUpload = multer({ storage });

export default multerUpload;
