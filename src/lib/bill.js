// Pharmacy bill / invoice PDF, tied to the appointment ID.
import { jsPDF } from 'jspdf'

export const rupees = (n) => `Rs. ${Number(n || 0).toFixed(2)}`

export function makeBillNo() {
  return `INV-${Date.now().toString().slice(-6)}`
}

export function downloadBillPDF(patient, bill) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const M = 48
  let y = M

  doc.setFillColor(6, 95, 70)
  doc.rect(0, 0, 595, 8, 'F')

  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(15, 23, 42)
  doc.text('Sporting Ethos', M, (y += 24))
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(100, 116, 139)
  doc.text('Pharmacy Bill / Invoice', M, (y += 18))

  doc.setTextColor(15, 23, 42); doc.setFontSize(11)
  const right = 595 - M
  doc.text(`Bill No: ${bill.bill_no}`, right, M + 24, { align: 'right' })
  doc.text(`Date: ${new Date(bill.paid_at || Date.now()).toLocaleString()}`, right, M + 40, { align: 'right' })

  doc.setDrawColor(226, 232, 240); doc.line(M, (y += 12), right, y)
  doc.text(`Patient: ${patient.name}`, M, (y += 24))
  doc.text(`Appointment: ${patient.appointment_id || '—'}`, M, (y += 18))

  // Table header
  y += 24
  doc.setFont('helvetica', 'bold'); doc.setTextColor(6, 95, 70)
  doc.text('Item', M, y); doc.text('Qty', 360, y, { align: 'right' })
  doc.text('Price', 440, y, { align: 'right' }); doc.text('Amount', right, y, { align: 'right' })
  doc.setDrawColor(226, 232, 240); doc.line(M, y + 6, right, y + 6)

  doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 41, 59)
  ;(bill.items || []).forEach((it) => {
    y += 22
    doc.text(String(it.name).slice(0, 44), M, y)
    doc.text(String(it.qty), 360, y, { align: 'right' })
    doc.text(rupees(it.price), 440, y, { align: 'right' })
    doc.text(rupees(it.price * it.qty), right, y, { align: 'right' })
  })

  y += 14; doc.setDrawColor(226, 232, 240); doc.line(M, y, right, y)
  y += 24; doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(15, 23, 42)
  doc.text('Total', 440, y, { align: 'right' })
  doc.text(rupees(bill.total), right, y, { align: 'right' })

  y += 26
  doc.setFillColor(16, 185, 129); doc.roundedRect(right - 70, y - 14, 70, 22, 4, 4, 'F')
  doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.text('PAID', right - 35, y + 1, { align: 'center' })

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(148, 163, 184)
  doc.text('Thank you. Sporting Ethos Pharmacy · This is a computer-generated bill.', M, 800)

  doc.save(`bill-${patient.appointment_id || 'patient'}.pdf`)
}
