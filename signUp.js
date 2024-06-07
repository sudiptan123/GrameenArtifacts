const UserModel = require('../models/user');

async function signUp(payload) {
    try {
        const existingUser = await UserModel.findOne({ 'email': payload.email });

        if (existingUser) {
            return { status: 400, message: 'Email address already registered!', data: null };
        } else {
            const user = new UserModel(payload);
            await user.save();
            return { status: 200, message: 'User Regietered Successfully!', data: user };
        }
    } catch(err) {
        console.log('Register New User => ', err);
    }
};

module.exports = signUp;