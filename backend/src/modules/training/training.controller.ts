import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
} from '@nestjs/common';
import { TrainingService, CreateCourseDto } from './training.service';

@Controller('training')
export class TrainingController {
    constructor(private readonly trainingService: TrainingService) { }

    // 課程管理
    @Post('courses')
    async createCourse(@Body() dto: CreateCourseDto) {
        const course = await this.trainingService.createCourse(dto);
        return {
            success: true,
            message: '課程已建立',
            data: course,
        };
    }

    @Get('courses')
    async getAllCourses() {
        const courses = await this.trainingService.getAllCourses();
        return {
            success: true,
            data: courses,
            count: courses.length,
        };
    }

    @Get('courses/required')
    async getRequiredCourses() {
        const courses = await this.trainingService.getRequiredCourses();
        return {
            success: true,
            data: courses,
            count: courses.length,
        };
    }

    @Get('courses/:id')
    async getCourseById(@Param('id') id: string) {
        const course = await this.trainingService.getCourseById(id);
        return {
            success: true,
            data: course,
        };
    }

    // 志工培訓
    @Post('enroll')
    async enrollVolunteer(
        @Body('volunteerId') volunteerId: string,
        @Body('courseId') courseId: string,
    ) {
        const training = await this.trainingService.enrollVolunteer(volunteerId, courseId);
        return {
            success: true,
            message: '已報名課程',
            data: training,
        };
    }

    @Patch('start')
    async startCourse(
        @Body('volunteerId') volunteerId: string,
        @Body('courseId') courseId: string,
    ) {
        const training = await this.trainingService.startCourse(volunteerId, courseId);
        return {
            success: true,
            message: '開始學習',
            data: training,
        };
    }

    @Patch('progress')
    async updateProgress(
        @Body('volunteerId') volunteerId: string,
        @Body('courseId') courseId: string,
        @Body('progress') progress: number,
    ) {
        const training = await this.trainingService.updateProgress(volunteerId, courseId, progress);
        return {
            success: true,
            message: training.status === 'completed' ? '恭喜完成課程！' : '進度已更新',
            data: training,
        };
    }

    @Get('volunteer/:volunteerId')
    async getVolunteerTraining(@Param('volunteerId') volunteerId: string) {
        const trainings = await this.trainingService.getVolunteerTraining(volunteerId);
        return {
            success: true,
            data: trainings,
            count: trainings.length,
        };
    }

    @Get('volunteer/:volunteerId/stats')
    async getVolunteerStats(@Param('volunteerId') volunteerId: string) {
        const stats = await this.trainingService.getVolunteerStats(volunteerId);
        return {
            success: true,
            data: stats,
        };
    }

    @Get('stats')
    async getCourseStats() {
        const stats = await this.trainingService.getCourseStats();
        return {
            success: true,
            data: stats,
        };
    }
}
