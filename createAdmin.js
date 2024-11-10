import inquirer from "inquirer";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "./src/mongoose/schemas/user.js";
import { ROLES } from "./src/utils/enums.js";

mongoose.connect(process.env.MONGODB_CONNECTION_STRING)
    .catch((error) => console.log(error));

const validateString = input => (input.trim() !== '') ? true :"This field is required";

const validateEmail = email => {
    const emailRegex = /\S+@\S+\.\S+/;
    return emailRegex.test(email) ? true : "Enter a valid email";
}

const validatePassword = (input) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (passwordRegex.test(input)) {
        return true;
    } else {
        return "Password must be at least 8 characters long, include one lowercase letter, one uppercase letter, one number, and one symbol.";
    }
}

const createAdmin = async () => {
    const answers = await inquirer.prompt([
        {
            type: "input",
            name: "fullName",
            message: "Enter admin full name: ",
            validate: validateString
        },
        {
            type: "input",
            name: "username",
            message: "Enter admin username: ",
            validate: validateString
        },
        {
            type: "input",
            name: "email",
            message: "Enter admin email: ",
            validate: validateEmail
        },
        {
            type: "password",
            name: "password",
            message: "Enter admin password: ",
            mask: "*",
            validate: validatePassword
        }
    ]);

    const { fullName, username, email, password } = answers;

    const hash = await bcrypt.hash(password, 12);

    const user = new User({
        fullName,
        username,
        email,
        password: hash,
        role: ROLES.ADMIN,
        isActive: true 
    })

    try {
        await user.save();
        console.log('Admin user created successfully');
    } catch (error) {
        console.error('Error creating admin user:', error);        
    }finally {
        mongoose.connection.close();
    }
}

await createAdmin();