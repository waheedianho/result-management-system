const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const JwtStrategy = require('passport-jwt').Strategy; //authenticating RESTful endpoint without session
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwt = require("jsonwebtoken");

const Staff = require("./model/staff");
const config = require('./config');
const SECRET_KEY = config.session_secret;

// exports.local = passport.use(new LocalStrategy({ usernameField: 'email' }, Staff.authenticate()));
exports.local = passport.use(new LocalStrategy(Staff.authenticate()));

passport.serializeUser(Staff.serializeUser())
passport.deserializeUser(Staff.deserializeUser())
// passport.use(
//   "local-login",
//   new LocalStrategy(
//     {
//       usernameField: "email",
//       passwordField: "pswrd",
//       passReqToCallback: true,
//     },
//     (req, email, pswrd, done) => {
//       Staff.findOne({ email: email })
//         .then(
//           (user) => {
//             if (!user) {
//               const err = new Error("User didn't exist");
//               done(err, err);
//             }
//             return done(null, user);
//           },
//           (err) => done(err, err)
//         )
//         .catch((err) => {
//           done(err, err);
//         });
//     }
//   )
// );

// passport.serializeUser((user, done) => {
//   done(null, user.id);
// });
//
// passport.deserializeUser((id, done) => {
//   Staff.findById(id)
//     .then((user) => done(null, user))
//     .catch((err) => done(err, err));
// });

exports.getToken = payload => {
    return jwt.sign(payload, SECRET_KEY, { expiresIn: 3600 })
}

const opts = {}
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = SECRET_KEY;

exports.jwtPassport =passport.use(new JwtStrategy(opts, async (jwt_payload, done) => {
    try{
        const user = await Staff.findById(jwt_payload._id);
        return done(null, user);
    }catch (e) {
        return done(err, false);
    }

    // if(err)
    // if(user)
    // else return done(null, false)
}))

exports.comfirmUser = (req, res, next) => {
    req.user ? next() : res.redirect("/");
}
exports.verifyUser = (req, res, next) => {
    passport.authenticate("jwt", { session: false, failureRedirect: "/" })(req, res, () => {
        res.locals.user = req.user;
        next();
    });
};

// module.exports = passport;

exports.isAuth = (req, res, next) => {
    if (!req.session?.token) {
        return res.redirect("/")
    }

    // console.log("session is ",  req.session.token)
    req.headers.authorization = `bearer ${req.session.token}`
    next()
}
