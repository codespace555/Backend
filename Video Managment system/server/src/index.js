import dotenv from "dotenv";
import connectDB from "./db/db.coonect.js";
import { app } from "./app.js";

dotenv.config({
  path: "./env",
});

const PORT = process.env.PORT || 3000;
connectDB()
  .then(() => {

    app.on("error", (err) => {
        console.log("Error,"+ err)
    })
    app.listen(PORT, () => {
      console.log(`Server running on port http//localhost:${PORT}`);
    });
  })
  .catch((err) => console.log("MongoDb Connection faild" + err));
