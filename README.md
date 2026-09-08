# SVG & Vector PDF Electronic Signature Studio

A lightweight, mobile-ready web application designed for office staff to create and export electronic signatures in **SVG** and **lossless Vector PDF** formats, calibrated to an exact **5cm × 2.5cm (50mm × 25mm)** dimensional constraint.

![Dimensions](https://img.shields.io/badge/Dimensions-50mm%20%C3%97%2025mm-blue)
![Format](https://img.shields.io/badge/Format-Pure%20Vector%20(SVG%20%26%20PDF)-green)
![Privacy](https://img.shields.io/badge/Privacy-100%25%20Client--Side-brightgreen)
![Hosting](https://img.shields.io/badge/Deploy-GitHub%20Pages-blueviolet)

---

## ✨ Features

- 📐 **Exact 5cm × 2.5cm (50mm × 25mm) Standard Box**: Specifically sized for standard signature fields on legal and business documents.
- 🖋️ **Smooth Bézier Vector Curves**: Midpoint quadratic curve interpolation eliminates jagged edges, providing realistic, smooth ink strokes.
- 📱 **Mobile & Tablet Touch-Ready**: Optimized pointer handling with `setPointerCapture` and palm/scroll rejection for effortless finger or stylus signing on phones and tablets.
- ⚡ **Pure Vector PDF Export**: Uses `jsPDF` + `svg2pdf.js` to translate vector strokes directly into native PDF drawing operators (`m`, `l`, `c`). **Zero rasterization or pixelation** when zoomed in.
- 💾 **In-Memory & Session History**: Staff signatures are kept in memory with staff labels and live SVG thumbnails. Easily reload, re-download, or delete signatures.
- 🎨 **Ink Color & Width Customization**: Classic Black, Executive Navy, Royal Blue, and Emerald Green with Fine, Medium, and Bold stroke presets.
- 🔍 **1:1 Physical Scale Preview**: Live visual indicator calibrated to 50mm × 25mm on screen.
- 📄 **A4 Verification Sheet**: Optional one-click export of an official A4 document sheet framing the 5cm × 2.5cm signature block with audit metadata (Date, Time, Staff Name).
- 🔒 **100% Client-Side Privacy**: Runs completely in the browser. No signatures or staff data ever leave the device.

---

## 🚀 Getting Started

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/eugenekoen/svg-signature-generator.git
   cd svg-signature-generator
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local dev server**:
   ```bash
   npm run dev
   ```
   Open the printed URL (e.g. `http://localhost:5173`) in your browser or phone on your local network.

4. **Build for production**:
   ```bash
   npm run build
   ```

---

## 🌐 Deploying to GitHub Pages

This project is pre-configured for automated deployment to GitHub Pages via GitHub Actions:

1. Push your code to the `main` branch of your GitHub repository:
   ```bash
   git add .
   git commit -m "Initial commit: SVG & Vector PDF signature generator"
   git push origin main
   ```
2. Go to your GitHub repository in your browser:
   - Navigate to **Settings** > **Pages** (in the left sidebar).
   - Under **Build and deployment** > **Source**, select **GitHub Actions**.
3. The `.github/workflows/deploy.yml` workflow will automatically run on push, build the application, and publish it to:
   ```
   https://<your-username>.github.io/svg-signature-generator/
   ```

---

## 📋 How to Add the Signature to PDF Documents

1. **Using Adobe Acrobat Reader / Pro**:
   - Go to **Tools** > **Fill & Sign** > **Sign Yourself** > **Add Signature**.
   - Select the downloaded `.svg` or `.pdf` file.
   - Place it directly into the signature box. Because it is vector, it maintains 100% sharpness at any scale or print resolution.
2. **Using Preview (macOS)**:
   - Open your PDF document > **Markup Toolbar** > **Sign** > import or drag in the signature.
3. **Using PDF-XChange Editor / Foxit**:
   - Go to **Protect** / **Comment** > **Stamps** or **Sign** > **Add New Stamp from File** > Choose the `.pdf` or `.svg` file.

---

## 🛠️ Tech Stack

- **Vite 6** & **TypeScript**
- **jsPDF 4** & **svg2pdf.js 2**
- **Modern CSS** with responsive CSS Grid and Flexbox

