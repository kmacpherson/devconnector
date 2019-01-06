const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const keys = require('../../config/keys');
const passport = require('passport');


// Load user module
const User = require('../../models/User');

// Validate Input
const validateRegisterInput = require('../../validation/register');
const validateLoginInput = require('../../validation/login');


// @route   GET api/users/test
// @desc    Tests user route
// @access  Public
router.get('/test', (req,res) => res.json({msg: 'Users works'}));

// @route   GET api/users/register
// @desc    Register user
// @access  Public
router.post('/register', (req, res) => {

    // Check validation
    const { errors, isValid } = validateRegisterInput(req.body);

    // If not valid return error.
    if (!isValid) {
        return res.status(400).json(errors);
    }

    User.findOne({ email: req.body.email })
    .then(user => {
        if(user) {
            errors.email = 'E-Mail already exists.';
            return res.status(400).json(errors);
        } else {
            const avatar = gravatar.url(req.body.email, {
                s: '200', //Size
                r: 'pg', //Keeping it clean
                d: 'mm' //Default avatar
            });
            const newUser = new User({
                name: req.body.name,
                email: req.body.email,
                avatar,
                password: req.body.password
            });

            bcrypt.genSalt(10, (err, salt) => {
                bcrypt.hash(newUser.password, salt, (err, hash) => {
                    if (err) throw err;
                    newUser.password = hash;
                    newUser.save()
                        .then(user => res.json(user))
                        .catch(err => console.log(err));
                })
            });
        }
    });
});

// @route   GET api/users/login
// @desc    Login User / Returning JWT Token
// @access  public
router.post('/login', (req, res) => {
      // Check validation
      const { errors, isValid } = validateLoginInput(req.body);

      // If not valid return error.
      if (!isValid) {
          return res.status(400).json(errors);
      }

    // find the user by email.
    User.findOne({email})
        .then(user => {
            if (!user) {
                return res.status(404).json({email: 'User not found'});
            }

            // Check password
            bcrypt.compare(password, user.password)
                .then(isMatch => {
                    if(isMatch) {
                        //User Matched
                        // Creating JWT payload
                        const payload = {
                            id: user.id,
                            name: user.name,
                            avatar: user.avatar
                        }
                        //Sign Token
                        jwt.sign(
                            payload, 
                            keys.secretKey, 
                            { expiresIn: 3600 }, 
                            (err, token) => {
                                res.json({
                                    success: true,
                                    token: 'Bearer ' + token
                                });
                            }
                        );
                        
                    } else {
                        return res.status(400).json({password: 'Password incorrect'});
                    }
                })

        })
});

// @route   GET api/users/current
// @desc    Current user
// @access  private
router.get('/current', passport.authenticate('jwt', { session: false}), (req,res) => {
    res.json({
        id: req.user.id,
        name: req.user.name,
        email: req.user.email
    });
});

module.exports = router;