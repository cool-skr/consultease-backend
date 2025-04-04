import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from '../../DB/models/User.js';
import { checkAuth } from '../middleware/auth.js';
const router = express.Router();

router.post('/login', (req, res) => {
    let { email, password } = req.body;
    User.findOne({ email }).exec().then(user => {
        const isPasswordMatch = bcrypt.compareSync(password, user.password);
        if (user && isPasswordMatch) {
            res.status(200).json({
                message: 'Login successful',
                token: user.token
            });
        }
        else if (!isPasswordMatch) {
            res.status(401).json({
                message: 'Invalid password'
            });
        }
        else {
            res.status(401).json({
                message: 'User not found'
            });
        }
    }).catch(err => {
        res.status(500).json({
            message: 'Internal server error'
        });
    });
})

router.post('/register', (req, res) => {
    const { username, password, email } = req.body;
  
    const user = new User({
      _id: new mongoose.Types.ObjectId(),
      username,
      password,
      email,
      token: '',
    });
  
    User.findOne({ email })
      .exec()
      .then((userRecordExist) => {
        if (!userRecordExist) {
          user
            .save()
            .then(async (result) => {
              console.log(result);
              res.status(201).json({
                message: 'User Saved in database',
              });
            })
            .catch((err) => {
              if (err.name === 'ValidationError') {
                res.status(400).json({
                  error: err.message,
                });
              } else {
                res.status(500).json({
                  error: err,
                });
              }
            });
        } else {
          res.status(409).json({
            message: 'email already exist',
          });
        }
      })
      .catch((err) => {
        res.status(500).json({
          error: err,
        });
      });
  });
    


router.post('/access', checkAuth, (req, res) => {
    
    res.status(200).json({

    message: 'acces',

    user: req.userData

})
});

export default router;