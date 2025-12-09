import type { Report, ReportSignatures, ValuationComponentResult } from "../types/domain";
import { getBuildingStandard } from "../constants/buildingStandards";
import { bankBengkuluLogoDataUrl } from "./bankBengkuluLogo";

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("id-ID");

const formatCurrency = (value?: number) =>
  typeof value === "number" && !Number.isNaN(value) ? currencyFormatter.format(value) : "-";

const formatNumber = (value?: number, suffix = "") =>
  typeof value === "number" && !Number.isNaN(value) ? `${numberFormatter.format(value)}${suffix}` : "-";

const formatDate = (value?: string, withTime = false) => {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return withTime ? date.toLocaleString("id-ID") : date.toLocaleDateString("id-ID");
};

const yesNo = (value?: boolean) => (value ? "Ya" : "Tidak");

const textOrDash = (value?: string | number | null) =>
  value === undefined || value === null || value === "" ? "-" : String(value);

const batasanList = [
  "Penilai Internal tidak melaksanakan penelitian yuridis terhadap keabsahan sertifikat maupun dokumen legal lainnya.",
  "Seluruh informasi dokumen berasal dari Unit Kerja Pemohon dan dianggap sesuai dengan dokumen asli.",
  "Penilaian mengacu pada dokumen salinan dan dicocokkan dengan kondisi fisik di lapangan.",
  "Tidak dilakukan pengukuran ulang terhadap luas tanah maupun bangunan.",
  "Data pembanding diambil dari sumber yang relevan serta memiliki karakteristik lingkungan serupa.",
  "Penilai tidak memeriksa elemen struktur tersembunyi yang tidak terlihat secara fisik.",
  "Penilaian mesin/peralatan (jika ada) mengacu pada bukti pembelian yang disediakan.",
  "Penilaian kebun hanya mencakup tanah dan tanaman yang telah menghasilkan.",
  "Seluruh nilai disajikan dalam mata uang Rupiah.",
  "Dasar nilai meliputi Nilai Pasar, NJOP, Nilai Setelah Safety Margin, dan Nilai Likuidasi.",
  "Laporan sah apabila ditandatangani Penilai Internal dan Supervisor sesuai ketentuan.",
  "Penggunaan laporan di luar tujuan yang tercantum menjadi tanggung jawab pihak pengguna.",
];

type AttachmentWithInline = Report["attachments"][number] & { dataUrl?: string };

