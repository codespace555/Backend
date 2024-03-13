import mongoose from "mongoose"
import { DB_NAME } from "../constants.js"

const connectDB = async() => {
    try{
        const dbConnect = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        console.log("MongoDB Connected:",dbConnect.connection.host)
    }catch(err){
        console.log(`MongoDB connection error: ${err}`)
        process.exit(1)
    }
}

export default  connectDB;