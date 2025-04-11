import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const admin = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  token: { type: String },

});
admin.pre('save', async function (next) {
  const admin = this;
  admin.password = await bcrypt.hash(admin.password, 8);
  const { _id, username, email } = admin;

  var token = await jwt.sign({ _id, username, email, }, 'Secret key', { expiresIn: 3600000 });

  admin.token = token;

  next();
})

export const  Admin = mongoose.model('Admin', admin);