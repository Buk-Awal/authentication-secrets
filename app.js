import {} from "dotenv/config";
import express from "express";
import ejs from "ejs";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import session from "express-session";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose"
import GoogleStrategy from "passport-google-oauth20";
import findOrCreate from "mongoose-findorcreate";

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(session({
    secret: "This is our little secret.",
    resave: false,
    saveUninitialized: false
}));

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.use(passport.initialize());
app.use(passport.session());

await mongoose.connect('mongodb://127.0.0.1/userDB');

// Schema interface
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

// // Create the user schema
const userSchema = new Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

// Home page route
app.get("/", (req, res) => {
    res.render("home");
});

// Login route
app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/auth/google", passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/secrets", 
    passport.authenticate("google", { failureRedirect: "/login" }),

    function(req, res) {
        res.redirect("/secrets");   
    }
);

app.post("/login", async (req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    
    
    req.login(user, function(err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });
});

// Register route
app.get("/register", (req, res) => {  
    res.render("register");
});

app.post("/register", async (req, res) => {
    User.register({ username: req.body.username }, req.body.password, function(err, user) {
      if (err) {
          console.log(err);
          res.redirect("/register");
      } else {
          passport.authenticate("local")(req, res, () => {
              res.redirect("/secrets");
          });
      }
    });
  });

// secrets route
app.get("/secrets", function(req, res) {
    User.find({ "secret": { $ne: null } }).then((foundUsers) => { res.render("secrets", {userWithSecrets: foundUsers })}).catch((err) => {console.log("Error, no users with secrets found")});
});

app.get("/submit", (req, res) => {
    if(req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.post("/submit", (req, res) => {
    const submittedSecret = req.body.secret;

    User.findById(req.user.id).then((foundUser) => {
        foundUser.secret = submittedSecret;
        foundUser.save();
        res.redirect("/secrets");
    }).catch((err) => {console.log(err)}); 
    
});

// Logout route
app.get("/logout", function(req, res, next) {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect("/");
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://127.0.0.1:${port}`);
});
