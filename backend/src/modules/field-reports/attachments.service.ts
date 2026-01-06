import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportAttachment } from './entities';
import { InitiateUploadDto, CompleteUploadDto, PhotoEvidenceQueryDto } from './dto';
import { GcsStorageService } from './gcs-storage.service';

@Injectable()
export class AttachmentsService {
    constructor(
        @InjectRepository(ReportAttachment)
        private attachmentRepo: Repository<ReportAttachment>,
        private gcsStorage: GcsStorageService,
    ) { }

    async initiate(reportId: string, missionSessionId: string, dto: InitiateUploadDto): Promise<{
        attachmentId: string;
        uploadUrl: string;
        uploadMethod: string;
        expiresAt: string;
    }> {
        // Build insert values
        const insertValues: any = {
            reportId,
            missionSessionId,
            kind: dto.kind,
            mime: dto.mime,
            size: dto.size,
            sha256: dto.sha256 || null,
            originalFilename: dto.originalFilename || null,
            capturedAt: dto.capturedAt ? new Date(dto.capturedAt) : null,
            locationSource: dto.locationSource,
            showOnMap: dto.showOnMap ?? false,
            exifJson: dto.exifJson || null,
            uploadStatus: 'pending',
        };

        // Add photo geometry if provided
        if (dto.photoLatitude !== undefined && dto.photoLongitude !== undefined) {
            insertValues.photoGeom = () => `ST_SetSRID(ST_Point(${dto.photoLongitude}, ${dto.photoLatitude}), 4326)`;
            insertValues.photoAccuracyM = dto.photoAccuracyM;
        }

        // Use query builder for PostGIS geometry
        const result = await this.attachmentRepo
            .createQueryBuilder()
            .insert()
            .into(ReportAttachment)
            .values(insertValues)
            .returning('id')
            .execute();

        const attachmentId = result.generatedMaps[0].id;

        // Generate GCS signed URL
        const signedUrl = await this.gcsStorage.generateUploadUrl(
            missionSessionId,
            reportId,
            attachmentId,
            dto.mime,
        );

        // Update with GCS path
        await this.attachmentRepo.update(attachmentId, {
            gcsPath: signedUrl.path,
            uploadStatus: 'uploading' as any
        });

        return {
            attachmentId,
            uploadUrl: signedUrl.url,
            uploadMethod: signedUrl.method,
            expiresAt: signedUrl.expiresAt.toISOString(),
        };
    }

    async complete(attachmentId: string, dto: CompleteUploadDto): Promise<ReportAttachment> {
        const attachment = await this.attachmentRepo.findOne({ where: { id: attachmentId } });
        if (!attachment) throw new Error('Attachment not found');

        attachment.uploadStatus = dto.success ? 'uploaded' : 'failed';
        if (dto.finalSize) attachment.size = dto.finalSize;
        if (dto.sha256) attachment.sha256 = dto.sha256;

        // TODO: Generate thumbnail for photos
        // attachment.thumbnailPath = ...

        return this.attachmentRepo.save(attachment);
    }

    async findPhotoEvidence(missionSessionId: string, query: PhotoEvidenceQueryDto): Promise<any> {
        const qb = this.attachmentRepo.createQueryBuilder('a')
            .where('a.mission_session_id = :missionSessionId', { missionSessionId })
            .andWhere('a.show_on_map = true')
            .andWhere('a.photo_geom IS NOT NULL')
            .andWhere('a.upload_status = :status', { status: 'uploaded' });

        if (query.bbox) {
            const [minLng, minLat, maxLng, maxLat] = query.bbox.split(',').map(Number);
            qb.andWhere(`ST_Intersects(a.photo_geom, ST_MakeEnvelope(:minLng, :minLat, :maxLng, :maxLat, 4326))`, {
                minLng, minLat, maxLng, maxLat,
            });
        }

        const limit = query.limit ?? 500;
        qb.orderBy('a.created_at', 'DESC').take(limit);

        const results = await qb.getMany();

        // Convert to GeoJSON FeatureCollection
        return {
            type: 'FeatureCollection',
            features: results.map(a => ({
                type: 'Feature',
                geometry: a.photoGeom,
                properties: {
                    attachmentId: a.id,
                    reportId: a.reportId,
                    thumbnailUrl: a.thumbnailPath ? `https://storage.googleapis.com/lightkeepers-uploads/${a.thumbnailPath}` : null,
                    capturedAt: a.capturedAt?.toISOString(),
                    kind: a.kind,
                },
            })),
        };
    }
}
