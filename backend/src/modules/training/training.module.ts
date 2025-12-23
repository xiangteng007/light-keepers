import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingCourse } from './training-courses.entity';
import { VolunteerTraining } from './volunteer-training.entity';
import { ScrapingSource } from './scraping-source.entity';
import { ScrapedCourse } from './scraped-course.entity';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';
import { CourseScraperController } from './course-scraper.controller';
import { CourseScraperService } from './course-scraper.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            TrainingCourse,
            VolunteerTraining,
            ScrapingSource,  // 🕷️ 爬蟲來源
            ScrapedCourse,   // 🕷️ 已爬取課程
        ]),
    ],
    controllers: [TrainingController, CourseScraperController],
    providers: [TrainingService, CourseScraperService],
    exports: [TrainingService, CourseScraperService],
})
export class TrainingModule { }

