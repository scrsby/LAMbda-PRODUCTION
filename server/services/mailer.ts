/*
  _               __  __ _         _       
 | |        /\   |  \/  | |       | |      
 | |       /  \  | \  / | |__   __| | __ _ 
 | |      / /\ \ | |\/| | '_ \ / _` |/ _` |
 | |____ / ____ \| |  | | |_) | (_| | (_| |
 |______/_/    \_\_|  |_|_.__/ \__,_|\__,_|
 
 Name: Mailer Service
 File: mailer.ts
 Required by: 
 Description: This is the main file for the LAMbda server application, setting up configurations and middleware. It is run on server start.
 Functions: 
 Last Edited: 25 January 2026
*/

const mail_service = require('../config/nodemailer-config');

/*
const mailOptions = {
    from: '"LAMbda Team" <no-reply@terminalvelocitydevelopment.com>',
    to: userEmail,
    subject: "Subject",
    text: `Text-Based Email body`,
    html: `HTML-Based Email body`,
  };
*/

const sendEmail = async (mailOptions: Object) => {
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

module.exports = { sendEmail };