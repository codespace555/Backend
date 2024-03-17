import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const commentSchema = new Schema({
    content: {
        type: String,
        required: true

    },
    video:{
        type: Schema.Types.ObjectId,  //referencia a un documento de la coleccion videos
        ref:"Video"                   //nom
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }

},{
    timestamps:true     //crea campos createdAt by updatedAt
})


commentSchema.plugin(mongooseAggregatePaginate)

export const Comment = mongoose.model("Comment", commentSchema)