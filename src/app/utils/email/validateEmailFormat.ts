function getValidateEmailFormat(verificationLink: string) {
	return `
        <!DOCTYPE html>
        <html>
        <head>
        <title>Verify Your Email Address</title>
        <style>
            body {
            font-family: Arial, sans-serif;
            font-size: 16px;
            line-height: 1.5;
            margin: 0;
            padding: 0;
            }

            .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f2f2f2;
            }

            .header {
            background-color: #063970;
            color: #fff;
            padding: 20px;
            text-align: center;
            }

            .content {
            padding: 20px;
            }
        </style>
        </head>
        <body>
        <div class="container">
            <div class="header">
            <h2>Verify Your Email Address</h2>
            </div>
            <div class="content">
            <p>Hello,</p>
            <p>Thanks for signing up! To complete your registration, please verify your email address by clicking the button below:</p>
            <a href="${verificationLink}">Verify Email</a>
            <p>If you didn't request this verification, please ignore this email.</p>
            </div>
        </div>
        </body>
        </html>`;
}

export default getValidateEmailFormat;
