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


import nodemailer from 'nodemailer';

export async function sendEmail(mailOptions: any) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpUser || !smtpPass) {
        const missing = [
            !smtpHost && 'SMTP_HOST',
            !smtpUser && 'SMTP_USER',
            !smtpPass && 'SMTP_PASS',
        ].filter(Boolean).join(', ');
        throw new Error(`SMTP configuration is incomplete. Missing environment variables: ${missing}`);
    }

    // Create transporter inside the function to ensure env vars are loaded
    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
            user: smtpUser,
            pass: smtpPass
        }
    });

    let info;
    try {
        info = await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }

    if (info.rejected && info.rejected.length > 0) {
        const rejectedList = info.rejected.join(', ');
        console.error('Email rejected for recipients:', rejectedList);
        throw new Error(`Email rejected for recipients: ${rejectedList}`);
    }

    console.log('Email sent successfully:', info.messageId);
    return info;
}