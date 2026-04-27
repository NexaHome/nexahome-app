import { Injectable } from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { User } from '../../models/user.model';
import { CreateUserInput } from './dto/create-user.input';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User) private readonly userModel: typeof User) {}

  async findAll() {
    return await this.userModel.get();
  }

  async findOne(id: string) {
    return await this.userModel.find(id);
  }

  async findByEmail(email: string) {
    return await this.userModel.with('homes').where('email', email).first();
  }

  async create(createUserInput: CreateUserInput) {
    const user = new this.userModel();
    user.name = createUserInput.name;
    user.email = createUserInput.email;
    user.password = createUserInput.password;
    user.createdAt = new Date();
    await user.save();
    return user;
  }
}
