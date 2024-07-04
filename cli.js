#!/usr/bin/env node

// https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages
// https://x-team.com/blog/a-guide-to-creating-a-nodejs-command

const { Command } = require('commander');
const program = new Command();

var fs = require('fs'),
PNG = require('pngjs').PNG;

program
  .description('Tile Quantitizer')
  .option('-i, --image <inImage>', 'PNG image file')
  .option('-o, --out-image <outImage>', 'PNG quantitized image file')
  .option('-W, --width <tileWidth>', 'Tile width', 8)
  .option('-H, --height <tileHeight>', 'Tile height', 8)
  .option('-P, --palettes <numPalettes>', 'Number of palettes', 8)
  .option('-C, --color <colorsPerPalette>', 'Number of color by palette', 4)
  .option('-b, --bits <bitsPerChannel>', 'Number of bits per channel', 5)
  .option('-0, --color-zero <colorZeroValue>', 'Color zero value', '000000')

program.parse();

const options = program.opts();

const { quantizationOptions, ditherPatterns, DitherPattern, ditherPixels, quantizeImage } = require('./quantitizer'); 

var inImageData = fs.readFileSync(options.image);
var inImagePng = PNG.sync.read(inImageData);

quantizationOptions.tileWidth = parseInt(options.width);
quantizationOptions.tileHeight = parseInt(options.height);
quantizationOptions.numPalettes = parseInt(options.palettes);
quantizationOptions.colorsPerPalette = parseInt(options.color);
quantizationOptions.bitsPerChannel = parseInt(options.bits);
quantizationOptions.colorZeroValue = [
    (parseInt(options.colorZero) >> 16)  & 0xff,
    (parseInt(options.colorZero) >> 8) & 0xff,
    parseInt(options.colorZero) & 0xff
];

ditherPattern = ditherPatterns.get(quantizationOptions.ditherPattern);
const patternPixels2 = new Set([
    DitherPattern.Diagonal2,
    DitherPattern.Horizontal2,
    DitherPattern.Vertical2,
]);
if (patternPixels2.has(quantizationOptions.ditherPattern)) {
    ditherPixels = 2;
}

outImageData = quantizeImage(inImagePng);

let newfile = new PNG({ width: outImageData.width, height: outImageData.height });

for (let y = 0; y < newfile.height; y++) {
  for (let x = 0; x < newfile.width; x++) {
    let idx = (newfile.width * y + x) << 2;

    let col =
      (x < newfile.width >> 1) ^ (y < newfile.height >> 1) ? 0xe5 : 0xff;

    newfile.data[idx] = outImageData.data[idx];
    newfile.data[idx + 1] = outImageData.data[idx + 1];
    newfile.data[idx + 2] = outImageData.data[idx + 2];
    newfile.data[idx + 3] = 0xff;
  }
}

newfile
  .pack()
  .pipe(fs.createWriteStream(options.outImage))
  .on("finish", function () {
    console.log("Written!");
  });