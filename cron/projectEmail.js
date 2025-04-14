import cron from 'node-cron';
import axios from 'axios';
import nodemailer from 'nodemailer';
import { parse, isAfter } from 'date-fns';
import dotenv from 'dotenv';

dotenv.config();
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user : process.env.my_email,
    pass : process.env.my_pass,
  }
});
const sendReminder = async (email) => {
  const mailOptions = {
    from : process.env.my_email,
    to: email,
    subject: 'Project Updation Reminder',
    text: `Dear user, this is a reminder to update any new projects in the consultease portal. Thank You.`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reminder sent to ${email}`);
  } catch (err) {
    console.error(`Error sending to ${email}:`, err.message);
  }
}
const sendProjectReminder = async (email, industryName, endDate) => {
  const mailOptions = {
    from : process.env.my_email,
    to: email,
    subject: 'Project Reminder',
    text: `Your project with ${industryName} ended on ${endDate.toDateString()}. Please update its status.`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reminder sent to ${email}`);
  } catch (err) {
    console.error(`Error sending to ${email}:`, err.message);
  }
};
// '0 0 1,15 * *' - 15 days
cron.schedule('*/1 * * * *', async () => {
  console.log('Running project reminder cron...');

  try {
    const res = await axios.get('http://localhost:5000/project/admin/fetch/');
    const projects = res.data;

    const today = new Date();

    for (const project of projects) {
      const { email, industryName, projectDuration, completed } = project;

      if (completed === "yes" || !projectDuration) continue;

      const [ , endStr ] = projectDuration.split(' - ');

      const endDate = parse(endStr, 'dd MMMM yyyy', new Date());

      if (isAfter(today, endDate)) {
        await sendProjectReminder(email, industryName, endDate);
      }
      await sendReminder(email); 
    }
  } catch (err) {
    console.error('Cron job error:', err.message);
  }
});
