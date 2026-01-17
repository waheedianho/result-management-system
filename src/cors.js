const express = require('express')
const cors = require('cors')

const app = express()
const whitelist = ['http://localhost:3030', 'https://localhost:3000']

let corsOptionDelegate = (req, cb) => {
    var corsOptions;

    if(whitelist.indexOf(req.header('Origin')) !== -1) {
        corsOptions = {origin: true}
    } else {
        corsoptions = { origin: false}
    }

    cb(null, corsOptions)
}


exports.cors = cors() //without option
exports.corsWithOptions = cors(corsOptionDelegate)


// channel this module into differebt route that require it 
// use cors.cors for get route 
// use cors.corsWithOption with essential route 