import { Schema, model, models } from 'mongoose';

const MenuSchema = new Schema({
  menu  : {
    type: String,
    required: true,
  },
  subMenu: {
    type: [String], 
    required: false
  }
}, { _id: false });

const MenusSchema = new Schema({
  menus: [MenuSchema]
}, { timestamps: true });

const MenusModel = models.Menus || model('Menus', MenusSchema);

export default MenusModel;
