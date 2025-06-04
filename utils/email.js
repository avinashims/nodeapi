import nodemailer from "nodemailer";
import { configDotenv } from "dotenv";

configDotenv();
export const sendVerificationEmail = async (email, verificationCode) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: email,
    subject: "გთხოვთ დაადასტუროთ ელ-ფოსტა",
    html: `
        <p>მადლობა რომ დარეგისტრირდით ჩვენს ვებსაიტზე.</p>
        <p>გთხოვთ დაადასტუროთ ელ-ფოსტა მოცემული კოდით:</p>
        <h1 style="font-size: 24px; font-weight: bold;">${verificationCode}</h1>
      `,
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Error sending email");
  }
};

export const updateUserEmail = async (email, verificationCode) => {
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: email,
    subject: "გთხოვთ დაადასტუროთ ელ-ფოსტა.",
    html: `
        <p>გთხოვთ დაადასტუროთ ელ-ფოსტა მოცემული კოდით:</p>
        <h1 style="font-size: 24px; font-weight: bold;">${verificationCode}</h1>
      `,
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Error sending email");
  }
};

export const forgotPasswordEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to,
      subject,
      text,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Could not send email");
  }
};
