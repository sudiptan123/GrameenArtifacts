const UserModel = require('../models/user');
const AdminModel = require('../models/admin');

async function login(payload) {
    try {
        let user = await UserModel.findOne({ 'email': payload.email,
        'password': payload.password });
        if (!user) {
            user = await AdminModel.findOne({ 'email': payload.email,
            'password': payload.password });
        }

        if (user) {
            console.log('Here');
            return { status: 200, message: 'Logged In Successfully!', data: user };
        } else {
            return { status: 400, message: 'Incorrect Credentials', data: null };
        }
    } catch(err) {
        console.log('Login User => ', err);
    }
};

module.exports = login;