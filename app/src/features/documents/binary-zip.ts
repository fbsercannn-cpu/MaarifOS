const encoder = new TextEncoder();

function littleEndian(value: number, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let index = 0; index < length; index += 1) {
    bytes[index] = (value >>> (index * 8)) & 0xff;
  }
  return bytes;
}

function joinBytes(parts: readonly Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function createBinaryZip(
  files: readonly { name: string; bytes: Uint8Array }[],
): Uint8Array {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = file.bytes;
    const checksum = crc32(data);
    const local = joinBytes([
      littleEndian(0x04034b50, 4),
      littleEndian(20, 2),
      littleEndian(0x0800, 2),
      littleEndian(0, 2),
      littleEndian(0, 2),
      littleEndian(33, 2),
      littleEndian(checksum, 4),
      littleEndian(data.length, 4),
      littleEndian(data.length, 4),
      littleEndian(name.length, 2),
      littleEndian(0, 2),
      name,
      data,
    ]);
    localParts.push(local);
    centralParts.push(
      joinBytes([
        littleEndian(0x02014b50, 4),
        littleEndian(20, 2),
        littleEndian(20, 2),
        littleEndian(0x0800, 2),
        littleEndian(0, 2),
        littleEndian(0, 2),
        littleEndian(33, 2),
        littleEndian(checksum, 4),
        littleEndian(data.length, 4),
        littleEndian(data.length, 4),
        littleEndian(name.length, 2),
        littleEndian(0, 2),
        littleEndian(0, 2),
        littleEndian(0, 2),
        littleEndian(0, 2),
        littleEndian(0, 4),
        littleEndian(offset, 4),
        name,
      ]),
    );
    offset += local.length;
  }
  const central = joinBytes(centralParts);
  return joinBytes([
    ...localParts,
    central,
    littleEndian(0x06054b50, 4),
    littleEndian(0, 2),
    littleEndian(0, 2),
    littleEndian(files.length, 2),
    littleEndian(files.length, 2),
    littleEndian(central.length, 4),
    littleEndian(offset, 4),
    littleEndian(0, 2),
  ]);
}
