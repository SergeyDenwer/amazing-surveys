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

  async getOrCreateUserFromTelegram(ctx): Promise<User> {
    //let user = await this.findByTelegramID(ctx.from.id);
    const queryBuilder = this.userRepository.createQueryBuilder('user')
        .where('user.telegram_id = :telegram_id', { telegram_id: ctx.from.id });

    console.log('SQL:', queryBuilder.getSql());
    let user = await queryBuilder.getOne();
    if (!user) {
      try {
        const createUserDto: CreateUserDto = {
          telegram_id: ctx.from.id,
          chat_id: ctx.chat.id,
          is_bot: ctx.from.is_bot,
          language_code: ctx.from.language_code
        };
        user = this.userRepository.create(createUserDto);
        await this.userRepository.save(user);
      } catch (error) {
        console.error(error)
      }
    }

    return user;
  }
}
