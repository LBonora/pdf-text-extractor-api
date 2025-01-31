import fs from "node:fs";
import { Buffer } from "node:buffer";

export function getStartxref(fileName, fileSize = null, buffer = 64) {
  if (fileSize === null) {
    fileSize = fs.statSync(fileName).size;
  }

  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(fileName, { start: fileSize - buffer });
    stream.on("error", (error) => {
      reject(error);
    });
    stream.on("data", (data) => {
      const sliceStart = data.indexOf(new Buffer.from("startxref")) + 9;
      resolve(parseInt(data.slice(sliceStart)));
    });
  });
}

export function getXrefTable(fileName, startxref) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(fileName, { start: startxref });
    stream.on("error", (error) => {
      reject(error);
    });
    stream.on("data", (data) => {
      const result = [];
      let curPos = 1 + data.indexOf(0x0a);
      let lastPos = 0;
      while (curPos > 0) {
        const foo = data.slice(lastPos, curPos).toString();
        if (foo.includes(new Buffer.from("trailer"))) {
          break;
        }

        if (data.slice(0, 4).includes(new Buffer.from("xref"))) {
          result.push({
            start: foo.slice(0, 10),
            gen: foo.slice(11, 16),
            sts: foo[17] || null,
          });
        } else {
          result.push(foo);
          if (foo.includes(new Buffer.from("endobj"))) {
            break;
          }
        }

        lastPos = curPos;
        curPos = 1 + data.indexOf(0x0a, curPos);
      }
      resolve(result);
    });
  });
}
