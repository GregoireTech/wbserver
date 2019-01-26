const endpoints = require('../config/endpoints.js');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');

const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: endpoints.email_key
    }
}));


exports.sendEmail = (guest, string) => {
    const link = 'http://localhost:3000/rooms/?' + string;
    console.log(guest, link);
    transporter.sendMail({
        to: guest,
        from :'whiteboard.cours-masson.com',
        subject: 'Vous êtes invité par un prof',
        html: `<a href=${link}>Cliquez ici pour rejoindre la room!</a>`
    })
    .then(res =>{ 
        console.log('email sent to: ', guest );
        console.log(res);
        return true;
    })
    .catch(err => {
        console.log(err);
        return false;
    });
}

