const moment = require('moment');

const LOGGER = (text) => console.log(`${text} timestamp - ${moment().format()}`);

module.exports = LOGGER;