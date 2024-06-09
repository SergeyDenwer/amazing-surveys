//feedback.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from './entities/feedback.entity';
import { User } from '../users/entities/user.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createFeedbackDto: CreateFeedbackDto): Promise<Feedback> {
    const user = await this.userRepository.findOne({ where: { id: createFeedbackDto.user_id } });
    if (!user) {
      throw new Error('User not found');
    }

    const feedback = this.feedbackRepository.create({
      user: user,
      text: createFeedbackDto.text
    });
    return this.feedbackRepository.save(feedback);
  }
}
