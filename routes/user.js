const express = require("express");
const router = express.Router();

router.get('/form',(req, res)=>{
    res.send("form");
})

module.exports =  router;