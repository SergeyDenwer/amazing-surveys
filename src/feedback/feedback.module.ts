//feedback.module.ts
import {Feedback} from "./entities/feedback.entity";
import {FeedbackService} from "./feedback.service";
import {UsersService} from "../users/users.service";
import {User} from "../users/entities/user.entity";
import {Module} from "@nestjs/common";
import {TypeOrmModule} from "@nestjs/typeorm";

@Module({
  imports: [TypeOrmModule.forFeature([Feedback, User])],
  providers: [FeedbackService, UsersService],
  exports: [FeedbackService]
})
export class FeedbackModule {}
