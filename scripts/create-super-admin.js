const mongoose = require('mongoose');
const Staff = require('../model/staff');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const dbUrl = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/rms";

async function createSuperAdmin() {
    try {
        await mongoose.connect(dbUrl);
        console.log('Connected to database');

        const email = process.env.SUPER_ADMIN_EMAIL; // 'superadmin@example.com';
        const password = process.env.SUPER_ADMIN_PSWRD; //'Password123!';

        const existing = await Staff.findOne({ email });
        if (existing) {
            console.log('Super admin already exists with email:', email);
            process.exit(0);
        }

        const superAdmin = new Staff({
            name: 'System Super Admin',
            email: email,
            role: 'super-admin',
            username: email // passport-local-mongoose uses username field, which is mapped to email in our schema plugin config
        });

        // passport-local-mongoose register method
        await Staff.register(superAdmin, password);
        console.log('Super admin created successfully!');
        console.log('Email:', email);
        console.log('Password:', password);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

createSuperAdmin();
