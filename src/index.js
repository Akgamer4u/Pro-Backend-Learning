import dotenv from "dotenv";
import connectDB from "./db/index.js";
import app from "./app.js";

dotenv.config({
    path: "./.env"
});



connectDB()
.then(() => {
    app.listen(process.env.PORT||3000, () => {
        console.log(`SERVER IS RUNNING ON PORT: ${process.env.PORT}`);
    })

    app.on("error", (err) => {
        console.log(`SERVER FAILED TO START: ${err}`);
    })
})
.catch(err => console.log(`MONGO DB CONNECTION FAILED: ${err}`))