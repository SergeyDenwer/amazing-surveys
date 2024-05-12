//users.service.ts
import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  findAll() {
    return this.userRepository.find();
  }

  findOne(id: number) {
    return this.userRepository.findOne({ where: { id } });
  }

  findByTelegramID(telegram_id: number) {
    return this.userRepository.findOne({ where: { telegram_id } });
  }

  async update(user: User, updateUserDto: UpdateUserDto): Promise<User> {
    const updatedUser = Object.assign(user, updateUserDto);
    return this.userRepository.save(updatedUser);
  }

  async getOrCreateUser(createUserDto: CreateUserDto): Promise<User> {
    let user = await this.findByTelegramID(createUserDto.telegram_id);
    if (!user) {
      user = this.userRepository.create(createUserDto);
      await this.userRepository.save(user);
    }

    return user;
  }

  async updateOrCreateUser(createUserDto: CreateUserDto, updateUserDto: UpdateUserDto): Promise<User> {
    let user = await this.findByTelegramID(createUserDto.telegram_id);

    // Если пользователь не найден, создаем нового
    if (!user) {
      user = this.userRepository.create(createUserDto);
    } else {
      // Обновляем данные существующего пользователя
      user = Object.assign(user, updateUserDto);
    }

    return this.userRepository.save(user);
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
