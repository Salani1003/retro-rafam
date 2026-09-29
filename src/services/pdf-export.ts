import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { COLUMN_CONFIG, COLUMN_ORDER, type Comment, type Participant, type Retrospective } from '@/types/domain'
import { formatFullDate, slugifyForFilename } from '@/lib/utils'

const APP_NAME = 'Retro'
const MARGIN = 14

function hexFromCssVar(cssVar: string): [number, number, number] {
  const table: Record<string, [number, number, number]> = {
    'var(--column-good)': [63, 125, 82],
    'var(--column-okay)': [168, 121, 31],
    'var(--column-fix)': [182, 85, 58],
    'var(--column-action)': [59, 110, 168],
  }
  return table[cssVar] ?? [50, 50, 50]
}

export function exportRetrospectiveToPdf(
  retrospective: Retrospective,
  comments: Comment[],
  participants: Participant[]
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  const title = retrospective.title?.trim() || 'Retrospectiva de equipo'
  const teamName = retrospective.teamName?.trim() || 'Sin equipo asignado'

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(33, 31, 29)
  doc.text(title, MARGIN, 20)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(90, 88, 84)
  doc.text(`Equipo: ${teamName}`, MARGIN, 28)

  doc.setFontSize(9.5)
  doc.text(`Código de sala: ${retrospective.roomCode}`, MARGIN, 34)
  doc.text(`Creada: ${formatFullDate(retrospective.createdAt)}`, MARGIN, 39)
  doc.text(
    `Finalizada: ${retrospective.closedAt ? formatFullDate(retrospective.closedAt) : 'Retrospectiva en curso'}`,
    MARGIN,
    44
  )

  const participantNames = participants.map((p) => p.displayName).join(', ') || 'Sin participantes registrados'
  const participantLines = doc.splitTextToSize(`Participantes: ${participantNames}`, pageWidth - MARGIN * 2)
  doc.text(participantLines, MARGIN, 49)

  let cursorY = 49 + participantLines.length * 4.5 + 4
  doc.setDrawColor(228, 227, 223)
  doc.line(MARGIN, cursorY, pageWidth - MARGIN, cursorY)
  cursorY += 8

  for (const columnType of COLUMN_ORDER) {
    const config = COLUMN_CONFIG[columnType]
    const columnComments = comments.filter((c) => c.columnType === columnType)
    const [r, g, b] = hexFromCssVar(config.colorVar)

    if (cursorY > 265) {
      doc.addPage()
      cursorY = 20
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(r, g, b)
    doc.text(`${config.title} (${columnComments.length})`, MARGIN, cursorY)
    cursorY += 6

    if (columnComments.length === 0) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9.5)
      doc.setTextColor(140, 138, 133)
      doc.text('Sin comentarios en esta columna.', MARGIN, cursorY)
      cursorY += 10
      continue
    }

    const body = columnComments.map((comment) => {
      const base = [
        comment.content,
        comment.authorName,
        formatFullDate(comment.createdAt),
      ]
      if (columnType === 'action') {
        return [...base, comment.assignee || '—']
      }
      return [
        ...base,
        String(comment.reactionCount),
        comment.reactorNames.join(', ') || '—',
      ]
    })

    const head =
      columnType === 'action'
        ? [['Comentario', 'Autor', 'Fecha', 'Responsable']]
        : [['Comentario', 'Autor', 'Fecha', '👍', 'Reaccionaron']]

    autoTable(doc, {
      startY: cursorY,
      margin: { left: MARGIN, right: MARGIN },
      head,
      body,
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 2.5,
        textColor: [33, 31, 29],
        lineColor: [228, 227, 223],
        lineWidth: 0.1,
        valign: 'top',
      },
      headStyles: { fillColor: [r, g, b], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 248] },
      columnStyles:
        columnType === 'action'
          ? { 0: { cellWidth: 90 }, 1: { cellWidth: 30 }, 2: { cellWidth: 34 }, 3: { cellWidth: 28 } }
          : {
              0: { cellWidth: 74 },
              1: { cellWidth: 26 },
              2: { cellWidth: 30 },
              3: { cellWidth: 10 },
              4: { cellWidth: 42 },
            },
    })

    // @ts-expect-error jspdf-autotable adds this at runtime
    cursorY = doc.lastAutoTable.finalY + 10
  }

  drawFooter(doc)

  const filename = `retrospectiva-${slugifyForFilename(teamName)}-${slugifyForFilename(
    new Date().toISOString().slice(0, 10)
  )}.pdf`
  doc.save(filename)
}

function drawFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(150, 148, 143)
    doc.text(
      `${APP_NAME} · Generado el ${formatFullDate(new Date().toISOString())}`,
      MARGIN,
      pageHeight - 8
    )
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - MARGIN, pageHeight - 8, { align: 'right' })
  }
}
