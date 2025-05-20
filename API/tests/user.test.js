import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../../app.js'; // Assuming app is exported from app.js in the root
import { User } from '../../DB/models/User.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('POST /userExists', () => {
  // Test Case 1: Email Exists
  it('should return { exists: true } when email exists', async () => {
    const existingUser = new User({
      _id: new mongoose.Types.ObjectId(),
      username: 'testuser',
      email: 'testexists@example.com',
      password: 'password123', // Password is required by the model
    });
    await existingUser.save();

    const response = await request(app)
      .post('/user/userExists')
      .send({ email: 'testexists@example.com' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ exists: true });

    // Cleanup: remove the test user
    await User.findByIdAndDelete(existingUser._id);
  });

  // Test Case 2: Email Does Not Exist
  it('should return { exists: false } when email does not exist', async () => {
    const response = await request(app)
      .post('/user/userExists')
      .send({ email: 'testdoesnotexist@example.com' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ exists: false });
  });

  // Test Case 3: Invalid Input (Empty Body)
  it('should return { exists: false } when body is empty', async () => {
    const response = await request(app)
      .post('/user/userExists')
      .send({});

    expect(response.statusCode).toBe(200); // Based on current implementation
    expect(response.body).toEqual({ exists: false }); // Based on current implementation
  });

  // Test Case 4: Invalid Input (No Email Field)
  it('should return { exists: false } when email field is missing', async () => {
    const response = await request(app)
      .post('/user/userExists')
      .send({ username: 'someuser' }); // Sending some other data but not email

    expect(response.statusCode).toBe(200); // Based on current implementation
    expect(response.body).toEqual({ exists: false }); // Based on current implementation
  });
});
