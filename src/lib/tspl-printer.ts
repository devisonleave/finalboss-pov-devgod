export interface LabelConfig {
  width: number;
  height: number;
  gap: number;
  direction: 0 | 1;
  dpi: number;
  columns: number;
  columnGap: number;
}

export const TSC_TE244_CONFIG: LabelConfig = {
  width: 38,
  height: 25,
  gap: 2,
  direction: 1,
  dpi: 203,
  columns: 2,
  columnGap: 2,
};

function mmToInches(mm: number): number {
  return mm / 25.4;
}

function mmToDots(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi);
}

export interface BarcodeLabel {
  barcode: string;
  productName?: string;
  price?: string;
  sku?: string;
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 2) + "..";
}

export function generateTSPLCommands(
  labels: BarcodeLabel[],
  copies: number = 1,
  config: LabelConfig = TSC_TE244_CONFIG
): string {
  const totalWidthMM = (config.width * config.columns) + config.columnGap;
  const widthInches = mmToInches(totalWidthMM).toFixed(2);
  const heightInches = mmToInches(config.height).toFixed(2);
  const gapInches = mmToInches(config.gap).toFixed(2);

  const singleLabelWidth = mmToDots(config.width, config.dpi);
  const colGapDots = mmToDots(config.columnGap, config.dpi);

  let commands = "";

  commands += `SIZE ${widthInches},${heightInches}\r\n`;
  commands += `GAP ${gapInches},0\r\n`;
  commands += `DIRECTION ${config.direction}\r\n`;
  commands += `DENSITY 10\r\n`;
  commands += `SPEED 3\r\n`;

  const labelPairs: BarcodeLabel[][] = [];
  for (let i = 0; i < labels.length; i += 2) {
    labelPairs.push(labels.slice(i, i + 2));
  }

  for (const pair of labelPairs) {
    commands += `CLS\r\n`;

    pair.forEach((label, col) => {
      const offsetX = col * (singleLabelWidth + colGapDots);
      const centerX = offsetX + Math.round(singleLabelWidth / 2);

      let y = 10;
      // Larger font for brand name, using font "3" with 1.2x scale (if supported, else 1x)
      commands += `TEXT ${centerX},${y},"3",0,1,1,2,"SONAKSHI BOUTIQUE"\r\n`;

      y += 30;
      const barcodeHeight = 50; // Increased height
      const barcodeX = offsetX + 10;
      const barcodeWidthNarrow = 2;
      commands += `BARCODE ${barcodeX},${y},"128",${barcodeHeight},0,0,${barcodeWidthNarrow},${barcodeWidthNarrow},"${label.barcode}"\r\n`;

      y += barcodeHeight + 8;
      // Increased size for barcode text
      commands += `TEXT ${centerX},${y},"2",0,1,1,2,"${label.barcode}"\r\n`;

      y += 24;
      if (label.productName) {
        const truncatedName = truncateText(label.productName, 18);
        // Use font "3" for product name for better readability
        commands += `TEXT ${centerX},${y},"3",0,1,1,2,"${truncatedName}"\r\n`;
      }

      y += 28;
      if (label.price) {
        // Use font "4" (larger) for price
        commands += `TEXT ${centerX},${y},"4",0,1,1,2,"Rs.${label.price}"\r\n`;
      }
    });

    commands += `PRINT ${copies}\r\n`;
  }

  return commands;
}

export function generateSingleLabelTSPL(
  label: BarcodeLabel,
  position: "left" | "right" | "both",
  copies: number = 1,
  config: LabelConfig = TSC_TE244_CONFIG
): string {
  const totalWidthMM = (config.width * config.columns) + config.columnGap;
  const widthInches = mmToInches(totalWidthMM).toFixed(2);
  const heightInches = mmToInches(config.height).toFixed(2);
  const gapInches = mmToInches(config.gap).toFixed(2);

  const singleLabelWidth = mmToDots(config.width, config.dpi);
  const colGapDots = mmToDots(config.columnGap, config.dpi);

  let commands = "";

  commands += `SIZE ${widthInches},${heightInches}\r\n`;
  commands += `GAP ${gapInches},0\r\n`;
  commands += `DIRECTION ${config.direction}\r\n`;
  commands += `DENSITY 10\r\n`;
  commands += `SPEED 3\r\n`;
  commands += `CLS\r\n`;

  const positions = position === "both" ? [0, 1] : position === "left" ? [0] : [1];

  for (const col of positions) {
    const offsetX = col * (singleLabelWidth + colGapDots);
    const centerX = offsetX + Math.round(singleLabelWidth / 2);

    let y = 8;
    commands += `TEXT ${centerX},${y},"2",0,1,1,2,"SONAKSHI BOUTIQUE"\r\n`;

    y += 24;
    const barcodeHeight = 45;
    const barcodeX = offsetX + 10;
    const barcodeWidthNarrow = 2;
    commands += `BARCODE ${barcodeX},${y},"128",${barcodeHeight},0,0,${barcodeWidthNarrow},${barcodeWidthNarrow},"${label.barcode}"\r\n`;

    y += barcodeHeight + 5;
    commands += `TEXT ${centerX},${y},"2",0,1,1,2,"${label.barcode}"\r\n`;

    y += 20;
    if (label.productName) {
      const truncatedName = truncateText(label.productName, 16);
      commands += `TEXT ${centerX},${y},"2",0,1,1,2,"${truncatedName}"\r\n`;
    }

    y += 20;
    if (label.price) {
      commands += `TEXT ${centerX},${y},"3",0,1,1,2,"Rs.${label.price}"\r\n`;
    }
  }

  commands += `PRINT ${copies}\r\n`;

  return commands;
}

export function generateTestLabel(config: LabelConfig = TSC_TE244_CONFIG): string {
  const totalWidthMM = (config.width * config.columns) + config.columnGap;
  const widthInches = mmToInches(totalWidthMM).toFixed(2);
  const heightInches = mmToInches(config.height).toFixed(2);
  const gapInches = mmToInches(config.gap).toFixed(2);

  const singleLabelWidth = mmToDots(config.width, config.dpi);
  const colGapDots = mmToDots(config.columnGap, config.dpi);

  let commands = "";
  commands += `SIZE ${widthInches},${heightInches}\r\n`;
  commands += `GAP ${gapInches},0\r\n`;
  commands += `DIRECTION ${config.direction}\r\n`;
  commands += `DENSITY 10\r\n`;
  commands += `CLS\r\n`;

  for (let col = 0; col < config.columns; col++) {
    const offsetX = col * (singleLabelWidth + colGapDots);
    const centerX = offsetX + Math.round(singleLabelWidth / 2);
    
    commands += `TEXT ${centerX},30,"2",0,1,1,2,"TEST"\r\n`;
    commands += `TEXT ${centerX},60,"1",0,1,1,2,"${col === 0 ? "LEFT" : "RIGHT"}"\r\n`;
  }

  commands += `PRINT 1\r\n`;

  return commands;
}

export type PrinterStatus = "checking" | "connected" | "disconnected" | "not_installed";

export interface PrintResult {
  success: boolean;
  message: string;
}
