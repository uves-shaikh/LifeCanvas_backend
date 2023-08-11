const mongoose = require('mongoose')
const {Schema,model } = mongoose

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function (value) {
                // Basic email format validation
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(value);
            },
            message: props => `${props.value} is not a valid email address!`
        }
    },
    password: {
        type: String,
        required: true,
    }
}) 

const UserModel = model('User', UserSchema)

module.exports = UserModel