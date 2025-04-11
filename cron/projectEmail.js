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

const sendReminder = async (email, industryName, endDate) => {
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
      const { email, industryName, projectDuration , completed } = project;

      if (completed==="yes" || !projectDuration) continue;

      const [ , endStr ] = projectDuration.split(' - ');
      
      const endDateParts = endStr.split(' ');
      const month = endDateParts[0]; 
      const year = endDateParts[1];  
      
      const nextMonth = new Date(`${month} 1, ${year}`);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      const lastDayOfMonth = new Date(nextMonth);
      lastDayOfMonth.setDate(lastDayOfMonth.getDate() - 1);
      
      if (isAfter(today, lastDayOfMonth)) {
        await sendReminder(email, industryName, lastDayOfMonth);
      }
    }
  } catch (err) {
    console.error('Cron job error:', err.message);
  }
});
