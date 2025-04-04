import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { token } from 'morgan';

const user = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  token: { type: String },

});
user.pre('save', async function (next) {
  const user = this;
  user.password = await bcrypt.hash(user.password, 8);
  const { _id, username, email } = user;

  var token = await jwt.sign({ _id, username, email, }, 'Secret key', { expiresIn: 3600000 });

  user.token = token;

  next();
})

export const  User = mongoose.model('User', user);