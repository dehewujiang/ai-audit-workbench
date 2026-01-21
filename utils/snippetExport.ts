import { KnowledgeSnippet } from '../types';

function escapeCsvCell(cell: string): string {
    if (!cell) return '""';
    
    // 1. Convert HTML line breaks to actual newlines
    let cleanedCell = cell.replace(/<br\s*\/?>/gi, '\n');
    
    // 2. Strip remaining HTML tags (like <b>, <strong>, etc.)
    cleanedCell = cleanedCell.replace(/<[^>]+>/g, '');
    
    // 3. Strip Markdown bold syntax (**)
    cleanedCell = cleanedCell.replace(/\*\*/g, '');

    // 4. Clean bullet points for consistency
    cleanedCell = cleanedCell.replace(/•\s/g, '- ');

    // 5. Standard CSV escaping: If contains quotes, commas, or newlines, wrap in quotes and escape internal quotes
    if (cleanedCell.includes('"') || cleanedCell.includes(',') || cleanedCell.includes('\n') || cleanedCell.includes('\r')) {
        const escapedCell = cleanedCell.replace(/"/g, '""');
        return `"${escapedCell}"`;
    }
    return cleanedCell;
}

function downloadCsv(content: string, filename: string) {
    const blob = new Blob(['\ufeff', content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function parseMarkdownTable(markdown: string): string[][] {
    const lines = markdown.trim().split('\n');
    if (lines.length < 3) return []; 
    // Reconstruct the full data row by joining all lines after the header and separator.
    // This handles cases where a single cell's content contains newlines.
    const dataRowLine = lines.slice(2).join('\n');
    const cells = dataRowLine.split('|').slice(1, -1).map(cell => cell.trim());
    return [cells]; // A snippet is considered a single row.
}

export const exportSnippetsToCsv = (snippets: KnowledgeSnippet[]) => {
    const groupedSnippets = snippets.reduce((acc, snippet) => {
        const type = snippet.type;
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(snippet);
        return acc;
    }, {} as Record<string, KnowledgeSnippet[]>);

    for (const type in groupedSnippets) {
        let headers: string[] = [];
        let rows: string[][] = [];
        const snippetsForType = groupedSnippets[type];

        if (['完整审计程序', '审计发现', '舞弊案例分析'].includes(type)) {
            const firstSnippetContent = snippetsForType[0]?.content;
            if (firstSnippetContent && firstSnippetContent.includes('|:---|')) {
                const headerLine = firstSnippetContent.trim().split('\n')[0];
                // Clean headers as well (remove bolding if present)
                headers = headerLine.split('|').slice(1, -1).map(h => h.trim().replace(/\*\*/g, ''));
                rows = snippetsForType.flatMap(s => parseMarkdownTable(s.content));
            } else {
                continue;
            }
        } else {
            continue; 
        }

        if (headers.length > 0 && rows.length > 0) {
            const csvRows = rows.map(row => 
                row.map(escapeCsvCell).join(',')
            );
            const csvContent = [headers.join(','), ...csvRows].join('\n');
            downloadCsv(csvContent, `${type}片段.csv`);
        }
    }
};