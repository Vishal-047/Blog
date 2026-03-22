const JWT = require ('jsonwebtoken');

function getJwtSecret(){
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not set. Add JWT_SECRET to your environment variables.");
    }
    return secret;
}

function createToken(user){
    const payload={
        _id:user._id,
        email: user.email,
        role:user.role,
    };
    const token=JWT.sign(payload, getJwtSecret(), { expiresIn: "7d" });
    return token;
}

function validateToken(token){
    const payload=JWT.verify(token, getJwtSecret());
    return payload;
}

module.exports={
    createToken,
    validateToken
};
