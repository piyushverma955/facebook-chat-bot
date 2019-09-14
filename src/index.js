const express = require('express');
const bodyParser = require('body-parser');
const verifyWebhook = require('./verify-webhook');
require('dotenv').config({ path: 'variables.env' });
const messageWebhook = require('./message-webhook');

const app = express();

const mongoose = require('mongoose');

let mongoUrl = "mongodb://localhost:27017";
let options = {
	dbName: "bot",
	useNewUrlParser: true
};

mongoose.connect(mongoUrl, options, err => {
	if (err) {
		console.log('Cannot Connect to DB');
		console.log(err);
		process.exit(0);
	}
	console.log('Connected to DB');

});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.get('/', verifyWebhook);
app.post('/', messageWebhook);

app.listen(5000, () => console.log('Express server is listening on port 5000'));