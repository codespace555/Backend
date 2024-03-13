import dotenv from "dotenv"
import connectDB from "./db/db.coonect.js"

dotenv.config({
    path:'./env'
})

connectDB()