import type { MetadataResponse, ReportInputPayload } from "../../types/report";

interface GeneralInfoStepProps {
  formData: ReportInputPayload;
  metadata: MetadataResponse | null;
  toDateInputValue: (value?: string) => string;
  toDateTimeInputValue: (value?: string) => string;
  onGeneralInfoChange: (key: keyof ReportInputPayload["generalInfo"], value: string | number) => void;
  onGeneralDateTimeChange: (key: keyof ReportInputPayload["generalInfo"], value: string) => void;
  onAssignAppraiser: (appraiserId: string) => void;
  onTitleChange: (value: string) => void;
}

export function GeneralInfoStep({
  formData,
  metadata,
  toDateInputValue,
  toDateTimeInputValue,
  onGeneralInfoChange,
  onGeneralDateTimeChange,
  onAssignAppraiser,
  onTitleChange,
}: GeneralInfoStepProps) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-600">Judul Laporan</label>
          <input
            value={formData.title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Penilaian Agunan Rumah Tinggal"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Jenis Laporan</label>
          <input
            value={formData.generalInfo.reportType ?? ""}
            onChange={(event) => onGeneralInfoChange("reportType", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Penilaian Agunan"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Tanggal Laporan</label>
          <input
            type="date"
            value={toDateInputValue(formData.generalInfo.reportDate)}
            onChange={(event) => onGeneralInfoChange("reportDate", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Penilai Penanggung Jawab</label>
          <select
            value={formData.assignedAppraiserId}
            onChange={(event) => onAssignAppraiser(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Pilih Penilai</option>
            {metadata?.users.appraisers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Nama Penilai</label>
          <input
            value={formData.generalInfo.appraiserName ?? ""}
            onChange={(event) => onGeneralInfoChange("appraiserName", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-600">Nama Nasabah</label>
          <input
            value={formData.generalInfo.customerName}
            onChange={(event) => onGeneralInfoChange("customerName", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Plafond Permohonan (Rp)</label>
          <input
            type="number"
            value={formData.generalInfo.plafond}
            onChange={(event) => onGeneralInfoChange("plafond", Number(event.target.value))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-600">Alamat Nasabah</label>
          <textarea
            value={formData.generalInfo.customerAddress ?? ""}
            onChange={(event) => onGeneralInfoChange("customerAddress", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            rows={3}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Tujuan Kredit</label>
          <input
            value={formData.generalInfo.creditPurpose}
            onChange={(event) => onGeneralInfoChange("creditPurpose", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Modal kerja, investasi, konsumtif"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Unit Kerja Pemohon</label>
          <input
            value={formData.generalInfo.unit}
            onChange={(event) => onGeneralInfoChange("unit", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Tujuan Penilaian</label>
          <input
            value={formData.generalInfo.valuationPurpose ?? ""}
            onChange={(event) => onGeneralInfoChange("valuationPurpose", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Jenis Penilaian</label>
          <select
            value={formData.generalInfo.valuationType ?? ""}
            onChange={(event) => onGeneralInfoChange("valuationType", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Pilih jenis penilaian</option>
            <option value="Baru">Baru</option>
            <option value="Ulang">Ulang</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Pendekatan Penilaian</label>
          <input
            value={formData.generalInfo.valuationApproach ?? ""}
            onChange={(event) => onGeneralInfoChange("valuationApproach", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Nomor Memo Permohonan</label>
          <input
            value={formData.generalInfo.requestLetterNumber ?? ""}
            onChange={(event) => onGeneralInfoChange("requestLetterNumber", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Tanggal Memo Permohonan</label>
          <input
            type="date"
            value={toDateInputValue(formData.generalInfo.requestLetterDate)}
            onChange={(event) => onGeneralInfoChange("requestLetterDate", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Tanggal Terima Permohonan</label>
          <input
            type="datetime-local"
            value={toDateTimeInputValue(formData.generalInfo.requestReceivedAt)}
            onChange={(event) => onGeneralDateTimeChange("requestReceivedAt", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Tanggal Kelengkapan Dokumen</label>
          <input
            type="datetime-local"
            value={toDateTimeInputValue(formData.generalInfo.requestCompletedAt)}
            onChange={(event) => onGeneralDateTimeChange("requestCompletedAt", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Jadwal OTS</label>
          <input
            type="date"
            value={toDateInputValue(formData.generalInfo.otsSchedule)}
            onChange={(event) => onGeneralInfoChange("otsSchedule", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Tanggal Penilaian</label>
          <input
            type="date"
            value={toDateInputValue(formData.generalInfo.appraisalDate)}
            onChange={(event) => onGeneralInfoChange("appraisalDate", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Kontak Lapangan</label>
          <input
            value={formData.generalInfo.fieldContactName ?? ""}
            onChange={(event) => onGeneralInfoChange("fieldContactName", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Nama narahubung lapangan"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Hubungan Kontak</label>
          <input
            value={formData.generalInfo.fieldContactRelation ?? ""}
            onChange={(event) => onGeneralInfoChange("fieldContactRelation", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Pemilik, keluarga, tetangga, dll."
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Nomor Kontak</label>
          <input
            value={formData.generalInfo.fieldContactPhone ?? ""}
            onChange={(event) => onGeneralInfoChange("fieldContactPhone", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="0812xxxxxxx"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Supervisor Reviewer</label>
          <select
            value={formData.generalInfo.reviewerId || ""}
            onChange={(event) => {
              const nextId = event.target.value;
              onGeneralInfoChange("reviewerId", nextId);
              const selected = metadata?.users.supervisors.find((user) => user.id === nextId);
              onGeneralInfoChange("supervisorName", selected?.fullName ?? "");
            }}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Pilih Supervisor</option>
            {metadata?.users.supervisors.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Nama Supervisor</label>
          <input
            value={formData.generalInfo.supervisorName ?? ""}
            onChange={(event) => onGeneralInfoChange("supervisorName", event.target.value)}
            placeholder="Tuliskan nama supervisor"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="mt-1 text-xs text-slate-500">
            Nama akan ditampilkan pada laporan dan dapat disesuaikan bila berbeda dengan daftar pengguna.
          </p>
        </div>
      </div>
    </div>
  );
}
