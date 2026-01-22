
import { AuditProgram } from '../types';

function escapeCsvCell(cell: string): string {
    if (cell.includes('"') || cell.includes(',') || cell.includes('\n') || cell.includes('\r')) {
        const escapedCell = cell.replace(/"/g, '""');
        return `"${escapedCell}"`;
    }
    return cell;
}

export const exportToCsv = (program: AuditProgram) => {
    const headers = ['风险', '控制', '测试步骤'];
    
    const rows = program.procedures.map(proc => [
        escapeCsvCell(proc.risk),
        escapeCsvCell(proc.control),
        escapeCsvCell(proc.testStep)
    ].join(','));

    const csvContent = [
        headers.join(','),
        ...rows
    ].join('\n');

    const blob = new Blob(['\ufeff', csvContent], {
        type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `审计程序-${program.objective}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};