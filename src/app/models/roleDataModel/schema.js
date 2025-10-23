import { Schema, model, models } from 'mongoose';

const roleSchema = new Schema({
    roleName: {           // admin or manager or employee
        type: String,
        required: true
    },
    menuId: {             
        type: String,
        required: true
    },
    isVerified: {
        type: Boolean,
        required: [true, 'isVerified Parameter is Missing - Boolean']
    }
}, { timestamps: true });

const roleDataModel = models.role || model('role', roleSchema);

export default roleDataModel;