const attachmentCategoryLabels: Record<AttachmentWithInline["category"], string> = {
  photo_front: "Foto Tampak Depan",
  photo_right: "Foto Sisi Kanan",
  photo_left: "Foto Sisi Kiri",
  photo_interior: "Foto Interior",
  map: "Peta / Posisi Agunan",
  legal_doc: "Dokumen Legalitas",
  other: "Lampiran Lainnya",
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildAttachmentCaption = (attachment: AttachmentWithInline) =>
  attachmentCategoryLabels[attachment.category] ?? "Lampiran";

const renderAttachmentGallery = (attachments: AttachmentWithInline[], emptyMessage: string) => {
  const imageAttachments = attachments.filter((item) => Boolean(item.dataUrl));
  if (!imageAttachments.length) {
    return `<p class="small text-muted">${emptyMessage}</p>`;
  }

  return `
    <div class="attachment-grid">
      ${imageAttachments
      .map((attachment) => {
        const uploadedLabel = attachment.uploadedAt ? `Diunggah: ${formatDate(attachment.uploadedAt, true)}` : "";
        return `
            <figure class="attachment-figure">
              <div class="attachment-image-wrapper">
                <img src="${attachment.dataUrl}" alt="${buildAttachmentCaption(attachment)}" />
              </div>
              <figcaption class="attachment-caption">
                <div>${buildAttachmentCaption(attachment)}</div>
                <div class="small text-muted">${uploadedLabel}</div>
              </figcaption>
            </figure>
          `;
      })
      .join("")}
    </div>
  `;
};

const renderSignature = (signature?: ReportSignatures["appraiser"]) => {
  if (signature && signature.imageDataUrl && signature.imageDataUrl.startsWith("data:image")) {
    return `<img src="${signature.imageDataUrl}" style="height: 64px; object-fit: contain; margin: 5px 0;" />`;
  }
  return `<div style="height: 64px;"></div>`;
};

export function renderReportHtml(report: Report, options?: { attachments?: AttachmentWithInline[] }) {
  const general = report.generalInfo;
  const facility = report.facility ?? {};
  const attachments = (options?.attachments ?? report.attachments) as AttachmentWithInline[];
  const sortByUploadedAsc = (a: AttachmentWithInline, b: AttachmentWithInline) =>
    new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();

  const imageAttachments = attachments.filter((item) => item.dataUrl);
  const photoAttachments = imageAttachments
    .filter((item) => item.category.startsWith("photo_"))
    .sort(sortByUploadedAsc);
  const mapAttachments = imageAttachments.filter((item) => item.category === "map").sort(sortByUploadedAsc);
  const otherImageAttachments = imageAttachments.filter((item) => item.category === "other").sort(sortByUploadedAsc);

  const sketchPattern = /sketsa|tanahku|atr\s?bpn/i;
  const sketchAttachmentIds = new Set(
    [...mapAttachments, ...otherImageAttachments]
      .filter((item) => {
        const source = item.originalName || item.filename || "";
        return sketchPattern.test(source);
      })
      .map((item) => item.id),
  );

  const sketchAttachments = [...mapAttachments, ...otherImageAttachments].filter((item) =>
    sketchAttachmentIds.has(item.id),
  );

  const positionAttachments = mapAttachments.filter((item) => !sketchAttachmentIds.has(item.id));

  const collateralRows = report.collateral
    .map(
      (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${textOrDash(item.name)}</td>
        <td>${textOrDash(item.kind)}</td>
        <td>${textOrDash(item.address)}</td>
        <td>${formatNumber(item.landArea, " m<sup>2</sup>")}</td>
        <td>${formatNumber(item.buildingArea ?? undefined, " m<sup>2</sup>")}</td>
      </tr>
    `,
    )
    .join("");

  const legalDocuments = report.collateral.flatMap((item, idx) =>
    item.legalDocuments.map((doc, docIdx) => ({
      collateralIndex: idx + 1,
      ...doc,
      area: item.landArea,
    })),
  );

  const legalRows = legalDocuments
    .filter((doc) => doc.type !== "IMB")
    .map(
      (doc, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${doc.type}</td>
          <td>${textOrDash(doc.number)}</td>
          <td>${formatDate(doc.issueDate)}</td>
          <td>${doc.dueDate ? formatDate(doc.dueDate) : "-"}</td>
          <td>${formatNumber(doc.area, " m<sup>2</sup>")}</td>
          <td>${textOrDash(doc.notes)}</td>
        </tr>
      `,
    )
    .join("");

  const imbRows = legalDocuments
    .filter((doc) => doc.type === "IMB")
    .map(
      (doc, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${textOrDash(doc.number)}</td>
          <td>${formatDate(doc.issueDate)}</td>
          <td>${formatNumber(doc.area, " m<sup>2</sup>")}</td>
          <td>${textOrDash(doc.notes)}</td>
        </tr>
      `,
    )
    .join("");

  const comparablesRows = report.comparables
    .map(
      (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${formatNumber(item.landArea, " m<sup>2</sup>")}</td>
        <td>${formatCurrency(item.price)}</td>
        <td>${formatCurrency(item.pricePerSquare ?? item.price / Math.max(item.landArea, 1))}</td>
        <td>${textOrDash(item.address)}</td>
        <td>${textOrDash(item.source)}</td>
        <td>${textOrDash(item.notes)}</td>
      </tr>
    `,
    )
    .join("");

  const valuationInput: any = report.valuationInput;
  const valuationResult = report.valuationResult;

  const fallbackLandValue = Math.round(valuationInput.landArea * valuationInput.landRate);
  const fallbackBuildingValue = Math.round(valuationInput.buildingArea * valuationInput.buildingRate);
  const fallbackBuildingSafety = Math.round((fallbackBuildingValue * valuationInput.safetyMarginPercent) / 100);
  const fallbackLiquidationFactor = valuationInput.liquidationFactorPercent / 100;

  const landComponent: ValuationComponentResult =
    valuationResult.land ??
    {
      valueBeforeSafety: fallbackLandValue,
      safetyDeduction: 0,
      valueAfterSafety: fallbackLandValue,
      liquidationValue: Math.round(fallbackLandValue * fallbackLiquidationFactor),
    };

  const buildingComponent: ValuationComponentResult =
    valuationResult.building ??
    {
      valueBeforeSafety: fallbackBuildingValue,
      safetyDeduction: fallbackBuildingSafety,
      valueAfterSafety: Math.max(0, fallbackBuildingValue - fallbackBuildingSafety),
      liquidationValue: Math.round(
        Math.max(0, fallbackBuildingValue - fallbackBuildingSafety) * fallbackLiquidationFactor,
      ),
    };

  const landValue = landComponent.valueBeforeSafety;
  const buildingValue = buildingComponent.valueBeforeSafety;
  const landSafetyMarginValue = landComponent.safetyDeduction;
  const buildingSafetyMarginValue = buildingComponent.safetyDeduction;
  const landValueAfterSafety = landComponent.valueAfterSafety;
  const buildingValueAfterSafety = buildingComponent.valueAfterSafety;
  const landLiquidationValue = landComponent.liquidationValue;
  const buildingLiquidationValue = buildingComponent.liquidationValue;

  const computeAverageValue = (values: Array<number | undefined>) => {
    const filtered = values.filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0,
    );
    if (!filtered.length) {
      return undefined;
    }
    const sum = filtered.reduce((acc, value) => acc + value, 0);
    return Math.round(sum / filtered.length);
  };

  const landAverageValue =
    landComponent.averageValue ??
    computeAverageValue([
      landValue,
      valuationInput.landArea > 0 ? valuationInput.landRate * valuationInput.landArea : undefined,
      valuationInput.njopLand,
    ]);

  const buildingAverageValue =
    buildingComponent.averageValue ??
    computeAverageValue([
      buildingValue,
      valuationInput.buildingArea > 0 ? valuationInput.buildingRate * valuationInput.buildingArea : undefined,
      valuationInput.njopBuilding,
    ]);

  const buildingStandard = getBuildingStandard(valuationInput.buildingStandardCode);
  const buildingSpecificationList = buildingStandard
    ? buildingStandard.specification.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "";
  const totalSafetyMarginValue = landSafetyMarginValue + buildingSafetyMarginValue;
  const marketValueBeforeSafety =
    valuationResult.marketValueBeforeSafety ?? landValue + buildingValue;
  const collateralValueAfterSafety = landValueAfterSafety + buildingValueAfterSafety;
  const liquidationValue = landLiquidationValue + buildingLiquidationValue;
  const totalAverageValue = (() => {
    const values = [landAverageValue, buildingAverageValue].filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value),
    );
    if (!values.length) {
      return undefined;
    }
    return values.reduce((acc, value) => acc + value, 0);
  })();

  const environment = report.environment;

  const checklistItems: Array<{ label: string; value: boolean | undefined }> = [
    { label: "IMB", value: environment.hasImb },
    { label: "PBB Tahun Terakhir", value: environment.hasPbb },
    { label: "Terdapat akses jalan masuk", value: environment.hasAccessRoad },
    { label: "Terdapat rambu/info sengketa", value: environment.hasDisputeNotice },
    { label: "Wilayah lokasi rawan banjir", value: environment.floodProne },
    { label: "Objek di atas tanah wakaf/sosial", value: environment.onWaqfLand },
    { label: "Di bawah jaringan SUTET", value: environment.sutet },
    { label: "Berdekatan (<100 m) dari TPU", value: environment.nearCemetery },
    { label: "Berdekatan (<100 m) dari TPA/Sampah", value: environment.nearWasteFacility },
    { label: "Berada di atas jalur hijau", value: environment.onGreenBelt },
    { label: "Jalan masuk dapat dilalui mobil", value: environment.carAccessible },
  ];

  return `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Laporan Penilaian Agunan ${textOrDash(general.reportNumber)}</title>
        <style>
          @page { margin: 28px 32px; font-family: 'Arial', sans-serif; }
          body { font-family: 'Arial', sans-serif; font-size: 12px; color: #111827; }
          h1, h2, h3 { color: #0f766e; margin-bottom: 8px; }
          h1 { font-size: 22px; text-transform: uppercase; }
          h2 {
            font-size: 16px;
            margin-top: 24px;
            border-bottom: 2px solid #0f766e;
            padding-bottom: 4px;
            text-transform: uppercase;
            page-break-after: avoid;
            break-after: avoid-page;
          }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; page-break-inside: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tr, h3, .note, .attachment-grid, .attachment-figure { page-break-inside: avoid; break-inside: avoid; }
          ol, ul { page-break-inside: avoid; break-inside: avoid; }
          .section > table,
          .section > .note,
          .section > div:first-of-type { break-before: avoid-page; page-break-before: avoid; }
          th, td { border: 1px solid #d1d5db; padding: 6px 8px; vertical-align: top; }
          th { background-color: #f1f5f9; font-weight: 600; }
          .no-border td { border: none; padding: 2px 0; }
          .report-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
          .report-header__logo { width: 88px; height: auto; object-fit: contain; }
          .report-header__title { margin: 0; text-align: left; }
          .report-header__meta { font-size: 12px; color: #4b5563; margin: 0; }
          .section { margin-top: 28px; page-break-before: avoid; page-break-inside: avoid; break-inside: avoid; }
          .small { font-size: 11px; color: #4b5563; }
          .text-muted { color: #6b7280; }
          .text-center { text-align: center; }
          .mt-16 { margin-top: 16px; }
          .mt-24 { margin-top: 24px; }
          .signature-block { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 32px; margin-top: 48px; }
          .signature-cell { text-align: center; }
          .uppercase { text-transform: uppercase; }
          .bold { font-weight: 600; }
          .note { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; }
          .attachment-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-top: 12px; }
          .attachment-figure { border: 1px solid #d1d5db; border-radius: 8px; padding: 8px; background: #ffffff; page-break-inside: avoid; }
          .attachment-image-wrapper { position: relative; width: 100%; padding-top: 66%; background: #f8fafc; border-radius: 6px; overflow: hidden; }
          .attachment-image-wrapper img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
          .attachment-caption { margin-top: 6px; font-size: 11px; color: #334155; }
          .building-standard { font-size: 11px; color: #4b5563; display: grid; gap: 4px; }
          .building-standard .bold { color: #1f2937; }
          .building-standard__spec { margin: 4px 0 0 18px; padding: 0; list-style: disc; }
        </style>
      </head>
      <body>
        <div class="report-header">
          <img src="${bankBengkuluLogoDataUrl}" alt="Logo Bank Bengkulu" class="report-header__logo" />
          <div>
            <h1 class="report-header__title">LAPORAN PENILAIAN AGUNAN TANAH & BANGUNAN</h1>
            <p class="report-header__meta">No: ${textOrDash(general.reportNumber)}</p>
          </div>
        </div>

        <section class="section">
          <h2>Batasan dan Syarat Penilaian Agunan</h2>
          <ol>
            ${batasanList.map((item) => `<li>${item}</li>`).join("")}
          </ol>
        </section>

        <section class="section">
          <h2>A. Data Umum</h2>
          <table>
            <tbody>
              <tr>
                <th style="width: 32%;">Jenis Laporan</th>
                <td>${textOrDash(general.reportType ?? "Penilaian Agunan")}</td>
              </tr>
              <tr>
                <th>No. Laporan Penilaian</th>
                <td>${textOrDash(general.reportNumber)}</td>
              </tr>
              <tr>
                <th>Tanggal Laporan Penilaian</th>
                <td>${formatDate(general.reportDate ?? report.updatedAt)}</td>
              </tr>
              <tr>
                <th>Nama Nasabah / Calon Nasabah</th>
                <td>${textOrDash(general.customerName)}</td>
              </tr>
              <tr>
                <th>Alamat Nasabah</th>
                <td>${textOrDash(general.customerAddress)}</td>
              </tr>
              <tr>
                <th>Plafond Kredit</th>
                <td>${formatCurrency(general.plafond)}</td>
              </tr>
              <tr>
                <th>Tujuan Pembiayaan</th>
                <td>${textOrDash(general.creditPurpose)}</td>
              </tr>
              <tr>
                <th>Unit Kerja Pemohon</th>
                <td>${textOrDash(general.unit)}</td>
              </tr>
              <tr>
                <th>No. Memo/Surat Permohonan</th>
                <td>${textOrDash(general.requestLetterNumber)}</td>
              </tr>
              <tr>
                <th>Tanggal Surat Permohonan</th>
                <td>${formatDate(general.requestLetterDate)}</td>
              </tr>
              <tr>
                <th>Tgl & Waktu Surat Diterima</th>
                <td>${formatDate(general.requestReceivedAt, true)}</td>
              </tr>
              <tr>
                <th>Tgl & Waktu Data Lengkap</th>
                <td>${formatDate(general.requestCompletedAt, true)}</td>
              </tr>
              <tr>
                <th>Tanggal OTS / Kunjungan</th>
                <td>${formatDate(general.otsSchedule)}</td>
              </tr>
              <tr>
                <th>Tanggal Penilaian</th>
                <td>${formatDate(general.appraisalDate)}</td>
              </tr>
              <tr>
                <th>Tujuan Penilaian</th>
                <td>${textOrDash(general.valuationPurpose)}</td>
              </tr>
              <tr>
                <th>Jenis Penilaian</th>
                <td>${textOrDash(general.valuationType)}</td>
              </tr>
              <tr>
                <th>Pendekatan Penilaian</th>
                <td>${textOrDash(general.valuationApproach)}</td>
              </tr>
              <tr>
                <th>Nama Penilai Internal</th>
                <td>${textOrDash(general.appraiserName)}</td>
              </tr>
              <tr>
                <th>Nama Contact Person (OTS)</th>
                <td>${textOrDash(general.fieldContactName)}${general.fieldContactRelation ? ` (${general.fieldContactRelation})` : ""}${general.fieldContactPhone ? `, ${general.fieldContactPhone}` : ""
    }</td>
              </tr>
              <tr>
                <th>Supervisor Reviewer</th>
                <td>${textOrDash(general.supervisorName ?? general.reviewerId)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="section">
          <h2>B. Agunan yang Dinilai</h2>
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Nama Agunan</th>
                <th>Jenis</th>
                <th>Alamat</th>
                <th>Luas Tanah</th>
                <th>Luas Bangunan</th>
              </tr>
            </thead>
            <tbody>
              ${collateralRows || '<tr><td colspan="6">Tidak ada data agunan</td></tr>'}
            </tbody>
          </table>
        </section>

        <section class="section">
          <h2>B.1 Legalitas Dokumen Kepemilikan</h2>
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Jenis Sertifikat</th>
                <th>Nomor</th>
                <th>Tgl Terbit</th>
                <th>Tgl Expired</th>
                <th>Luas</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              ${legalRows || '<tr><td colspan="7">Tidak ada data legalitas</td></tr>'}
            </tbody>
          </table>
        </section>

        <section class="section">
          <h2>B.2 IMB</h2>
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Nomor Perizinan</th>
                <th>Tanggal Terbit</th>
                <th>Luas</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              ${imbRows || '<tr><td colspan="5">Tidak ada data IMB</td></tr>'}
            </tbody>
          </table>
        </section>

        <section class="section">
          <h2>C. Jenis Penilaian Agunan</h2>
          <table>
            <tbody>
              <tr>
                <th style="width: 40%;">Baru</th>
                <td>${yesNo((general.valuationType ?? "").toLowerCase() === "baru")}</td>
              </tr>
              <tr>
                <th>Ulang</th>
                <td>${yesNo((general.valuationType ?? "").toLowerCase() === "ulang")}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="section">
          <h2>D. Keadaan Tanah & Batas</h2>
          <table>
            <tbody>
              <tr>
                <th>Bentuk Tanah</th>
                <td>${textOrDash(report.technical.landShape)}</td>
              </tr>
              <tr>
                <th>Topografi Tanah</th>
                <td>${textOrDash(report.technical.landTopography)}</td>
              </tr>
              <tr>
                <th>Permukaan Tanah dengan Jalan</th>
                <td>${textOrDash(report.technical.utilities.roadAccess)}</td>
              </tr>
              <tr>
                <th>Posisi Tanah</th>
                <td>${textOrDash(report.technical.conditionNotes)}</td>
              </tr>
              <tr>
                <th>Peruntukan</th>
                <td>${textOrDash(general.creditPurpose)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="section">
        <h2>E. Batas Tanah</h2>
        <table>
          <tbody>
            <tr>
              <th style="width: 40%;">Utara</th>
              <td>${textOrDash(environment.boundaryNorth)}</td>
            </tr>
            <tr>
              <th>Selatan</th>
              <td>${textOrDash(environment.boundarySouth)}</td>
            </tr>
            <tr>
              <th>Barat</th>
              <td>${textOrDash(environment.boundaryWest)}</td>
            </tr>
            <tr>
              <th>Timur</th>
              <td>${textOrDash(environment.boundaryEast)}</td>
            </tr>
          </tbody>
        </table>
        </section>

        <section class="section">
          <h2>F. Keadaan Bangunan</h2>
          <table>
            <tbody>
              <tr>
                <th style="width: 40%;">Jenis Bangunan</th>
                <td>${textOrDash(report.technical.buildingStructure)}</td>
              </tr>
              <tr>
                <th>Tahun Dibangun / Usia</th>
                <td>${textOrDash(
      report.technical.yearBuilt ? `${report.technical.yearBuilt} / ${new Date().getFullYear() - report.technical.yearBuilt} Tahun` : undefined,
    )}</td>
              </tr>
              <tr>
                <th>Kondisi Bangunan</th>
                <td>${textOrDash(report.technical.conditionNotes)}</td>
              </tr>
            </tbody>
          </table>
          <table class="mt-16">
            <thead>
              <tr>
                <th>Komponen</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Lantai</td><td>${textOrDash(report.technical.floorMaterial)}</td></tr>
              <tr><td>Dinding</td><td>${textOrDash(report.technical.wallMaterial)}</td></tr>
              <tr><td>Atap</td><td>${textOrDash(report.technical.roofMaterial)}</td></tr>
              <tr><td>Plafon</td><td>${textOrDash(report.technical.utilities.other)}</td></tr>
              <tr><td>Rangka</td><td>${textOrDash(report.technical.utilities.roadAccess)}</td></tr>
            </tbody>
          </table>
        </section>

        <section class="section">
          <h2>G. Informasi Penting Lainnya</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 70%;">Uraian</th>
                <th style="width: 15%;">Ya</th>
                <th style="width: 15%;">Tidak</th>
              </tr>
            </thead>
            <tbody>
              ${checklistItems
      .map(
        (item) => `
                  <tr>
                    <td>${item.label}</td>
                    <td class="text-center">${item.value === true ? "&#10003;" : ""}</td>
                    <td class="text-center">${item.value === false ? "&#10003;" : ""}</td>
                  </tr>
                `,
      )
      .join("")}
            </tbody>
          </table>
        </section>

        <section class="section">
          <h2>H. Fasilitas dan Kondisi Lingkungan</h2>
          <table>
            <tbody>
              <tr><th style="width: 40%;">Kelas Jalan</th><td>${textOrDash(facility.roadClass)}</td></tr>
              <tr><th>Material Jalan</th><td>${textOrDash(facility.roadMaterial)}</td></tr>
              <tr><th>Kelengkapan Fasilitas</th><td>${textOrDash(facility.facilityCompleteness)}</td></tr>
              <tr><th>Lebar Jalan</th><td>${facility.roadWidth ? `${facility.roadWidth} m` : "-"}</td></tr>
              <tr><th>Akses Angkutan</th><td>${textOrDash(facility.transportAccess)}</td></tr>
              <tr><th>Daya Listrik</th><td>${textOrDash(facility.electricityCapacity)}</td></tr>
              <tr><th>Sumber Air</th><td>${textOrDash(facility.waterSource)}</td></tr>
              <tr><th>Posisi Lantai</th><td>${textOrDash(facility.floorPosition)}</td></tr>
            </tbody>
          </table>
        </section>

        <section class="section">
          <h2>I. Informasi Harga / Data Pembanding</h2>
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Luas Tanah (m²)</th>
                <th>Harga (Rp)</th>
                <th>Harga/m<sup>2</sup> (Rp)</th>
                <th>Lokasi</th>
                <th>Sumber Informasi</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              ${comparablesRows || '<tr><td colspan="7">Tidak ada data pembanding</td></tr>'}
            </tbody>
          </table>
        </section>

        <section class="section">
          <h2>J. Penilaian</h2>
          <table>
            <thead>
              <tr>
                <th>Nama Agunan</th>
                <th>Luas (m<sup>2</sup>)</th>
                <th>Harga Satuan (Rp/m²)</th>
                <th>Nilai Pasar (Rp)</th>
                <th>Nilai NJOP (Rp)</th>
                <th>Nilai Rata-rata (Rp)</th>
                <th>Nilai Sebelum Safety Margin</th>
                <th>Safety Margin</th>
                <th>Nilai Setelah Safety Margin</th>
                <th>Nilai Likuidasi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Tanah</td>
                <td>${formatNumber(valuationInput.landArea, " m<sup>2</sup>")}</td>
                <td>${formatCurrency(valuationInput.marketPriceLandPerM2 || (valuationInput.landArea > 0 ? valuationInput.landRate : 0))}</td>
                <td>${formatCurrency(valuationInput.landRate)}</td>
                <td>${formatCurrency(valuationInput.njopLandPerM2 || (valuationInput.njopLand > 0 && valuationInput.landArea > 0 ? valuationInput.njopLand / valuationInput.landArea : 0))}</td>
                <td>${formatCurrency(landAverageValue && valuationInput.landArea > 0 ? landAverageValue / valuationInput.landArea : 0)}</td>
                <td>${formatCurrency(landValue)}</td>
                <td>${formatCurrency(landSafetyMarginValue)}</td>
                <td>${formatCurrency(landValueAfterSafety)}</td>
                <td>${formatCurrency(landLiquidationValue)}</td>
              </tr>
              <tr>
                <td>Bangunan</td>
                <td>${formatNumber(valuationInput.buildingArea, " m<sup>2</sup>")}</td>
                <td>${formatCurrency(valuationInput.buildingStandardRate || valuationInput.buildingRate)}</td>
                <td>${formatCurrency(valuationInput.buildingRate)}</td>
                <td>${formatCurrency(valuationInput.njopBuilding && valuationInput.buildingArea > 0 ? valuationInput.njopBuilding / valuationInput.buildingArea : 0)}</td>
                <td>${formatCurrency(buildingAverageValue && valuationInput.buildingArea > 0 ? buildingAverageValue / valuationInput.buildingArea : 0)}</td>
                <td>${formatCurrency(buildingValue)}</td>
                <td>${formatCurrency(buildingSafetyMarginValue)}</td>
                <td>${formatCurrency(buildingValueAfterSafety)}</td>
                <td>${formatCurrency(buildingLiquidationValue)}</td>
              </tr>
              <tr>
                <td colspan="10">
                  <div class="building-standard">
                    <div><span class="bold">Standar Bangunan:</span> ${buildingStandard ? escapeHtml(buildingStandard.name) : "-"}</div>
                    <div><span class="bold">Harga Standar:</span> ${formatCurrency(valuationInput.buildingStandardRate)} / m<sup>2</sup></div>
                    <div><span class="bold">Persentase Penyusutan:</span> ${formatNumber(valuationInput.buildingDepreciationPercent, " %")}</div>
                    ${buildingSpecificationList
      ? `<div><span class="bold">Spesifikasi:</span><ul class="building-standard__spec">${buildingSpecificationList}</ul></div>`
      : ""
    }
                  </div>
                </td>
              </tr>
              <tr>
                <th colspan="3" class="text-center">Jumlah</th>
                <th>${formatCurrency(landValue + buildingValue)}</th>
                <th>${formatCurrency((valuationInput.njopLand ?? 0) + (valuationInput.njopBuilding ?? 0))}</th>
                <th>${formatCurrency(totalAverageValue)}</th>
                <th>${formatCurrency(marketValueBeforeSafety)}</th>
                <th>${formatCurrency(totalSafetyMarginValue)}</th>
                <th>${formatCurrency(collateralValueAfterSafety)}</th>
                <th>${formatCurrency(liquidationValue)}</th>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="section">
          <h2>K. Catatan Penilai</h2>
          <div class="note">
            ${textOrDash(report.remarks) || "Tidak ada catatan tambahan."}
          </div>
        </section>

        <p class="mt-24">Demikian laporan ini disusun untuk digunakan sebagaimana mestinya.</p>



<div class="signature-block">
  <div class="signature-cell">
    <p>Bengkulu, ${formatDate(general.reportDate ?? report.updatedAt)}</p>
    <p class="bold">Penilai Internal</p>
    ${renderSignature(report.signatures?.appraiser)}
    <p class="bold uppercase">${textOrDash(general.appraiserName)}</p>
  </div>
  <div class="signature-cell">
    <p>&nbsp;</p>
    <p class="bold">Mengetahui, Supervisor</p>
    ${renderSignature(report.signatures?.supervisor)}
    <p class="bold uppercase">${textOrDash(general.supervisorName ?? general.reviewerId)}</p>
  </div>
</div>

<section class="section" style="page-break-before: always;">
  <h2>Lampiran</h2>
  <h3>Foto Agunan</h3>
  ${renderAttachmentGallery(photoAttachments, "Belum ada foto agunan yang diunggah.")}
  <h3>Posisi Agunan</h3>
  ${renderAttachmentGallery(positionAttachments, "Belum ada peta posisi agunan yang diunggah.")}
  <h3>Sketsa Sentuh Tanahku (ATR/BPN)</h3>
  ${renderAttachmentGallery(sketchAttachments, "Belum ada sketsa Sentuh Tanahku yang diunggah.")}
</section>
  </body>
  </html>
    `;
}






