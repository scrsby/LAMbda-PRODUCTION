import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "email-smtp.us-east-1.amazonaws.com",
  port: 587,
  secure: false, // Use true for port 465, false for port 587
  auth: {

  },
});

module.exports = transporter;