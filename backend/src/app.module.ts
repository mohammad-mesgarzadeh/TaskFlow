import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { LabelsController } from './modules/tasks/labels.controller';
import { LabelsService } from './modules/tasks/labels.service';
import { CommentsModule } from './modules/comments/comments.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { SprintsModule } from './modules/sprints/sprints.module';
import { SearchModule } from './modules/search/search.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({ global: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
    CommentsModule,
    ActivitiesModule,
    SprintsModule,
    SearchModule,
    NotificationsModule,
    DashboardModule,
    HealthModule,
  ],
  controllers: [LabelsController],
  providers: [LabelsService],
})
export class AppModule {}
