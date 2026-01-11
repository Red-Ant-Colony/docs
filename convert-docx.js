const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const DOCX_DIR = '/Users/ridho/Documents/go/github.com/red-ant-colony/docs/Gude Book per Modul (Revisi)';
const OUTPUT_DIR = '/Users/ridho/Documents/go/github.com/red-ant-colony/docs/guide-book';
const IMAGES_DIR = path.join(OUTPUT_DIR, 'images');

// Mapping DOCX filenames to slug and metadata
const fileMapping = {
  'Autentikasi - Zycas Guide Book.docx': { slug: 'autentikasi', title: 'Autentikasi', description: 'Panduan login dan autentikasi pada aplikasi Zycas', icon: 'key' },
  'Dashboard Page - Zycas Guide Book.docx': { slug: 'dashboard', title: 'Dashboard', description: 'Panduan penggunaan dashboard Zycas', icon: 'chart-line' },
  'Hutang - Zycas Guide Book.docx': { slug: 'hutang', title: 'Hutang', description: 'Panduan pengelolaan hutang pelanggan', icon: 'money-bill' },
  'Kasir - Zycas Guide Book.docx': { slug: 'kasir', title: 'Kasir', description: 'Panduan penggunaan fitur kasir', icon: 'cash-register' },
  'Laporan Kasir - Zycas Guide Book.docx': { slug: 'laporan-kasir', title: 'Laporan Kasir', description: 'Panduan laporan transaksi kasir', icon: 'file-chart-line' },
  'Master Data - Zycas Guide Book.docx': { slug: 'master-data', title: 'Master Data', description: 'Panduan pengelolaan master data', icon: 'database' },
  'Membership - Zycas Guide Book.docx': { slug: 'membership', title: 'Membership', description: 'Panduan pengelolaan membership pelanggan', icon: 'users' },
  'New Riwayat Transaksi - Zycas Guide Book.docx': { slug: 'riwayat-transaksi', title: 'Riwayat Transaksi', description: 'Panduan melihat riwayat transaksi', icon: 'clock-rotate-left' },
  'Produk - Zycas Guide Book.docx': { slug: 'produk', title: 'Produk', description: 'Panduan pengelolaan produk', icon: 'box' },
  'Profile - Zycas Guide Book.docx': { slug: 'profile', title: 'Profile', description: 'Panduan pengaturan profil pengguna', icon: 'user' },
  'Retur Pesanan - Zycas Guide Book.docx': { slug: 'retur-pesanan', title: 'Retur Pesanan', description: 'Panduan retur pesanan', icon: 'rotate-left' },
  'Riwayat Akan Kadaluarsa - Zycas Guide Book.docx': { slug: 'riwayat-akan-kadaluarsa', title: 'Riwayat Akan Kadaluarsa', description: 'Panduan produk yang akan kadaluarsa', icon: 'clock' },
  'Riwayat Kadaluarsa - Zycas Guide Book.docx': { slug: 'riwayat-kadaluarsa', title: 'Riwayat Kadaluarsa', description: 'Panduan produk kadaluarsa', icon: 'calendar-xmark' },
  'Riwayat Transaksi - Zycas Guide Book.docx': { slug: 'riwayat-transaksi-old', title: 'Riwayat Transaksi (Old)', description: 'Panduan melihat riwayat transaksi', icon: 'clock-rotate-left' },
  'Stok Opname - Zycas Guide Book.docx': { slug: 'stok-opname', title: 'Stok Opname', description: 'Panduan stok opname', icon: 'clipboard-check' },
  'Stok Paduan - Zycas Guide Book.docx': { slug: 'stok-paduan', title: 'Stok Paduan', description: 'Panduan stok paduan', icon: 'layer-group' },
  'Stok Produk - Zycas Guide Book.docx': { slug: 'stok-produk', title: 'Stok Produk', description: 'Panduan pengelolaan stok produk', icon: 'warehouse' },
  'Supplier - Zycas Guide Book.docx': { slug: 'supplier', title: 'Supplier', description: 'Panduan pengelolaan supplier', icon: 'truck' },
  'Transaksi Offline - Zycas Guide Book.docx': { slug: 'transaksi-offline', title: 'Transaksi Offline', description: 'Panduan transaksi offline', icon: 'wifi-slash' },
  'User - Zycas Guide Book.docx': { slug: 'user', title: 'User', description: 'Panduan pengelolaan user', icon: 'user-gear' },
  'Voucher - Zycas Guide Book.docx': { slug: 'voucher', title: 'Voucher', description: 'Panduan pengelolaan voucher', icon: 'ticket' },
};

async function convertDocx(docxPath, meta) {
  let imageCounter = 0;

  const options = {
    convertImage: mammoth.images.imgElement(async function(image) {
      imageCounter++;
      const imageName = `${meta.slug}-${imageCounter}.png`;
      const imagePath = `/guide-book/images/${imageName}`;
      const fullImagePath = path.join(IMAGES_DIR, imageName);

      // Extract and save image
      try {
        const buffer = await image.read();
        fs.writeFileSync(fullImagePath, buffer);
      } catch (err) {
        console.error(`    Warning: Could not save image ${imageName}:`, err.message);
      }

      return { src: imagePath };
    })
  };

  const result = await mammoth.convertToMarkdown({ path: docxPath }, options);
  let markdown = result.value;

  // Clean up markdown
  // Remove excessive newlines
  markdown = markdown.replace(/\n{3,}/g, '\n\n');

  // Convert info boxes (tables with 🛈 Information pattern) to Note components
  markdown = markdown.replace(/\| 🛈 Information \|[\s\S]*?\| :---: \| :---- \|[\s\S]*?\|([\s\S]*?)\|/g, (match, content) => {
    const cleanContent = content.trim().replace(/^\s*\|\s*/, '').replace(/\s*\|\s*$/, '');
    return `<Note>\n${cleanContent}\n</Note>`;
  });

  // Remove orphan table separators
  markdown = markdown.replace(/^\| :---: \| :---- \|$/gm, '');

  // Clean up any remaining problematic patterns
  markdown = markdown.replace(/🛈/g, '');

  // Create frontmatter
  const frontmatter = `---
title: "${meta.title}"
description: "${meta.description}"
icon: "${meta.icon}"
---

`;

  return frontmatter + markdown;
}

async function main() {
  const files = fs.readdirSync(DOCX_DIR).filter(f => f.endsWith('.docx'));

  console.log(`Found ${files.length} DOCX files to convert`);

  for (const file of files) {
    const meta = fileMapping[file];
    if (!meta) {
      console.log(`Skipping ${file} - no mapping found`);
      continue;
    }

    const docxPath = path.join(DOCX_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, `${meta.slug}.mdx`);

    console.log(`Converting ${file} -> ${meta.slug}.mdx`);

    try {
      const mdx = await convertDocx(docxPath, meta);
      fs.writeFileSync(outputPath, mdx);
      console.log(`  ✓ Saved ${outputPath}`);
    } catch (err) {
      console.error(`  ✗ Error converting ${file}:`, err.message);
    }
  }

  console.log('\nConversion complete!');
}

main().catch(console.error);
