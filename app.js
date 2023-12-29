//jshint esversion:6
import express from "express";
import ejs from "ejs";
import bodyParser from "body-parser";
import mongoose from "mongoose";


const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

await mongoose.connect('mongodb://127.0.0.1/userDB');

// Schema interface
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

// // Create the user schema
const userSchema = new Schema({
    email: String,
    password: String
});

const User = mongoose.model("User", userSchema);

// Home page route
app.get("/", (req, res) => {
    res.render("home");
});

// Login route
app.get("/login", (req, res) => {
    res.render("login");
});

async function logIn (userId, password) {
    try {
        const user = await User.findOne({email: userId});

        // if user not found
        if(!user) {
            return { success: false, message: "Invalid user id"};
        }
        
        const isPasswordValid = (password === user.password) ? true : false;

        if(isPasswordValid) {
            return {success: true, user};
        } else {
            return {success: false, message: "Invalid password"};
        }
        
    } catch (error) {
        console.log("Login error: ", error);
        return {success: false, message: "Login failed"};
    }
}

app.post("/login", async (req, res) => {
    const email = req.body.username;
    const password = req.body.password;

    if(email && password) {
        const loginResult = await logIn(email, password);
        
        if(loginResult.success === false) {
            console.log(loginResult.message);
        }

        if(loginResult.success === true) {
            res.render("secrets");
        }        
    }
    
});

// Register route
app.get("/register", (req, res) => {  
    res.render("register");
});

app.post("/register", async (req, res) => {
    const email = req.body.username;
    const password = req.body.password;

    let error;
    let success;

    const newUser = new User({
        email: email,
        password: password
    });

    try {
        const result = await newUser.save();
        success = result;
    } catch (err) {
        error = err;
    }

    if(error) {
        console.log(error);
    }

    if(success) {
        res.render("secrets");
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://127.0.0.1:${port}`);
});
