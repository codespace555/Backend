class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something Wents Wrong",
        errors = [],
        statck = ""

    ) {
        super(message);
        this.statusCode = statusCode;
        this.data = null
        this.errors = errors;
        this.success = false

        if(statck){
            this.stack = statck
        }else{
            Error.captureStackTrace(this,this.constructor)
        }

    }
}


export {ApiError};