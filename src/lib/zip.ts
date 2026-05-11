type ZipFile = {
  data: Buffer;
  name: string;
};

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

export function createZip(files: ZipFile[]) {
  const localFileHeaders: Buffer[] = [];
  const centralDirectoryHeaders: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const fileName = Buffer.from(file.name);
    const crc = crc32(file.data);
    const localFileHeader = Buffer.alloc(30);

    localFileHeader.writeUInt32LE(0x04034b50, 0);
    localFileHeader.writeUInt16LE(20, 4);
    localFileHeader.writeUInt16LE(0, 6);
    localFileHeader.writeUInt16LE(0, 8);
    localFileHeader.writeUInt16LE(0, 10);
    localFileHeader.writeUInt16LE(0, 12);
    localFileHeader.writeUInt32LE(crc, 14);
    localFileHeader.writeUInt32LE(file.data.length, 18);
    localFileHeader.writeUInt32LE(file.data.length, 22);
    localFileHeader.writeUInt16LE(fileName.length, 26);
    localFileHeader.writeUInt16LE(0, 28);
    localFileHeaders.push(localFileHeader, fileName, file.data);

    const centralDirectoryHeader = Buffer.alloc(46);
    centralDirectoryHeader.writeUInt32LE(0x02014b50, 0);
    centralDirectoryHeader.writeUInt16LE(20, 4);
    centralDirectoryHeader.writeUInt16LE(20, 6);
    centralDirectoryHeader.writeUInt16LE(0, 8);
    centralDirectoryHeader.writeUInt16LE(0, 10);
    centralDirectoryHeader.writeUInt16LE(0, 12);
    centralDirectoryHeader.writeUInt16LE(0, 14);
    centralDirectoryHeader.writeUInt32LE(crc, 16);
    centralDirectoryHeader.writeUInt32LE(file.data.length, 20);
    centralDirectoryHeader.writeUInt32LE(file.data.length, 24);
    centralDirectoryHeader.writeUInt16LE(fileName.length, 28);
    centralDirectoryHeader.writeUInt16LE(0, 30);
    centralDirectoryHeader.writeUInt16LE(0, 32);
    centralDirectoryHeader.writeUInt16LE(0, 34);
    centralDirectoryHeader.writeUInt16LE(0, 36);
    centralDirectoryHeader.writeUInt32LE(0, 38);
    centralDirectoryHeader.writeUInt32LE(offset, 42);
    centralDirectoryHeaders.push(centralDirectoryHeader, fileName);

    offset += localFileHeader.length + fileName.length + file.data.length;
  }

  const centralDirectory = Buffer.concat(centralDirectoryHeaders);
  const endOfCentralDirectory = Buffer.alloc(22);
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
  endOfCentralDirectory.writeUInt16LE(0, 4);
  endOfCentralDirectory.writeUInt16LE(0, 6);
  endOfCentralDirectory.writeUInt16LE(files.length, 8);
  endOfCentralDirectory.writeUInt16LE(files.length, 10);
  endOfCentralDirectory.writeUInt32LE(centralDirectory.length, 12);
  endOfCentralDirectory.writeUInt32LE(offset, 16);
  endOfCentralDirectory.writeUInt16LE(0, 20);

  return Buffer.concat([
    ...localFileHeaders,
    centralDirectory,
    endOfCentralDirectory
  ]);
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}
