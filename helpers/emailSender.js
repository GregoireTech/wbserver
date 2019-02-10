const endpoints = require('../config/endpoints.js');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');

const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: endpoints.email_key
    }
}));

const validateEmail = email => {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

exports.sendEmail = (io, socketId, guest, string) => {

    const sendMessage = (message) => {
        try {
            io.of('/boards').to(`${socketId}`).emit('message', {
                msg: message
            });
        }
        catch(error) {
            console.error(error);
        }
    };
    
    const link = 'https://massonwb.firebaseapp.com/rooms/?' + string;
    if (validateEmail(guest) && string !== undefined) {
        transporter.sendMail({
                to: guest,
                from: 'whiteboard.cours-masson.com',
                subject: 'Vous êtes invité par un prof',
                html: `<a href=${link}>Cliquez ici pour rejoindre la room!</a>`
            })
            .then(res => {
                sendMessage('Votre invitation a bien été envoyée.');
            })
            .catch(err => {
                console.log(err);
                sendMessage('Impossible de traiter votre demande. Veuillez rafraîchir la page et réessayer.');
            });
    } else {
        sendMessage('Impossible de traiter votre demande. Veuillez rafraîchir la page et réessayer.');
    }
}