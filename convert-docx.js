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

// Fix numbered lists - renumber ALL items sequentially
function fixNumberedLists(markdown) {
  const lines = markdown.split('\n');
  let listCounter = 0;
  let inList = false;
  let lastNumberedLine = -1;

  const result = lines.map((line, index) => {
    const trimmed = line.trim();

    // Check if this is an image line
    const isImage = /^!\[/.test(trimmed) || trimmed.includes('![');

    // Check if this is a numbered list item (starting with any number)
    const listMatch = line.match(/^(\d+)\.\s+(.*)$/);

    if (listMatch) {
      const [, num, content] = listMatch;
      const numVal = parseInt(num, 10);

      // Check how many lines since last numbered item
      const gapSize = index - lastNumberedLine;

      // Decide if this is a new list or continuation
      if (numVal === 1 && (!inList || gapSize > 15)) {
        // Start new list - gap is large or we weren't in a list
        listCounter = 1;
        inList = true;
      } else if (inList) {
        // Continue the list - increment regardless of original number
        listCounter++;
      } else {
        // Not in list but got a number - start new list
        listCounter = 1;
        inList = true;
      }

      lastNumberedLine = index;
      return `${listCounter}. ${content}`;
    }

    // Empty line or image - don't break list context
    if (trimmed === '' || isImage) {
      return line;
    }

    // Bullet points - keep list context but don't affect numbering
    if (/^[-*]\s+/.test(trimmed)) {
      return line;
    }

    // Indented content (sub-lists, code blocks) - keep list context
    if (/^\s+/.test(line) && inList) {
      return line;
    }

    // Headings end the list
    if (/^#{1,6}\s+/.test(trimmed)) {
      inList = false;
      listCounter = 0;
      return line;
    }

    // Other content - check if it looks like prose (long text)
    // Short lines could be between list items
    if (trimmed.length > 100) {
      inList = false;
      listCounter = 0;
    }

    return line;
  });

  return result.join('\n');
}

// Fix tables - convert plain text table patterns to markdown tables
function fixTables(markdown) {
  const lines = markdown.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Detect table header pattern: "Keterangan:" or "Keterangan :" followed by table headers
    if (line === 'Keterangan:' || line === 'Keterangan :') {
      // Check if next lines look like table headers
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j++; // skip empty lines

      // Check for header row pattern (No, Simbol, Keterangan)
      const headers = [];
      while (j < lines.length && lines[j].trim() !== '' && !lines[j].trim().match(/^\d+$/) && !lines[j].trim().startsWith('![')) {
        headers.push(lines[j].trim());
        j++;
        while (j < lines.length && lines[j].trim() === '') j++;
      }

      if (headers.length >= 2 && headers.length <= 4) {
        // Looks like a table - collect data rows
        const rows = [];
        let currentRow = [];

        while (j < lines.length) {
          const cellContent = lines[j].trim();

          // Stop if we hit an image, heading, or other structural element
          if (cellContent.startsWith('![') || cellContent.startsWith('#') ||
              cellContent.startsWith('__') && cellContent.endsWith('__') && cellContent.length > 10) {
            break;
          }

          // Skip empty lines between cells
          if (cellContent === '') {
            j++;
            continue;
          }

          currentRow.push(cellContent);

          // Check if row is complete
          if (currentRow.length === headers.length) {
            rows.push([...currentRow]);
            currentRow = [];
          }

          j++;
        }

        // If we have valid data, create markdown table
        if (rows.length > 0) {
          result.push(''); // empty line before table
          result.push('| ' + headers.join(' | ') + ' |');
          result.push('| ' + headers.map(() => '---').join(' | ') + ' |');
          for (const row of rows) {
            result.push('| ' + row.join(' | ') + ' |');
          }
          result.push(''); // empty line after table
          i = j;
          continue;
        }
      }
    }

    result.push(lines[i]);
    i++;
  }

  return result.join('\n');
}

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

  // Fix nested list patterns from mammoth - convert to regular numbered items
  // Pattern: "- \n\t- \n\t\t1. content" or similar
  markdown = markdown.replace(/^- \s*$/gm, ''); // Remove empty bullet lines
  markdown = markdown.replace(/^\t+- \s*$/gm, ''); // Remove indented empty bullet lines
  markdown = markdown.replace(/^\t+(\d+)\.\s+/gm, '$1. '); // Remove indentation from numbered items

  // Fix numbered list sequencing - mammoth outputs all as "1."
  // We need to renumber them sequentially within each list block
  markdown = fixNumberedLists(markdown);

  // Remove unnecessary escape characters
  markdown = markdown.replace(/\\([.\-\[\]()])/g, '$1');

  // Clean up anchor tags
  markdown = markdown.replace(/<a id="[^"]*"><\/a>/g, '');

  // Fix multiple images on same line - add newlines between them
  markdown = markdown.replace(/(\!\[[^\]]*\]\([^)]+\))(\!\[)/g, '$1\n\n$2');

  // Convert table-like patterns to markdown tables
  markdown = fixTables(markdown);

  // Remove empty headings
  markdown = markdown.replace(/^#{1,6}\s*$/gm, '');

  // Convert Information boxes to Note components
  markdown = markdown.replace(/____\s*\n+__Information__\s*\n+([\s\S]*?)(?=\n\n\n|\n*$)/g, (match, content) => {
    const cleanContent = content.trim();
    return `<Note>\n${cleanContent}\n</Note>`;
  });

  // Remove excessive empty lines (more than 2 consecutive)
  markdown = markdown.replace(/\n{4,}/g, '\n\n\n');

  // Clean up lines that are just underscores
  markdown = markdown.replace(/^_{4,}$/gm, '');

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
