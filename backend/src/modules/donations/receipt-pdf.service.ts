import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Receipt } from './receipt.entity';

@Injectable()
export class ReceiptPdfService {
    private readonly logger = new Logger(ReceiptPdfService.name);

    /**
     * 產生捐款收據 PDF
     * @param receipt 收據資料
     * @param orgName 組織名稱
     * @returns PDF Buffer
     */
    async generateReceiptPdf(receipt: Receipt, orgName = '社團法人守護者聯盟協會'): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                const chunks: Buffer[] = [];
                const doc = new PDFDocument({
                    size: 'A4',
                    margin: 50,
                    info: {
                        Title: `捐款收據 ${receipt.receiptNo}`,
                        Author: orgName,
                    },
                });

                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // 標題
                doc.fontSize(24)
                    .text(orgName, { align: 'center' })
                    .moveDown(0.5);

                doc.fontSize(20)
                    .text('捐款收據', { align: 'center' })
                    .moveDown(1);

                // 收據編號
                doc.fontSize(14)
                    .text(`收據編號: ${receipt.receiptNo}`, { align: 'right' })
                    .moveDown(1);

                // 分隔線
                doc.moveTo(50, doc.y)
                    .lineTo(545, doc.y)
                    .stroke()
                    .moveDown(1);

                // 收據內容
                const startY = doc.y;
                const leftCol = 50;
                const rightCol = 200;
                const lineHeight = 25;

                // 捐款人資訊
                doc.fontSize(12);

                doc.text('捐款人姓名:', leftCol, startY);
                doc.text(receipt.donorName, rightCol, startY);

                doc.text('身分證/統編:', leftCol, startY + lineHeight);
                doc.text(receipt.donorIdentity || '-', rightCol, startY + lineHeight);

                doc.text('捐款金額:', leftCol, startY + lineHeight * 2);
                doc.fontSize(16)
                    .text(`NT$ ${receipt.amount.toLocaleString()}`, rightCol, startY + lineHeight * 2 - 2);

                doc.fontSize(12)
                    .text('捐款用途:', leftCol, startY + lineHeight * 3);
                doc.text(receipt.purpose || '公益用途', rightCol, startY + lineHeight * 3);

                doc.text('收據日期:', leftCol, startY + lineHeight * 4);
                doc.text(this.formatDate(receipt.issuedAt), rightCol, startY + lineHeight * 4);

                // 分隔線
                doc.moveTo(50, startY + lineHeight * 5 + 20)
                    .lineTo(545, startY + lineHeight * 5 + 20)
                    .stroke();

                // 備註
                doc.moveDown(3);
                doc.fontSize(10)
                    .fillColor('#666666')
                    .text('本收據可作為綜合所得稅申報之捐贈列舉扣除憑證。', { align: 'center' })
                    .moveDown(0.5)
                    .text('依所得稅法第17條規定，對教育、文化、公益、慈善機構或團體之捐贈，', { align: 'center' })
                    .text('得於綜合所得總額百分之二十之範圍內減除。', { align: 'center' });

                // 組織資訊 (頁尾)
                doc.moveDown(2);
                doc.fillColor('#333333');
                doc.fontSize(10)
                    .text('---', { align: 'center' })
                    .moveDown(0.5)
                    .text(`${orgName}`, { align: 'center' })
                    .text('網站: https://lightkeepers.ngo', { align: 'center' })
                    .text('電子郵件: contact@lightkeepers.ngo', { align: 'center' });

                doc.end();
                this.logger.log(`📄 PDF 收據產生: ${receipt.receiptNo}`);
            } catch (error) {
                this.logger.error(`PDF 產生失敗: ${error.message}`);
                reject(error);
            }
        });
    }

    private formatDate(date: Date | string): string {
        const d = new Date(date);
        return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
    }
}
