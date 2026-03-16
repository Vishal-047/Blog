const {createHmac, randomBytes}=require('node:crypto');
const {Schema, model} = require("mongoose");
const { createToken } = require("../services/auth");

const userSchema=new Schema({
    fullName:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    salt:{
        type:String,
    },
    role:{
        type:String,
        enum:['USER', 'ADMIN'],
        default:'USER',
    },
    password:{
        type:String,
        required:true,
    }
    
},{timestamps:true});

userSchema.pre('save', function(next){
    const user=this;

    if(!user.isModified("password")) return next();

    const salt=randomBytes(16).toString("hex");
    const HashedPassword=createHmac('sha256',salt).update(user.password).digest("hex");

    this.salt=salt;
    this.password=HashedPassword;
    next();

})

userSchema.static('matchedPassword', async function(email, password){
    const user=await this.findOne({email});

    if(!user) throw new Error("User not found");

    const salt=user.salt;
    const HashedPassword=user.password;
    const userProvidePass=createHmac("sha256",salt)
    .update(password)
    .digest("hex");

    if(HashedPassword!==userProvidePass){
        throw new Error("Invalid Passsword");
    }
    return createToken(user);
})
const User=model('user', userSchema);
module.exports=User;
