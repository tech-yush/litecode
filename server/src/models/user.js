const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Room = require('../models/room')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        unique: true,
        trim: true,
        required: true,
        lowercase: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error('Invalid Email')
            }
            // if (!value.endsWith(".bits-pilani.ac.in")) {
            //     throw new Error('The email is not associated with BITS')
            // }
        }
    },
    phoneNo: {
        type: String,
        required: true,
        validate(value) {
            if (!validator.isMobilePhone(value, ['en-IN'])) {
                throw new Error('Invalid Mobile')
            }
        }
    },
    username: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    password: {
        type: String,
        trim: true,
        required: true,
        minLength: 8
    },
    bio: {
        type: String,
        trim: true
    },
    yearOfStudy: {
        type: String,
        required: true
    },
    avatar: {
        type: Buffer
    },
    inRoom: {
        type: Boolean,
        required: true,
        default: false
    },
    roomID: {
        type: String,
        required: true,
        default: "nil"
    },
    tokens: [{
        token: {
            type: String,
            require: true
        }
    }]
})

userSchema.methods.generateAuthToken = async function () {
    const token = jwt.sign({ _id: this._id.toString() }, process.env.JWT_SECRET)
    this.tokens = this.tokens.concat({ token })
    await this.save()
    return token
}

userSchema.methods.toJSON = function () {
    const userObject = this.toObject()
    delete userObject.password
    delete userObject.tokens
    delete userObject.avatar
    delete userObject.__v
    return userObject
}

userSchema.statics.findByCredentials = async (username, password) => {
    const user = await User.findOne({ username })
    if (!user) throw new Error('Invalid Credentials')
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) throw new Error('Invalid Credentials')
    return user
}

userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 8)
    }
    next()
})

userSchema.pre('remove', async function (next) {
    if (this.inRoom) {
        roomID = this.roomID
        const room = await Room.findOne({ roomID })

        room.usersInRoom--
        room.roomFull = false

        room.users = room.users.filter((user) => {
            return !user.userID.equals(this._id)//If the id isn't equal, it stays in the array.
        })

        if (room.roomAdmin.equals(this._id)) {
            if (room.usersInRoom) {
                room.roomAdmin = room.users[0].userID
            }
            else {
                room.roomAdmin = null
            }
        }

        await room.save()
    }
    next()
})

const User = mongoose.model('User', userSchema)

module.exports = User