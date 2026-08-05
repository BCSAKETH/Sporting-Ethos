import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { ConsultationReport, PatientBill } from "../services/records.service";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const CSS = `<style>
  body{font-family:-apple-system,Roboto,'Segoe UI',sans-serif;padding:28px;color:#0f172a}
  h1{color:#047857;margin:0 0 4px}
  .muted{color:#64748b;font-size:13px}
  h3{margin:18px 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8}
  ul{margin:0;padding-left:18px}li{margin:3px 0}
  table{width:100%;border-collapse:collapse;font-size:14px}
  td{padding:6px 0;border-bottom:1px solid #eef2f7}
  .tot td{border-top:2px solid #0f172a;border-bottom:none;font-weight:800;padding-top:8px}
  .brand{margin-top:26px;font-size:11px;color:#94a3b8}
</style>`;

async function shareHtml(html: string, filename: string) {
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: filename, UTI: "com.adobe.pdf" });
  }
}

export async function exportReportPdf(r: ConsultationReport, patientName: string) {
  const meds =
    r.medications.map(
      (m) =>
        `<li><b>${m.medicine_name}</b> — ${m.dosage}×${m.frequency}/day×${m.duration_days} days · ${m.route ?? "Oral"} · ${m.before_after_food ?? ""}${m.special_instructions ? ` · ${m.special_instructions}` : ""}</li>`,
    ).join("") || r.prescriptions.map((p) => `<li>${p}</li>`).join("") || "<li>—</li>";
  const html = `${CSS}
    <h1>Consultation Report</h1>
    <div class="muted">${patientName} · ${r.department ?? "OPD"} · ${r.date}${r.appointmentId ? ` · ${r.appointmentId}` : ""}</div>
    ${r.summary ? `<p><i>"${r.summary}"</i></p>` : ""}
    ${r.symptoms.length ? `<h3>Symptoms</h3><ul>${r.symptoms.map((s) => `<li>${s}</li>`).join("")}</ul>` : ""}
    <h3>Prescription</h3><ul>${meds}</ul>
    ${r.actions.length ? `<h3>Advice</h3><ul>${r.actions.map((a) => `<li>${a}</li>`).join("")}</ul>` : ""}
    <div class="brand">Sporting Ethos Hospital · Digital OPD Record</div>`;
  await shareHtml(html, `Report-${r.date}`);
}

export async function exportBillPdf(b: PatientBill, patientName: string) {
  const items = b.items
    .map((i) => `<tr><td>${i.name}${i.qty > 1 ? ` × ${i.qty}` : ""}${i.instruction ? `<br><span class="muted">${i.instruction}</span>` : ""}</td><td style="text-align:right">${inr(i.price * i.qty)}</td></tr>`)
    .join("");
  const html = `${CSS}
    <h1>Pharmacy Bill</h1>
    <div class="muted">${patientName} · ${b.billNo} · ${b.department ?? "Pharmacy"} · ${b.date}</div>
    <h3>Items</h3>
    <table>${items}<tr class="tot"><td>Total</td><td style="text-align:right">${inr(b.total)}</td></tr></table>
    <p class="muted">Status: ${b.status}</p>
    <div class="brand">Sporting Ethos Hospital · Pharmacy e-Bill</div>`;
  await shareHtml(html, `Bill-${b.billNo}`);
}
