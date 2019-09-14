const fetch = require('node-fetch');
const mongoose = require('mongoose');

const projectId = 'sample-bot-bfhkwo'; 
const sessionId = '123456';
const languageCode = 'en-US';

const dialogflow = require('dialogflow');

const config = {
    credentials: {
        private_key: process.env.DIALOGFLOW_PRIVATE_KEY,
        client_email: process.env.DIALOGFLOW_CLIENT_EMAIL
    }
};

const sessionClient = new dialogflow.SessionsClient(config);

const sessionPath = sessionClient.sessionPath(projectId, sessionId);


const { FACEBOOK_ACCESS_TOKEN } = process.env;

const sendTextMessage = (userId, text) => {
    return fetch(
        `https://graph.facebook.com/v2.6/me/messages?access_token=${FACEBOOK_ACCESS_TOKEN}`,
        {
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify({
                messaging_type: 'RESPONSE',
                recipient: {
                    id: userId,
                },
                message: {
                    text,
                },
            }),
        }
    );
}

module.exports = (event) => {
    const userId = event.sender.id;
    const message = event.message.text;

    const request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: message,
                languageCode: languageCode,
            },
        },
    };

    sessionClient
        .detectIntent(request)
        .then(responses => {
            const result = responses[0].queryResult;
            return findUser(userId)
                .then(doc => {
                    if (!doc) {
                        return sendTextMessage(userId, "Please enter your UserName and Password(space Separated)")
                            .then(() => {
                                return mongoose.connection.db.collection('users').insert({ 'usr': userId });
                            })
                    }
                    else {

                        if (!doc.usrName || !doc.password) {
                            let usrName = result.queryText.split(' ')[0];
                            let password = result.queryText.split(' ')[1];
                            return mongoose.connection.db.collection('users').updateOne({ 'usr': userId }, { $set: { usrName: usrName, password: password } })
                                .then(() => {
                                    if (!doc.dob || !doc.email) {
                                        return sendTextMessage(userId, "Please enter your DOB and Email ID(space Separated)");
                                    }
                                })
                        }
                        else if (!doc.Dob || !doc.email) {
                            let dob = result.queryText.split(' ')[0];
                            let email = result.queryText.split(' ')[1];
                            var Emailregex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i;
                            var DateRegex = /^(?:(?:31(\/|-|\.)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(\/|-|\.)(?:0?[13-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/|-|\.)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:0?[1-9]|1\d|2[0-8])(\/|-|\.)(?:(?:0?[1-9])|(?:1[0-2]))\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/;
                            if (email.match(Emailregex) && dob.match(DateRegex)) {
                                return mongoose.connection.db.collection('users').updateOne({ 'usr': userId }, { $set: { Dob: dob, email: email } })
                                    .then(() => {
                                        sendTextMessage(userId, 'Thanks');
                                    })
                            }
                            else {
                                return sendTextMessage(userId, 'Please Enter Valid Email Id and Dob, Please Enter Again');
                            }
                        }
                        else if (doc.usrName && doc.password && doc.Dob && doc.email) {
                            insertChat(userId, result.queryText)
                                .then(() => {
                                    return sendTextMessage(userId, result.fulfillmentText);
                                })
                        }
                    }
                })
        })
        .catch(err => {
            console.error('ERROR:', err);
        });
}

const findUser = (userId) => {
    return mongoose.connection.db.collection('users').findOne({ 'usr': userId });
}

const insertChat = (userId, message) => {
    return mongoose.connection.db.collection('chat').insert({ 'usr': userId, message: message });
}
