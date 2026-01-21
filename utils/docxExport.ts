
import { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType } from 'docx';
import { Finding } from '../types';

/**
 * 将 5-Whys 链条绘制到 Canvas 并返回 Base64 图片数据
 */
async function renderWhysToCanvas(whys: string[]): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const width = 800;
    const padding = 20;
    const boxWidth = 600;
    const boxMinHeight = 60;
    const verticalGap = 40;
    
    // 预计算高度
    ctx.font = '14px sans-serif';
    let totalHeight = padding * 2;
    const boxHeights = whys.map(text => {
        const lines = wrapText(ctx, text, boxWidth - 40);
        const h = Math.max(boxMinHeight, lines.length * 20 + 30);
        totalHeight += h + verticalGap;
        return h;
    });
    totalHeight -= verticalGap; // 最后一项后不加间距

    canvas.width = width;
    canvas.height = totalHeight;

    // 背景色
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let currentY = padding;
    const centerX = width / 2;

    whys.forEach((text, i) => {
        const boxH = boxHeights[i];
        const isRoot = i === whys.length - 1;

        // 绘制阴影
        ctx.shadowColor = 'rgba(0,0,0,0.05)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;

        // 绘制盒子
        ctx.fillStyle = isRoot ? '#2563eb' : '#ffffff';
        ctx.strokeStyle = isRoot ? '#1e40af' : '#e2e8f0';
        ctx.lineWidth = 2;
        roundRect(ctx, centerX - boxWidth/2, currentY, boxWidth, boxH, 10, true, true);
        
        ctx.shadowColor = 'transparent'; // 重置阴影

        // 绘制编号
        ctx.fillStyle = isRoot ? 'rgba(255,255,255,0.2)' : '#f1f5f9';
        roundRect(ctx, centerX - boxWidth/2 + 10, currentY + 10, 24, 20, 4, true, false);
        ctx.fillStyle = isRoot ? '#ffffff' : '#94a3b8';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText((i + 1).toString(), centerX - boxWidth/2 + 22, currentY + 24);

        // 绘制文字
        ctx.fillStyle = isRoot ? '#ffffff' : '#334155';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'left';
        const lines = wrapText(ctx, text, boxWidth - 60);
        lines.forEach((line, lineIdx) => {
            ctx.fillText(line, centerX - boxWidth/2 + 45, currentY + 25 + lineIdx * 20);
        });

        // 绘制标签
        if (i === 0 || isRoot) {
            ctx.font = 'bold 9px sans-serif';
            ctx.fillStyle = isRoot ? '#ffffff' : '#94a3b8';
            ctx.fillText(i === 0 ? 'SYMPTOM / 现象' : 'ROOT CAUSE / 根因', centerX - boxWidth/2, currentY - 5);
        }

        // 绘制箭头
        if (i < whys.length - 1) {
            const arrowY = currentY + boxH;
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX, arrowY);
            ctx.lineTo(centerX, arrowY + verticalGap);
            ctx.stroke();

            // 箭头尖端
            ctx.beginPath();
            ctx.moveTo(centerX - 5, arrowY + verticalGap - 8);
            ctx.lineTo(centerX, arrowY + verticalGap);
            ctx.lineTo(centerX + 5, arrowY + verticalGap - 8);
            ctx.stroke();
        }

        currentY += boxH + verticalGap;
    });

    return canvas.toDataURL('image/png').split(',')[1];
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
    const words = text.split('');
    const lines = [];
    let currentLine = '';

    for (let n = 0; n < words.length; n++) {
        const testLine = currentLine + words[n];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            lines.push(currentLine);
            currentLine = words[n];
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine);
    return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: boolean, stroke: boolean) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}

const saveDocumentToFile = (doc: Document, fileName: string) => {
    Packer.toBlob(doc).then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }).catch((error) => {
        console.error("Error generating DOCX file:", error);
    });
};

export const exportToDocx = async (reportContent: string, title: string, findings: Finding[] = []) => {
    if (!reportContent) {
        console.error("No content provided for DOCX export.");
        return;
    }

    const sections = [];
    const mainLines = reportContent.split('\n');
    
    // 基础文字内容
    const children: any[] = mainLines.map(line => 
        new Paragraph({
            children: [new TextRun(line)],
            spacing: { after: 120 },
        })
    );

    // 如果有审计发现且包含因果分析，在文档末尾追加图表附件
    if (findings.length > 0) {
        children.push(new Paragraph({
            children: [new TextRun({ text: "\n附件：审计发现根本原因分析图", bold: true, size: 28 })],
            spacing: { before: 400, after: 200 },
            alignment: AlignmentType.CENTER,
        }));

        for (const finding of findings) {
            const whys = finding.aiAnalysis['5WhysChain'];
            if (whys && (Array.isArray(whys) ? whys.length > 0 : whys.length > 5)) {
                const chainArray = Array.isArray(whys) ? whys : whys.split('\n').filter(s => s.trim()).map(s => s.replace(/^\d+\.\s*/, ''));
                
                try {
                    const base64Data = await renderWhysToCanvas(chainArray);
                    children.push(new Paragraph({
                        children: [new TextRun({ text: `发现：${finding.condition.substring(0, 30)}...`, bold: true })],
                        spacing: { before: 200, after: 100 }
                    }));
                    children.push(new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new ImageRun({
                                data: Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)),
                                transformation: { width: 500, height: chainArray.length * 70 + 40 },
                            })
                        ],
                        spacing: { after: 200 }
                    }));
                } catch (err) {
                    console.error("Failed to render 5-Whys image for export", err);
                }
            }
        }
    }

    const doc = new Document({
        sections: [{
            properties: {},
            children: children,
        }],
    });
    
    const safeTitle = title.replace(/[<>:"/\\|?*]/g, '_');
    saveDocumentToFile(doc, `${safeTitle}.docx`);
};
