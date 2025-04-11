import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { Admin } from '../../DB/models/Admin.js';
import { checkAuth } from '../middleware/auth.js';
const router = express.Router();

router.post('/login', (req, res) => {
    let { email, password } = req.body;
    Admin.findOne({ email }).exec().then(admin => {
        const isPasswordMatch = bcrypt.compareSync(password, admin.password);
        if (admin && isPasswordMatch) {
            res.status(200).json({
                message: 'Login successful',
                token: admin.token
            });
        }
        else if (!isPasswordMatch) {
            res.status(401).json({
                message: 'Invalid password'
            });
        }
        else {
            res.status(401).json({
                message: 'Admin entry not found'
            });
        }
    }).catch(err => {
        res.status(500).json({
            message: 'Internal server error'
        });
    });
})

router.post('/register', (req, res) => {
    const { username, password, email , adminKey} = req.body;
    if (adminKey !== 'ssn123') {
        res.status(401).json({
            message: 'Invalid admin key'
        });
        return;
    }
    const admin = new Admin({
      _id: new mongoose.Types.ObjectId(),
      username,
      password,
      email,
      token: '',
    });
  
    Admin.findOne({ email })
      .exec()
      .then((userRecordExist) => {
        if (!userRecordExist) {
          admin
            .save()
            .then(async (result) => {
              console.log(result);
              res.status(201).json({
                message: 'Admin entry added in database',
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

    admin: req.userData

})
});

export default router;