import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

/**
 * 防空避難設施（Air-Raid Shelter / 防空避難處所）
 *
 * 資料來源：內政部警政署「防空避難處所」開放資料 (data.gov.tw)
 * 匯入方式：見 backend/src/scripts/import-air-raid-shelters.ts（CSV 匯入 + upsert）
 *
 * 與 `shelters` 模組（`Shelter` entity, table `shelters`）的差異：
 * - `Shelter`：長期收容所（收容/安置），由本平台人員實際開設、進駐管理，
 *   有進駐人數登記、健康篩檢、每日回報等操作性資料。
 * - `AirRaidShelter`：政府公告的「防空避難處所」，供空襲/飛彈警報時
 *   「短時間掩蔽」使用（多為地下室、地下停車場、防空避難室等），
 *   資料完全來自政府開放資料匯入，本平台不對其進駐狀態進行管理。
 *
 * 兩者刻意使用不同的 entity/table，避免混用不同性質的避難設施資料。
 */
@Entity('air_raid_shelters')
@Index(['latitude', 'longitude'])
@Index(['city', 'district'])
export class AirRaidShelter {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /**
     * 政府開放資料原始編號（若資料集有提供，例如「編號」欄位）。
     * 用於未來比對資料源異動；目前 upsert 去重仍以 `address` 為準。
     */
    @Column({ nullable: true })
    sourceId: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    city: string;

    @Column({ nullable: true })
    district: string;

    /**
     * 完整地址。匯入時作為 upsert 去重鍵（同地址視為同一筆資料，更新而非新增）。
     */
    @Column({ unique: true })
    address: string;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    latitude: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    longitude: number;

    /**
     * 容納人數（依政府資料集「收容人數/避難人數」欄位）。
     */
    @Column({ type: 'int', default: 0 })
    capacity: number;

    /**
     * 地下樓層數（例如 B2 則為 2）。可為 null，表示資料未提供或非地下設施。
     */
    @Column({ type: 'int', nullable: true })
    basementLevels: number;

    /**
     * 管理單位（例如：OO里辦公處、OO大樓管理委員會）。
     */
    @Column({ nullable: true })
    managingOrg: string;

    @Column({ nullable: true })
    contactPhone: string;

    /**
     * 是否仍列於政府公告清冊中。月度匯入時若某筆舊資料未再出現於最新清冊，
     * 可由匯入流程視需要標記為 false，而非直接刪除（保留歷史紀錄）。
     */
    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    /**
     * 座標是否為匯入時自動地理編碼取得（而非政府資料原始提供）。
     * 供前端/維運判斷座標可信度。
     */
    @Column({ type: 'boolean', default: false })
    isGeocoded: boolean;

    @Column({ type: 'timestamp', nullable: true })
    lastImportedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
