import nodemailer from 'nodemailer';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const createTransporter = () => {
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
        }
    });
};

// export const sendActivationEmail = async (email, token) => {
//     const transporter = createTransporter();

//     const resetLink = `${process.env.FRONTEND_URL}/auth/account-activation/${token}`;

//     const emailHtml = readFileSync(path.join(import.meta.dirname, '../templates/emails/account-activation.html'), 'utf-8');
    
//     const info = await transporter.sendMail({
//         from: process.env.EMAIL_USER,
//         to: email,
//         subject: "Confirm your account",
//         text: `Thank you for signing up. \nClick on the link below to verify your email: \n${resetLink} \nThis link will expire in 24 hours. \nYou're receiving this email because you recently created a new account. If this wasn't you, please ignore this email.`,
//         html: emailHtml.replace('{{resetLink}}', resetLink)
//     });

//     return info;
// }

export const sendResetPasswordEmail = async (email: string, token: string) => {
    const transporter = createTransporter();

    const resetLink = `${process.env.FRONTEND_URL}/password-reset/${token}`;

    const emailHtml = readFileSync(path.join(import.meta.dirname, '../templates/emails/password-reset.html'), 'utf-8');
    
    const info = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Reset your password",
        text: `You recently requested to reset your password. \nClick on the link below to proceed: \n${resetLink} \nThis link will expire after one hour.\nIf you didn\'t request this, please ignore this email.`,
        html: emailHtml.replace('{{resetLink}}', resetLink)
    });
    // return info;
}