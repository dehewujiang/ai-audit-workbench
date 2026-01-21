import { diffArrays, diffWordsWithSpace } from 'diff';
import { AuditProgram, AuditProcedure, FieldDiff, DiffResult } from '../types';

function generateHtmlDiff(oldText: string, newText: string): string {
  const changes = diffWordsWithSpace(oldText, newText);
  return changes.map(part => {
    const value = part.value.replace(/\n/g, '<br>');
    if (part.added) {
      return `<ins>${value}</ins>`;
    }
    if (part.removed) {
      return `<del>${value}</del>`;
    }
    return `<span>${value}</span>`;
  }).join('');
}

export const compareAuditPrograms = (programA: AuditProgram, programB: AuditProgram): DiffResult[] => {
  if (!programA || !programB) return [];

  // Custom comparator for procedures, a simple content check.
  const comparator = (procA: AuditProcedure, procB: AuditProcedure) => {
    return procA.risk === procB.risk && procA.control === procB.control && procA.testStep === procB.testStep;
  };

  const procedureDiffs = diffArrays(programA.procedures, programB.procedures, { comparator });

  const results: DiffResult[] = [];
  let oldIndex = 0;
  let newIndex = 0;

  for (const part of procedureDiffs) {
    if (part.added) {
      part.value.forEach(proc => {
        results.push({
          type: 'added',
          newIndex: newIndex,
          newProcedure: proc,
        });
        newIndex++;
      });
    } else if (part.removed) {
      part.value.forEach(proc => {
        results.push({
          type: 'deleted',
          oldIndex: oldIndex,
          oldProcedure: proc,
        });
        oldIndex++;
      });
    } else { // Unchanged
      part.value.forEach(proc => {
        results.push({
          type: 'unchanged',
          oldIndex: oldIndex,
          newIndex: newIndex,
          oldProcedure: proc,
          newProcedure: proc,
        });
        oldIndex++;
        newIndex++;
      });
    }
  }

  // Heuristic to detect modifications: a deletion followed by an addition.
  const finalResults: DiffResult[] = [];
  let i = 0;
  while (i < results.length) {
    if (i + 1 < results.length && results[i].type === 'deleted' && results[i + 1].type === 'added') {
      const oldProc = results[i].oldProcedure!;
      const newProc = results[i + 1].newProcedure!;

      finalResults.push({
        type: 'modified',
        oldIndex: results[i].oldIndex,
        newIndex: results[i + 1].newIndex,
        oldProcedure: oldProc,
        newProcedure: newProc,
        fieldDiffs: {
          risk: generateHtmlDiff(oldProc.risk, newProc.risk),
          control: generateHtmlDiff(oldProc.control, newProc.control),
          testStep: generateHtmlDiff(oldProc.testStep, newProc.testStep),
        },
      });
      i += 2;
    } else {
      finalResults.push(results[i]);
      i += 1;
    }
  }
  
  return finalResults;
};
