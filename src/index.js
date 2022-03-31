const mongoose = require("mongoose");
const app = require("./app");
const config = require("./config/config");



// TODO: CRIO_TASK_MODULE_UNDERSTANDING_BASICS - Create Mongo connection and get the express app to listen on config.port
mongoose.connect(config.mongoose.url)
        .then(()=>console.log("connected to mongo at",config.mongoose.url))
        .catch((e)=>console.log("error",e))
let server = app.listen(config.port,()=>console.log("server is listening at",config.port));