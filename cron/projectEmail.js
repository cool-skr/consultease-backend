import cron from 'node-cron';
import axios from 'axios';
import nodemailer from 'nodemailer';
import { parse, isAfter } from 'date-fns';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your_email@gmail.com',
    pass: 'your_app_password'     
  }
});

const sendReminder = async (email, industryName, endDate) => {
  const mailOptions = {
    from: 'your_email@gmail.com',
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

cron.schedule('*/12 * * * *', async () => {
  console.log('Running project reminder cron...');

  try {
    const res = await axios.get('http://localhost:5000/project/admin/fetch/');
    const projects = res.data;

    const today = new Date();

    for (const project of projects) {
      const { email, industryName, projectDuration } = project;

      if (!projectDuration) continue;

      const [ , endStr ] = projectDuration.split(' - ');
      const endDate = parse(`01 ${endStr}`, 'dd MMM yyyy', new Date());

      if (isAfter(today, endDate)) {
        await sendReminder(email, industryName, endDate);
      }
    }
  } catch (err) {
    console.error('Cron job error:', err.message);
  }
});
